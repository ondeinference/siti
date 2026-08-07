#!/usr/bin/env bash
# build-android.sh
#
# Full Play Store pipeline for Siti AI (Android):
#   1. Clean    — rm -rf src-tauri/gen/android
#   2. Init     — cargo tauri android init (prod Android config)
#   3. Icons    — pnpm gim
#   4. Override — copy src-tauri/gen-override/android/* into gen/android/
#   5. Keystore — patch storeFile path in gen/android/keystore.properties
#   6. Build    — cargo tauri android build --aab
#   7. Verify   — assert the merged manifest still launches and reaches the net
#
# The build produces a signed universal .aab ready to upload to the Play
# Console. versionCode is injected at init/build time as YYYYMMDDhh (UTC) via a
# second -c flag, so tauri.prod-android.conf.json is never mutated.
#
# Every configurable value has a hardcoded default that can be overridden by
# setting the corresponding environment variable before invoking the script.
# KEYSTORE_PATH has no default and is read from an untracked .env.playstore if
# present — copy .env.playstore.example to get started.
#
# Usage:
#   ./scripts/build-android.sh              # full pipeline
#   ./scripts/build-android.sh clean        # rm gen/android only
#   ./scripts/build-android.sh init         # android init only
#   ./scripts/build-android.sh icons        # generate icons only
#   ./scripts/build-android.sh override     # copy gen-override files only
#   ./scripts/build-android.sh keystore     # patch keystore.properties only
#   ./scripts/build-android.sh build        # android build only
#   ./scripts/build-android.sh verify       # check the merged manifest only
#
#   make psmobile                           # full pipeline via Makefile
#   make psmobile-build

set -euo pipefail

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_CONFIG="${REPO_ROOT}/src-tauri/tauri.prod-android.conf.json"
GEN_ANDROID_DIR="${REPO_ROOT}/src-tauri/gen/android"
GEN_OVERRIDE_DIR="${REPO_ROOT}/src-tauri/gen-override/android"
KEYSTORE_PROPERTIES="${GEN_ANDROID_DIR}/keystore.properties"

# Auto-load the untracked .env.playstore (upload keystore path) so
# `make psmobile` works without the caller exporting it first. Mirrors how
# build-ios.sh / build-macos.sh / build-visionos.sh load .env.appstore. See
# .env.playstore.example for the expected keys.
#
# Sourcing assigns unconditionally, which would let the file quietly beat an
# inline `KEYSTORE_PATH=… make psmobile`. Stash the caller's value first and put
# it back afterwards, so an explicit override always wins over the file.
KEYSTORE_PATH_FROM_CALLER="${KEYSTORE_PATH:-}"

