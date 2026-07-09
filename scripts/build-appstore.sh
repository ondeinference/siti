#!/usr/bin/env bash
# build-appstore.sh
#
# Full macOS App Store pipeline for Siti AI:
#   1. Build   — cargo tauri build (universal, App Store config, datetime CFBundleVersion)
#   2. Sign    — xcrun productbuild (installer package signing)
#   3. Upload  — xcrun altool (App Store Connect submission)
#
# Every configurable value has a hardcoded default that can be overridden by
# setting the corresponding environment variable before invoking the script.
#
# Usage:
#   ./scripts/build-appstore.sh              # full pipeline
#   ./scripts/build-appstore.sh build        # build only
#   ./scripts/build-appstore.sh sign         # sign only  (assumes .app already built)
#   ./scripts/build-appstore.sh upload       # upload only (assumes .pkg already signed)
#
#   make asmacos          # full pipeline via Makefile
#   make asmacos-build
#   make asmacos-sign
#   make asmacos-upload

set -euo pipefail

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPSTORE_CONFIG="${REPO_ROOT}/src-tauri/tauri.prod-macos-appstore.conf.json"

# ── Overridable config ─────────────────────────────────────────────────────────
#
# Installer signing identity: SHA-1 fingerprint of the "3rd Party Mac Developer
# Installer" certificate in your keychain. This is NOT the same as the app
# signing identity declared in tauri.prod-macos-appstore.conf.json
# (bundle.macOS.signingIdentity = D865610A9D550A397A90E07EB476118EDC48F829),
# which Tauri uses to codesign the .app bundle itself. productbuild requires a
# separate "3rd Party Mac Developer Installer: …" cert. Not secret — safe to
# commit once you know the fingerprint.
#
# Override: SIGNING_IDENTITY=<fingerprint> ./scripts/build-appstore.sh
SIGNING_IDENTITY="${SIGNING_IDENTITY:-}"

# App Store Connect API credentials.
# ASC_API_KEY   — Key ID shown in App Store Connect → Users & Access → Keys.
# ASC_ISSUER_ID — Issuer UUID on the same page.
# The private key (.p8) must be present at:
#   ~/.appstoreconnect/private_keys/AuthKey_<ASC_API_KEY>.p8
ASC_API_KEY="${ASC_API_KEY:-L84N624YQH}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-b4e8d369-8b7d-4538-8435-643b73237575}"

# App name — must match the productName in tauri.prod-macos-appstore.conf.json
# and therefore the .app bundle produced by tauri build.
APP_NAME="${APP_NAME:-Siti AI}"

# Derived paths — quoted to handle the space in "Siti AI".
APP_PATH="${REPO_ROOT}/src-tauri/target/universal-apple-darwin/release/bundle/macos/${APP_NAME}.app"
PKG_PATH="${REPO_ROOT}/${APP_NAME}.pkg"

# ── Helpers ───────────────────────────────────────────────────────────────────

step() { echo ""; echo "── $* ──────────────────────────────────────────────"; }
ok()   { echo "✅  $*"; }
fail() { echo "❌  $*" >&2; exit 1; }

# ── Steps ─────────────────────────────────────────────────────────────────────

do_build() {
  step "1/3  Build"

  [[ -f "$APPSTORE_CONFIG" ]] || fail "Config not found: $APPSTORE_CONFIG"

  # CFBundleVersion: YYYYMMDD.HHMM (UTC)
  #   Two period-separated integers → valid for Apple
  #   Monotonically increasing      → satisfies App Store requirement
  BUNDLE_VERSION="$(date -u +"%Y%m%d.%H%M")"
  BUNDLE_VERSION_JSON="{\"bundle\":{\"macOS\":{\"bundleVersion\":\"${BUNDLE_VERSION}\"}}}"

  echo "🏷   bundleVersion  → ${BUNDLE_VERSION}"
  echo "📦  app config     → ${APPSTORE_CONFIG}"
  echo ""

  # Tauri merges multiple --config flags in order via json_patch::merge.
  # The inline JSON overrides only bundleVersion; all other keys come from
  # tauri.prod-macos-appstore.conf.json. The config file is never mutated.
  cargo tauri build \
    --bundles app \
    --target universal-apple-darwin \
    --config "${APPSTORE_CONFIG}" \
    --config "${BUNDLE_VERSION_JSON}"

  [[ -d "$APP_PATH" ]] || fail "Build succeeded but .app not found at: $APP_PATH"
  ok "Build complete → ${APP_PATH}"
}

do_sign() {
  step "2/3  Sign"

  [[ -d "$APP_PATH" ]] || fail ".app not found: ${APP_PATH}\n       Run 'build' step first."

  if [[ -z "${SIGNING_IDENTITY}" ]]; then
    fail "SIGNING_IDENTITY is not set.\n       Export the SHA-1 fingerprint of your '3rd Party Mac Developer Installer' certificate:\n       export SIGNING_IDENTITY=<fingerprint>"
  fi

  echo "🔏  identity  → ${SIGNING_IDENTITY}"
  echo "📂  component → ${APP_PATH}"
  echo "📦  output    → ${PKG_PATH}"
  echo ""

  xcrun productbuild \
    --sign "${SIGNING_IDENTITY}" \
    --component "${APP_PATH}" /Applications \
    "${PKG_PATH}"

  [[ -f "$PKG_PATH" ]] || fail "productbuild succeeded but .pkg not found at: $PKG_PATH"
  ok "Signed → ${PKG_PATH}"
}

do_upload() {
  step "3/3  Upload"

  [[ -f "$PKG_PATH" ]] || fail ".pkg not found: ${PKG_PATH}\n       Run 'sign' step first."

  echo "📤  file      → ${PKG_PATH}"
  echo "🔑  apiKey    → ${ASC_API_KEY}"
  echo "🏢  issuer    → ${ASC_ISSUER_ID}"
  echo ""

  xcrun altool \
    --upload-app \
    --type macos \
    --file "${PKG_PATH}" \
    --apiKey "${ASC_API_KEY}" \
    --apiIssuer "${ASC_ISSUER_ID}"

  ok "Uploaded to App Store Connect"
}

# ── Entry point ───────────────────────────────────────────────────────────────

STEP="${1:-all}"

case "$STEP" in
  build)  do_build  ;;
  sign)   do_sign   ;;
  upload) do_upload ;;
  all)
    do_build
    do_sign
    do_upload
    echo ""
    echo "🎉  Pipeline complete: built, signed, and uploaded ${APP_NAME}."
    ;;
  *)
    echo "Usage: $0 [build|sign|upload|all]" >&2
    exit 1
    ;;
esac
