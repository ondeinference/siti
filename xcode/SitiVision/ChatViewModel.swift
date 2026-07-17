//
//  ChatViewModel.swift
//  Siti AI visionOS
//

import Foundation
import Onde

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Message model
// ─────────────────────────────────────────────────────────────────────────────

struct Message: Identifiable, Codable, Hashable {
    enum Role: String, Codable {
        case user
        case assistant
    }

    let id: UUID
    let role: Role
    var text: String
    /// True while the assistant is still streaming tokens for this message.
    var isStreaming: Bool

    init(
        id: UUID = UUID(),
        role: Role,
        text: String,
        isStreaming: Bool = false
    ) {
        self.id = id
        self.role = role
        self.text = text
        self.isStreaming = isStreaming
    }
}

private extension Message {
    var asChatMessage: ChatMessage {
        switch role {
        case .user:
            return userMessage(content: text)
        case .assistant:
            return assistantMessage(content: text)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - Stream bridge
// ─────────────────────────────────────────────────────────────────────────────

/// Thread-safe bridge between the Rust callback thread and Swift concurrency.
private final class StreamBridge: @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: AsyncStream<String>.Continuation?
    private var cancelled = false

    func attach(_ continuation: AsyncStream<String>.Continuation) {
        lock.lock()
        self.continuation = continuation
        let shouldFinish = cancelled
        lock.unlock()

        if shouldFinish {
            continuation.finish()
        }
    }

    func yield(_ delta: String) {
        lock.lock()
        guard !cancelled else {
            lock.unlock()
            return
        }
        let continuation = continuation
        lock.unlock()
        continuation?.yield(delta)
    }

    func finish() {
        lock.lock()
        let continuation = continuation
        self.continuation = nil
        lock.unlock()
        continuation?.finish()
    }

    func cancel() {
        lock.lock()
        cancelled = true
        let continuation = continuation
        self.continuation = nil
        lock.unlock()
        continuation?.finish()
    }

    var isCancelled: Bool {
        lock.lock()
        let cancelled = cancelled
        lock.unlock()
        return cancelled
    }
}

/// Bridges the UniFFI callback interface to an `AsyncStream<String>`.
private final class ChunkCollector: StreamChunkListener {
    private let bridge: StreamBridge

    init(bridge: StreamBridge) {
        self.bridge = bridge
    }

    /// Called by the Rust runtime for each streamed token.
    /// - Returns: `true` to keep streaming, `false` to cancel.
    func onChunk(chunk: StreamChunk) -> Bool {
        if bridge.isCancelled {
            return false
        }

        if chunk.done {
            bridge.finish()
            return false
        }

        bridge.yield(chunk.delta)
        return !bridge.isCancelled
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK: - ViewModel
// ─────────────────────────────────────────────────────────────────────────────

@MainActor
final class ChatViewModel: ObservableObject {

    // ── Published state ───────────────────────────────────────────────────────

    @Published private(set) var messages: [Message]
    @Published private(set) var isModelLoading: Bool = false
    @Published private(set) var isModelReady: Bool = false
    @Published private(set) var isSending: Bool = false
    @Published private(set) var loadingProgress: String = "Preparing model…"
    @Published private(set) var engineInfo: EngineInfo = EngineInfo(
        status: .unloaded,
        modelName: nil,
        approxMemory: nil,
        historyLength: 0
    )

    @Published var alertError: IdentifiableError? = nil

    // ── Private state ─────────────────────────────────────────────────────────

    // Lazy so the Rust/UniFFI runtime isn't initialized during
    // @StateObject construction on the UIKit event-fetch thread.
    private var engine: OndeChatEngine?
    private var streamingTask: Task<Void, Never>?
    private var streamBridge: StreamBridge?
    private var didHydrateEngineHistory = false

    private static let persistedMessagesKey = "ai.siti.vision.messages"

    init() {
        self.messages = Self.loadPersistedMessages()
    }

    private func getOrCreateEngine() -> OndeChatEngine {
        if let existing = engine { return existing }
        let new = OndeChatEngine()
        engine = new
        return new
    }

    var hasMessages: Bool {
        !messages.isEmpty
    }

    var isBusy: Bool {
        isModelLoading || isSending
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: Model lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    func loadModelIfNeeded(systemPrompt: String, samplingPreset: SamplingPreset) async {
        if isModelReady {
            await applySettings(systemPrompt: systemPrompt, samplingPreset: samplingPreset)
            return
        }

        await loadModel(
            systemPrompt: systemPrompt,
            samplingPreset: samplingPreset,
            forceReload: false
        )
    }

    func retryLoadingModel(systemPrompt: String, samplingPreset: SamplingPreset) async {
        await loadModel(
            systemPrompt: systemPrompt,
            samplingPreset: samplingPreset,
            forceReload: false
        )
    }

    func reloadModel(systemPrompt: String, samplingPreset: SamplingPreset) async {
        await loadModel(
            systemPrompt: systemPrompt,
            samplingPreset: samplingPreset,
            forceReload: true
        )
    }

    func applySettings(systemPrompt: String, samplingPreset: SamplingPreset) async {
        guard isModelReady else { return }

        let engine = getOrCreateEngine()
        let normalizedPrompt = normalizedSystemPrompt(systemPrompt)

        if let normalizedPrompt {
            await engine.setSystemPrompt(prompt: normalizedPrompt)
        } else {
            await engine.clearSystemPrompt()
        }

        await engine.setSampling(sampling: samplingPreset.samplingConfig)
        await refreshEngineInfo()
    }

    func clearConversation() async {
        cancelStreaming()
        messages.removeAll()
        persistMessages()

        if let engine {
            _ = await engine.clearHistory()
            await refreshEngineInfo()
        } else {
            engineInfo = EngineInfo(
                status: .unloaded,
                modelName: nil,
                approxMemory: nil,
                historyLength: 0
            )
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: Sending messages
    // ─────────────────────────────────────────────────────────────────────────

    func send(text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isSending, isModelReady else { return }

        alertError = nil
        messages.append(Message(role: .user, text: trimmed))
        persistMessages()

        streamingTask = Task {
            await streamResponse(for: trimmed)
        }
    }

    func sendSuggestion(_ suggestion: PromptSuggestion) {
        send(text: suggestion.prompt)
    }

    func cancelStreaming() {
        streamBridge?.cancel()
        streamingTask?.cancel()
        streamingTask = nil
        streamBridge = nil

        if let idx = messages.indices.last, messages[idx].isStreaming {
            if messages[idx].text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                messages.remove(at: idx)
            } else {
                messages[idx].isStreaming = false
            }
            persistMessages()
        }

        isSending = false
        if engineInfo.status == .generating {
            engineInfo = EngineInfo(
                status: .ready,
                modelName: engineInfo.modelName,
                approxMemory: engineInfo.approxMemory,
                historyLength: engineInfo.historyLength
            )
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK: Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private func loadModel(
        systemPrompt: String,
        samplingPreset: SamplingPreset,
        forceReload: Bool
    ) async {
        guard !isModelLoading else { return }

        if forceReload {
            cancelStreaming()
            didHydrateEngineHistory = false
        }

        isModelLoading = true
        isModelReady = false
        alertError = nil
        loadingProgress = forceReload ? "Reloading model…" : "Loading model…"

        defer {
            isModelLoading = false
        }

        do {
            let elapsed = try await getOrCreateEngine().loadDefaultModel(
                systemPrompt: normalizedSystemPrompt(systemPrompt),
                sampling: samplingPreset.samplingConfig
            )

            loadingProgress = String(format: "Model ready in %.1f s", elapsed)
            isModelReady = true
            didHydrateEngineHistory = false
            await restorePersistedConversationIfNeeded()
            await refreshEngineInfo()
        } catch {
            isModelReady = false
            await refreshEngineInfo()
            alertError = IdentifiableError(error)
            loadingProgress = "Unable to load model"
        }
    }

    private func streamResponse(for userText: String) async {
        isSending = true
        engineInfo = EngineInfo(
            status: .generating,
            modelName: engineInfo.modelName,
            approxMemory: engineInfo.approxMemory,
            historyLength: engineInfo.historyLength
        )

        let assistantIndex = messages.count
        messages.append(Message(role: .assistant, text: "", isStreaming: true))

        let bridge = StreamBridge()
        streamBridge = bridge
        let listener = ChunkCollector(bridge: bridge)

        let stream = AsyncStream<String> { continuation in
            bridge.attach(continuation)
        }

        let capturedEngine = getOrCreateEngine()
        let producer = Task.detached(priority: .userInitiated) {
            do {
                try await streamChatMessage(
                    engine: capturedEngine,
                    message: userText,
                    listener: listener
                )
                bridge.finish()
            } catch {
                bridge.finish()
                await MainActor.run {
                    if !bridge.isCancelled {
                        self.alertError = IdentifiableError(error)
                    }
                }
            }
        }

        for await delta in stream {
            guard !Task.isCancelled else { break }
            if assistantIndex < messages.count {
                messages[assistantIndex].text += delta
            }
        }

        _ = await producer.result

        let assistantHasText = assistantIndex < messages.count &&
            !messages[assistantIndex].text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        if assistantIndex < messages.count {
            if assistantHasText {
                messages[assistantIndex].isStreaming = false
            } else {
                messages.remove(at: assistantIndex)
            }
        }

        persistMessages()
        streamBridge = nil
        streamingTask = nil
        isSending = false
        await refreshEngineInfo()
    }

    private func restorePersistedConversationIfNeeded() async {
        guard !didHydrateEngineHistory else { return }
        guard !messages.isEmpty else {
            didHydrateEngineHistory = true
            return
        }

        loadingProgress = "Restoring conversation…"
        let engine = getOrCreateEngine()

        for message in messages {
            await engine.pushHistory(message: message.asChatMessage)
        }

        didHydrateEngineHistory = true
    }

    private func refreshEngineInfo() async {
        guard let engine else {
            engineInfo = EngineInfo(
                status: .unloaded,
                modelName: nil,
                approxMemory: nil,
                historyLength: 0
            )
            return
        }

        let info = await engine.info()
        engineInfo = info
        isModelReady = info.status == .ready || info.status == .generating
    }

    private func normalizedSystemPrompt(_ prompt: String) -> String? {
        let trimmed = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func persistMessages() {
        do {
            let data = try JSONEncoder().encode(messages)
            UserDefaults.standard.set(data, forKey: Self.persistedMessagesKey)
        } catch {
            logPersistenceFailure(error)
        }
    }

    private static func loadPersistedMessages() -> [Message] {
        guard let data = UserDefaults.standard.data(forKey: persistedMessagesKey) else {
            return []
        }

        do {
            return try JSONDecoder().decode([Message].self, from: data).map {
                Message(id: $0.id, role: $0.role, text: $0.text, isStreaming: false)
            }
        } catch {
            return []
        }
    }

    private func logPersistenceFailure(_ error: Error) {
        NSLog("SitiVision: failed to persist messages: %@", String(describing: error))
    }
}
