import { useEffect, useMemo, useState } from "react";
import type { ChatStatus, ModelInfo } from "./api";
import { formatSize, getAppVersion, getBuildVersion } from "./api";

interface SettingsProps {
  open: boolean;
  models: ModelInfo[];
  status: ChatStatus;
  statusError: string | null;
  onSelectModel: (id: string) => void;
  onClose: () => void;
}

function statusLine(status: ChatStatus, error: string | null) {
  switch (status) {
    case "loading":
      return { text: "Downloading / loading…", cls: "loading" };
    case "ready":
      return { text: "Ready", cls: "ready" };
    case "generating":
      return { text: "Generating…", cls: "loading" };
    case "error":
      return { text: error ?? "Failed to load model", cls: "error" };
    default:
      return { text: "Not loaded", cls: "" };
  }
}

export default function Settings({
  open,
  models,
  status,
  statusError,
  onSelectModel,
  onClose,
}: SettingsProps) {
  const selected = useMemo(
    () => models.find((m) => m.is_selected) ?? models[0],
    [models]
  );
  const busy = status === "loading";
  const line = statusLine(status, statusError);

  // Real app version (CFBundleShortVersionString) and build number
  // (CFBundleVersion), read from the bundle rather than hardcoded.
  const [appVersion, setAppVersion] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      const [version, build] = await Promise.all([
        getAppVersion().catch(() => ""),
        getBuildVersion().catch(() => null),
      ]);
      if (!active) return;
      setAppVersion(build && build !== version ? `${version} (${build})` : version);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={`settings-overlay${open ? " open" : ""}`} aria-hidden={!open}>
      <header className="settings-header">
        <h1>Settings</h1>
        <button className="settings-done" onClick={onClose}>
          Done
        </button>
      </header>

      <div className="settings-content">
        <section className="settings-section">
          <p className="section-label">Model</p>

          <div className="settings-card">
            <div className="settings-row">
              <span className="row-label">On-device model</span>
              <div className="select-wrap">
                <select
                  className="model-select"
                  value={selected?.id ?? ""}
                  disabled={busy || models.length === 0}
                  onChange={(e) => onSelectModel(e.target.value)}
                >
                  {models.length === 0 && <option value="">Unavailable</option>}
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.size_bytes ? ` · ${formatSize(m.size_bytes)}` : ""}
                    </option>
                  ))}
                </select>
                <svg className="chevron" viewBox="0 0 12 8" aria-hidden>
                  <path
                    d="M1 1.5 6 6.5 11 1.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {selected && (
              <div className="model-detail">
                <span className="model-org">{selected.org}</span>
                <p className="model-desc">{selected.description}</p>
                <div className={`model-status ${line.cls}`}>
                  <span className="model-status-dot" />
                  {line.text}
                </div>
              </div>
            )}
          </div>

          <p className="settings-note">
            The model downloads the first time you pick it, so use Wi-Fi if you
            can. It then runs on your device, and nothing you type is sent to a
            server.
          </p>
        </section>

        <section className="settings-section">
          <p className="section-label">About</p>
          <div className="settings-card about">
            <div className="settings-row">
              <span className="row-label">Siti AI</span>
              <span className="row-value">{appVersion}</span>
            </div>
            <div className="settings-row">
              <span className="row-label">Privacy</span>
              <span className="row-value">On-device · private</span>
            </div>
          </div>
          <p className="settings-note">Profoundly personal. Entirely private.</p>
        </section>
      </div>
    </div>
  );
}
