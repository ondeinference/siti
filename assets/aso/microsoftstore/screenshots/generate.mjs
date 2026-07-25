// Microsoft Store screenshot generator — Siti AI.
// Renders editorial frames using Siti AI's REAL chat UI markup and its own
// stylesheet (src/App.css), framed with a caption in the app's minimal,
// monochrome Scandinavian style, at the Windows Store desktop size
// (1920x1080 landscape) via headless chromium.
//
//   node assets/aso/microsoftstore/screenshots/generate.mjs   (run from repo root)
//
// Output: assets/aso/microsoftstore/screenshots/windows/NN-<slug>.png (1920x1080)
// Playwright is borrowed from the sibling SplitFire repo's shared cache
// (playwright is repo-agnostic); Siti AI has none of its own.
//
// Honest feature set only (see assets/aso/microsoftstore/en-US.md): a private,
// on-device AI assistant — ask anything, draft, summarize, translate; no
// cloud, no account, works offline after a one-time model download.

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../../..");
const require = createRequire(import.meta.url);
const pw = [
  process.env.HOME + "/Repositories/splitfire/.ds-sync/node_modules/playwright",
  resolve(REPO, ".ds-sync/node_modules/playwright"),
].find((p) => existsSync(p));
if (!pw) throw new Error("playwright not found (borrow from splitfire/.ds-sync)");
const { chromium } = require(pw);

// The app's real stylesheet is the source of truth for the chat UI look.
const APP_CSS = readFileSync(resolve(REPO, "src/App.css"), "utf8");

const PLATFORMS = { windows: { w: 1920, h: 1080, zoom: 1.15, cap: 62, sub: 25 } };

// ── Real Siti AI markup (classes from src/App.tsx + src/App.css) ────────────
const bubble = (role, text) =>
  `<div class="message-row ${role}"><div class="bubble">${text}</div></div>`;

const settingsIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const sendIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>`;

// A bounded chat window holding the real .app markup.
const chatWindow = (subtitle, rows, placeholder = "Message Siti…") => `
  <div class="siti-window">
    <div class="app">
      <header class="header">
        <div class="header-title">
          <h1>Siti AI</h1>
          <span class="header-subtitle">${subtitle}</span>
        </div>
        <div class="header-actions">
          <span class="status-dot"></span>
          <button class="icon-button">${settingsIcon}</button>
        </div>
      </header>
      <div class="messages">${rows}</div>
      <div class="input-area">
        <div class="input-form">
          <input class="input-field" value="" placeholder="${placeholder}" readonly />
          <button class="send-button">${sendIcon}</button>
        </div>
        <div class="input-hint">Private &middot; runs on your PC</div>
      </div>
    </div>
  </div>`;

const settingsWindow = () => `
  <div class="siti-window">
    <div class="app">
      <div class="settings-header">
        <h1>Settings</h1>
        <button class="settings-done">Done</button>
      </div>
      <div class="settings-content">
        <div class="settings-section">
          <div class="section-label">Model</div>
          <div class="settings-card">
            <div class="settings-row">
              <span class="row-label">On-device model</span>
              <span class="row-value">Gemma 2 &middot; 2B</span>
            </div>
            <div class="model-detail">
              <div class="model-org">Google DeepMind</div>
              <div class="model-desc">Runs entirely on your PC. Downloaded once, then works offline.</div>
              <div class="model-status ready"><span class="model-status-dot"></span>Ready</div>
            </div>
          </div>
          <div class="settings-note">No account, no cloud, no tracking. Your conversations never leave this device.</div>
        </div>
      </div>
    </div>
  </div>`;

// ── Frames (honest: private, on-device, capable, offline) ───────────────────
const FRAMES = [
  {
    slug: "ask-siti-anything",
    caption: "Ask Siti anything",
    sub: "A capable assistant for questions, drafts, and ideas",
    stage: () =>
      chatWindow("Gemma 2 &middot; 2B &middot; private", [
        bubble("user", "Explain vector embeddings like I'm five."),
        bubble(
          "assistant",
          "Imagine every word gets a spot on a huge map. Words that mean similar things sit close together — so the computer can tell that “cat” and “kitten” are neighbours.",
        ),
        bubble("user", "Nice. Now give me three names for a coffee app."),
        bubble("assistant", "Sure — Dailygrind, Pour, and Warmup. Want a few more playful ones?"),
      ].join("")),
  },
  {
    slug: "private-on-device",
    caption: "Private by design",
    sub: "Every conversation stays on your own machine",
    stage: () =>
      chatWindow("Gemma 2 &middot; 2B &middot; private", [
        bubble("user", "Is any of this sent to the cloud?"),
        bubble(
          "assistant",
          "No. Everything runs on your PC. Your messages never leave this device — no account, no servers, no tracking.",
        ),
        bubble("user", "So I can paste something sensitive?"),
        bubble("assistant", "Yes. Nothing you type here is uploaded. It is yours alone."),
      ].join("")),
  },
  {
    slug: "draft-and-summarize",
    caption: "Draft, summarise, translate",
    sub: "Turn a rough note into something finished",
    stage: () =>
      chatWindow("Gemma 2 &middot; 2B &middot; private", [
        bubble("user", "Summarise this in one line: the team agreed to ship the beta on Friday, Alex owns QA, Sam writes the release notes."),
        bubble("assistant", "Beta ships Friday — Alex on QA, Sam on release notes."),
        bubble("user", "Now say it in Indonesian."),
        bubble("assistant", "Beta rilis Jumat — Alex urus QA, Sam tulis catatan rilis."),
      ].join("")),
  },
  {
    slug: "works-offline",
    caption: "Works offline, anywhere",
    sub: "After a one-time download, no connection needed",
    stage: () =>
      chatWindow("Gemma 2 &middot; 2B &middot; offline", [
        bubble("user", "Do I need internet for this?"),
        bubble(
          "assistant",
          "Nope. Once the model is downloaded, Siti works fully offline — on a plane, on a commute, or off the grid, it still answers.",
        ),
        bubble("user", "Perfect for the flight tomorrow."),
        bubble("assistant", "Exactly. Airplane mode, no problem."),
      ].join("")),
  },
  {
    slug: "on-device-model",
    caption: "The model lives on your PC",
    sub: "One download, then it is yours — no sign-in, no cloud",
    stage: () => settingsWindow(),
  },
];

// ── Page ────────────────────────────────────────────────────────────────────
const WIN_W = 560;
const WIN_H = 672;

const page = (p, frame, idx) => `<!doctype html><html><head><meta charset="utf-8"><style>
  ${APP_CSS}
  /* Force the light theme regardless of the headless colour-scheme. */
  :root{--bg:#fafafa;--surface:#ffffff;--border:#e8e8e8;--text-primary:#1a1a1a;--text-secondary:#8a8a8a;--accent:#2d2d2d;--accent-hover:#1a1a1a;--user-bubble:#1a1a1a;--user-bubble-text:#fff;--ai-bubble:#f0f0f0;--ai-bubble-text:#1a1a1a;--input-bg:#f5f5f5}
  html,body{margin:0;width:${p.w}px;height:${p.h}px;overflow:hidden}
  .shot{width:${p.w}px;height:${p.h}px;display:flex;flex-direction:column;
    font-family:"Inter",-apple-system,"Segoe UI",Roboto,sans-serif;color:#1a1a1a;
    background:
      radial-gradient(1100px 640px at 82% 14%, rgba(0,0,0,0.035), transparent 55%),
      linear-gradient(165deg,#f7f7f5 0%,#eeeeeb 100%);
    background-color:#f2f2ef}
  .cap-wrap{padding:${Math.round(p.h * 0.055)}px ${Math.round(p.w * 0.07)}px 0}
  .cap-index{display:inline-block;background:#1a1a1a;color:#fafafa;padding:5px 11px;border-radius:6px;
    font-size:${Math.round(p.sub * 0.72)}px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase}
  .cap{font-size:${p.cap}px;line-height:1.04;font-weight:700;letter-spacing:-0.03em;margin-top:20px;color:#141414}
  .sub{font-size:${p.sub}px;margin-top:15px;color:#6a6a6a}
  .stage{flex:1;display:flex;align-items:center;justify-content:center;padding:${Math.round(p.h * 0.035)}px}
  .stage-inner{zoom:${p.zoom}}
  /* Bounded desktop window that holds the real .app markup. */
  .siti-window{width:${WIN_W}px;height:${WIN_H}px;background:var(--bg);border:1px solid var(--border);
    border-radius:22px;overflow:hidden;box-shadow:0 34px 80px rgba(20,20,20,0.16)}
  .siti-window .app{height:100%}
  .siti-window .header,.siti-window .input-area{padding-left:22px;padding-right:22px}
  .siti-window .header{padding-top:20px;padding-bottom:16px}
  .siti-window .input-area{padding-top:16px;padding-bottom:18px}
  .siti-window .settings-header{padding:20px}
  .siti-window .messages{padding:20px 0}
  </style></head>
  <body>
    <div class="shot">
      <div class="cap-wrap">
        <span class="cap-index">Siti AI &mdash; 0${idx + 1}</span>
        <div class="cap">${frame.caption}</div>
        <div class="sub">${frame.sub}</div>
      </div>
      <div class="stage"><div class="stage-inner">${frame.stage(p)}</div></div>
    </div>
  </body></html>`;

// ── Render ──────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
try {
  for (const [key, p] of Object.entries(PLATFORMS)) {
    const dir = resolve(HERE, key);
    mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    for (const [i, frame] of FRAMES.entries()) {
      await pg.setContent(page(p, frame, i), { waitUntil: "load" });
      const file = resolve(dir, `0${i + 1}-${frame.slug}.png`);
      await pg.screenshot({ path: file, clip: { x: 0, y: 0, width: p.w, height: p.h } });
      console.log("wrote", file.replace(REPO + "/", ""));
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
