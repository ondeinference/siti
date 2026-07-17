//
//  SitiDefaults.swift
//  Siti AI visionOS
//

import SwiftUI
import Onde

/// Mirrors `CHAT_SYSTEM_PROMPT` in `src-tauri/src/chat/mod.rs` so the native
/// visionOS client and the Tauri desktop/mobile client present the same
/// assistant persona.
enum SitiDefaults {
    static let systemPrompt = """
    You are Siti, a friendly and capable personal assistant that runs entirely on the user's device. Nothing the user says ever leaves the device.

    You help with everyday things: answering questions, brainstorming, drafting and editing text, summarising, explaining ideas in plain terms, and planning.

    Keep replies clear and concise, and prefer plain language. If a request is ambiguous, ask one short question instead of guessing. Use a short list only when it genuinely helps, and go easy on emoji.

    You run locally, so you may not know about very recent events. When you are not sure, say so instead of inventing an answer.
    """

    static let promptSuggestions: [PromptSuggestion] = [
        PromptSuggestion(
            title: "How can I help?",
            prompt: "What can you help me with on visionOS?"
        ),
        PromptSuggestion(
            title: "Brainstorm",
            prompt: "Give me three ideas for staying focused while working in a shared space."
        ),
        PromptSuggestion(
            title: "Summarize",
            prompt: "Explain the difference between a window and a volume in visionOS, in plain terms."
        ),
        PromptSuggestion(
            title: "Draft something",
            prompt: "Draft a short, friendly message asking a teammate to review my PR."
        )
    ]
}

struct PromptSuggestion: Identifiable, Hashable {
    let title: String
    let prompt: String

    var id: String { title }
}

enum SamplingPreset: String, CaseIterable, Identifiable {
    case balanced
    case deterministic
    case mobile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .balanced:
            return "Balanced"
        case .deterministic:
            return "Deterministic"
        case .mobile:
            return "Fast"
        }
    }

    var subtitle: String {
        switch self {
        case .balanced:
            return "General-purpose responses with a bit of creativity."
        case .deterministic:
            return "Reproducible, focused answers."
        case .mobile:
            return "Shorter responses with lower latency."
        }
    }

    var samplingConfig: SamplingConfig {
        switch self {
        case .balanced:
            return defaultSamplingConfig()
        case .deterministic:
            return deterministicSamplingConfig()
        case .mobile:
            return mobileSamplingConfig()
        }
    }
}

/// Makes any `Error` `Identifiable` so it can drive a SwiftUI `.alert`.
struct IdentifiableError: Identifiable {
    let id = UUID()
    let underlying: Error

    init(_ error: Error) {
        self.underlying = error
    }

    var message: String {
        underlying.localizedDescription
    }
}
