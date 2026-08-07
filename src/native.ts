import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * Native-shell hardening for the system WebView.
 *
 * Tauri renders the UI in WKWebView (macOS/iOS) or the Android WebView, both of
 * which ship with browser affordances that immediately read as "this is a web
 * page" inside a shipped app: pinch-to-zoom, ⌘+/− zoom, the browser context
 * menu, dragging text out of the window, and links navigating the app frame
 * away from the UI.
 *
 * App.css handles everything expressible as a passive style (callouts, tap
 * highlights, double-tap zoom, overscroll). The gestures below can only be
 * suppressed with live listeners, because the WebView acts on them before the
 * page sees a scroll or a click.
 *
 * Returns a teardown function; the listeners live for the lifetime of the app,
 * so nothing calls it outside of React's StrictMode double-invoke in dev.
 */
export function installNativeShellBehaviour(): () => void {
  const offs: Array<() => void> = [];

  const on = (
    target: EventTarget,
    type: string,
    handler: (e: never) => void,
    opts?: AddEventListenerOptions
  ) => {
    target.addEventListener(type, handler as EventListener, opts);
    offs.push(() => target.removeEventListener(type, handler as EventListener, opts));
  };

  const swallow = (e: Event) => e.preventDefault();

  // ── Pinch zoom ────────────────────────────────────────────────────────────
  // WebKit reports trackpad and touch pinches as non-standard `gesture*`
  // events; they bypass `touch-action` and the viewport's `user-scalable=no`,
  // so a two-finger pinch on a Mac (or an iPad trackpad) still scales the UI
  // unless each one is cancelled. Must be non-passive to be cancellable.
  for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
    on(document, type, swallow, { passive: false });
  }

  // Chromium (Android WebView, and Linux/Windows desktop) maps a trackpad
  // pinch and ctrl+scroll onto a wheel event with `ctrlKey` set.
  on(
    window,
    "wheel",
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    },
    { passive: false }
  );

  // ── Keyboard zoom ─────────────────────────────────────────────────────────
  // `zoomHotkeysEnabled` is off in tauri.conf.json, but the WebView still
  // honours ⌘/Ctrl with +, -, and 0 on some platforms. Only the zoom keys are
  // intercepted — ⌘A/⌘C/⌘V and friends must keep working.
  on(window, "keydown", (e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (["+", "=", "-", "_", "0"].includes(e.key)) e.preventDefault();
  });

  // ── Browser chrome ────────────────────────────────────────────────────────
  // Suppress the WebView context menu except where it does something a native
  // app would also offer: editing a text field, or copying a selection. Left
  // intact during `pnpm dev` so "Inspect Element" stays reachable.
  if (!import.meta.env.DEV) {
    on(window, "contextmenu", (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const editable =
        el?.closest("input, textarea, [contenteditable='true']") != null;
      const selection = document.getSelection();
      const hasSelection = selection != null && !selection.isCollapsed;
      if (!editable && !hasSelection) e.preventDefault();
    });
  }

  // Nothing in the app is draggable, and a dropped file would otherwise
  // navigate the WebView away from the UI with no way back.
  on(window, "dragstart", swallow);
  on(window, "dragover", swallow);
  on(window, "drop", swallow);

  // ── External links ────────────────────────────────────────────────────────
  // A link that navigates the app frame is unrecoverable — there is no back
  // button. Route anything external to the system browser instead. Components
  // that already handle their own links (Settings) call `preventDefault`, so
  // check for that first to avoid opening the URL twice.
  on(window, "click", (e: MouseEvent) => {
    if (e.defaultPrevented) return;
    const anchor = (e.target as HTMLElement | null)?.closest("a");
    const href = anchor?.getAttribute("href");
    if (!href || !/^(https?|mailto):/i.test(href)) return;
    e.preventDefault();
    void openUrl(href);
  });

  offs.push(installKeyboardInset());
  return () => offs.forEach((off) => off());
}

/**
 * Keep the composer above the on-screen keyboard.
 *
 * iOS does not resize the WKWebView when the keyboard appears — it only shrinks
 * the visual viewport — so `100dvh` keeps reporting the full screen height and
 * the input ends up underneath the keyboard. Publishing the covered height as
 * `--keyboard-inset` lets App.css shrink the app frame the way a native view
 * controller would. Android WebView resizes the window itself, in which case
 * the measured inset stays 0 and this is a no-op.
 */
function installKeyboardInset(): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => {};

  const root = document.documentElement;

  const sync = () => {
    // Height of the screen the keyboard (or any other overlay) covers.
    const covered = window.innerHeight - vv.height - vv.offsetTop;
    root.style.setProperty("--keyboard-inset", `${Math.max(0, Math.round(covered))}px`);
    // Focusing an input makes WebKit scroll the (non-scrollable) document to
    // reveal it, leaving the fixed layout shifted under the status bar.
    window.scrollTo(0, 0);
  };

  vv.addEventListener("resize", sync);
  vv.addEventListener("scroll", sync);
  sync();

  return () => {
    vv.removeEventListener("resize", sync);
    vv.removeEventListener("scroll", sync);
    root.style.removeProperty("--keyboard-inset");
  };
}