if [[ -f "${REPO_ROOT}/.env.playstore" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "${REPO_ROOT}/.env.playstore"
  set +a
fi

if [[ -n "$KEYSTORE_PATH_FROM_CALLER" ]]; then
  KEYSTORE_PATH="$KEYSTORE_PATH_FROM_CALLER"
fi

# ── Overridable config ────────────────────────────────────────────────────────

# Absolute path to the upload keystore (.jks). Required — no default, so that no
# personal path is baked into the public repo. Set it in .env.playstore (copy
# .env.playstore.example), or export it before running this script.
#
# Note this is the *only* way to point the build at a keystore: do_keystore
# rewrites storeFile= in gen/android/keystore.properties from this value, so
# editing that file by hand has no effect.
KEYSTORE_PATH="${KEYSTORE_PATH:?set KEYSTORE_PATH in .env.playstore (see .env.playstore.example) or export it}"

# versionCode: YYYYMMDDhh (UTC) — same UTC timestamp base as the iOS bundleVersion
#   Integer form of the date+hour; fits the Play Store 32-bit limit (≤ 2,100,000,000) through 2099
#   Monotonically increasing → satisfies Play Store requirement
VERSION_CODE="$(date -u +"%Y%m%d%H")"
VERSION_CODE_JSON="{\"bundle\":{\"android\":{\"versionCode\":${VERSION_CODE}}}}"

# ── Helpers ───────────────────────────────────────────────────────────────────

step() { echo ""; echo "── $* ──────────────────────────────────────────────"; }
ok()   { echo "✅  $*"; }
fail() { echo "❌  $*" >&2; exit 1; }

# ── Steps ─────────────────────────────────────────────────────────────────────

do_clean() {
  step "1/7  Clean gen/android"

  echo "🗑   rm -rf ${GEN_ANDROID_DIR}"
  rm -rf "${GEN_ANDROID_DIR}"
  ok "Cleaned"
}

do_init() {
  step "2/7  Android init"

  [[ -f "$ANDROID_CONFIG" ]] || fail "Android config not found: $ANDROID_CONFIG"

  echo "🏷   versionCode → ${VERSION_CODE}"
  echo "📂  config       → ${ANDROID_CONFIG}"
  echo ""

  cargo tauri android init \
    -c "${ANDROID_CONFIG}" \
    -c "${VERSION_CODE_JSON}"

  ok "Android project initialised → ${GEN_ANDROID_DIR}"
}

do_icons() {
  step "3/7  Generate icons"

  pnpm gim
  ok "Icons generated"
}

do_override() {
  step "4/7  Apply gen-override/android"

  # Nothing to do if the override directory contains only .keep files.
  OVERRIDE_COUNT="$(find "${GEN_OVERRIDE_DIR}" -not -name '.keep' -not -type d | wc -l | tr -d ' ')"

  if [[ "$OVERRIDE_COUNT" -eq 0 ]]; then
    echo "ℹ️   No override files — skipping."
    return
  fi

  echo "📋  Copying ${OVERRIDE_COUNT} file(s) from gen-override/android → gen/android"

  rsync -av \
    --exclude='.keep' \
    "${GEN_OVERRIDE_DIR}/" \
    "${GEN_ANDROID_DIR}/"

  ok "Overrides applied"
}

do_keystore() {
  step "5/7  Patch keystore.properties"

  [[ -f "$KEYSTORE_PROPERTIES" ]] || fail "keystore.properties not found: ${KEYSTORE_PROPERTIES}\n       Run 'override' step first."
  [[ -f "$KEYSTORE_PATH" ]] || fail "Keystore file not found: ${KEYSTORE_PATH}\n       Set KEYSTORE_PATH env var to the correct .jks path."

  echo "🔑  storeFile → ${KEYSTORE_PATH}"

  # Replace the storeFile= line in-place, leaving all other keys untouched.
  sed -i '' "s|^storeFile=.*|storeFile=${KEYSTORE_PATH}|" "${KEYSTORE_PROPERTIES}"

  ok "Patched → ${KEYSTORE_PROPERTIES}"
}

do_build() {
  step "6/7  Build"

  [[ -f "$ANDROID_CONFIG" ]] || fail "Android config not found: $ANDROID_CONFIG"

  echo "🏷   versionCode → ${VERSION_CODE}"
  echo "📦  config       → ${ANDROID_CONFIG}"
  echo ""

  cargo tauri android build \
    --aab \
    -c "${ANDROID_CONFIG}" \
    -c "${VERSION_CODE_JSON}"

  AAB_PATH="${GEN_ANDROID_DIR}/app/build/outputs/bundle/universalRelease/app-universal-release.aab"
  if [[ -f "$AAB_PATH" ]]; then
    ok "Build complete → ${AAB_PATH}"
  else
    ok "Build complete (locate the .aab under ${GEN_ANDROID_DIR}/app/build/outputs/bundle/)"
  fi
}

do_verify() {
  step "7/7  Verify merged manifest"

  # Guards the failure mode that shipped in 1.0.1: an override file copied over
  # app/src/main/AndroidManifest.xml replaced Tauri's generated manifest instead
  # of merging with it, so the released .aab had no MAIN/LAUNCHER filter (the
  # Play Store offered Install but no Open, and no icon appeared in the drawer)
  # and no INTERNET permission (no model could ever download). Both are silent
  # at build time — nothing fails, the .aab just cannot be launched — so assert
  # on the post-merge manifest that actually goes into the bundle.
  MERGED_MANIFEST="$(find "${GEN_ANDROID_DIR}/app/build/intermediates" \
    -path '*bundle_manifest*universalRelease*' -name 'AndroidManifest.xml' \
    -print -quit 2>/dev/null || true)"

  [[ -n "$MERGED_MANIFEST" ]] || fail "No merged release manifest found — run the 'build' step first."

  echo "🔍  ${MERGED_MANIFEST#"${REPO_ROOT}/"}"

  # "<what to look for>|<what its absence breaks>"
  REQUIRED=(
    'android.intent.action.MAIN|no launcher entry — Play Store shows Install but no Open'
    'android.intent.category.LAUNCHER|no icon in the app drawer'
    'android.permission.INTERNET|model downloads fail'
    'android:icon=|no launcher icon'
    'android:label=|no app name under the icon'
  )

  MISSING=0
  for entry in "${REQUIRED[@]}"; do
    needle="${entry%%|*}"
    consequence="${entry#*|}"
    if grep -qF "$needle" "$MERGED_MANIFEST"; then
      echo "   ✓ ${needle}"
    else
      echo "   ✗ ${needle} — ${consequence}" >&2
      MISSING=1
    fi
  done

  [[ "$MISSING" -eq 0 ]] || fail "Merged manifest is missing required entries (see above).
       Almost always caused by a file in gen-override/android/app/src/main/
       replacing a generated file rather than adding to it. Manifest additions
       belong in a build-type source set such as app/src/release/, which AGP's
       manifest merger folds into the generated one."

  ok "Manifest is launchable"
}

# ── Entry point ───────────────────────────────────────────────────────────────

STEP="${1:-all}"

case "$STEP" in
  clean)    do_clean    ;;
  init)     do_init     ;;
  icons)    do_icons    ;;
  override) do_override ;;
  keystore) do_keystore ;;
  build)    do_build    ;;
  verify)   do_verify   ;;
  all)
    do_clean
    do_init
    do_icons
    do_override
    do_keystore
    do_build
    do_verify
    echo ""
    echo "🎉  Pipeline complete: Siti AI Android .aab is ready for Play Store upload."
    ;;
  *)
    echo "Usage: $0 [clean|init|icons|override|keystore|build|verify|all]" >&2
    exit 1
    ;;
esac
