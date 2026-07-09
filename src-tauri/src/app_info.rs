//! Tauri command: `app_build_version`
//!
//! Exposes the native build number so Settings can show a real version string
//! instead of a hardcoded one. The marketing version (`CFBundleShortVersionString`)
//! comes from `tauri.conf.json` and is read on the JS side via the app plugin's
//! `getVersion()`; the build number (`CFBundleVersion`) is Apple-specific and
//! lives only in the shipped bundle, so it needs a native read.

/// Return the app's build version (`CFBundleVersion`).
///
/// On Apple platforms this reads `CFBundleVersion` from the running bundle's
/// Info.plist — the exact value App Store Connect and TestFlight show, stamped
/// at build time by the release scripts as `YYYYMMDD.HHMM`. Returns `None` when
/// it cannot be resolved so the UI can fall back to the marketing version alone.
#[cfg(any(target_os = "ios", target_os = "macos"))]
#[tauri::command]
pub fn app_build_version() -> Option<String> {
    use objc2_foundation::{NSBundle, NSString};

    let bundle = NSBundle::mainBundle();
    let value = bundle.objectForInfoDictionaryKey(&NSString::from_str("CFBundleVersion"))?;
    let version = value.downcast::<NSString>().ok()?;
    Some(version.to_string())
}

/// Non-Apple builds have no `CFBundleVersion`; fall back to the marketing version.
#[cfg(not(any(target_os = "ios", target_os = "macos")))]
#[tauri::command]
pub fn app_build_version() -> Option<String> {
    None
}
