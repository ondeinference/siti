#!/usr/bin/env bash
# build-ios.sh
#
# Full App Store pipeline for Siti AI (iOS):
#   1. Clean    — rm -rf src-tauri/gen/apple
#   2. Init     — cargo tauri ios init (local tauri CLI, prod iOS config)
#   3. Icons    — pnpm gim
#   4. Override — copy gen-override/apple into gen/apple
#   5. Build    — cargo tauri ios build (app-store-connect, datetime CFBundleVersion)
#   6. Upload   — xcrun altool (App Store Connect submission)
#
# Every configurable value has a hardcoded default that can be overridden by
# setting the corresponding environment variable before invoking the script.
#
# Usage:
#   ./scripts/build-ios.sh              # full pipeline
#   ./scripts/build-ios.sh clean        # rm gen/apple only
#   ./scripts/build-ios.sh init         # tauri ios init only
#   ./scripts/build-ios.sh icons        # pnpm gim only
#   ./scripts/build-ios.sh override     # copy gen-override/apple only
#   ./scripts/build-ios.sh build        # build only (assumes init already done)
#   ./scripts/build-ios.sh upload       # upload only (assumes .ipa already built)
#
#   make asios                          # full pipeline via Makefile
#   make asios-clean
#   make asios-init
#   make asios-icons
#   make asios-override
#   make asios-build
#   make asios-upload

set -euo pipefail

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_CONFIG="${REPO_ROOT}/src-tauri/tauri.prod-ios.conf.json"
GEN_APPLE="${REPO_ROOT}/src-tauri/gen/apple"
GEN_OVERRIDE="${REPO_ROOT}/src-tauri/gen-override/apple"

# ── Overridable config ─────────────────────────────────────────────────────────
#
# Path to a local Tauri source checkout. The ios init command is run via
# `cargo run` against this manifest so the CLI version matches the workspace.
# Override: TAURI_CLI_MANIFEST=/path/to/tauri/Cargo.toml ./scripts/build-ios.sh
TAURI_CLI_MANIFEST="${TAURI_CLI_MANIFEST:-${HOME}/Repositories/tauri/Cargo.toml}"

# App Store Connect API credentials.
# ASC_API_KEY   — Key ID shown in App Store Connect → Users & Access → Keys.
# ASC_ISSUER_ID — Issuer UUID on the same page.
# The private key (.p8) must be present at:
#   ~/.appstoreconnect/private_keys/AuthKey_<ASC_API_KEY>.p8
ASC_API_KEY="${ASC_API_KEY:-L84N624YQH}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-b4e8d369-8b7d-4538-8435-643b73237575}"

# App name — must match the productName in tauri.prod-ios.conf.json.
APP_NAME="${APP_NAME:-Siti AI}"

# Derived IPA path produced by `cargo tauri ios build`.
IPA_PATH="${REPO_ROOT}/src-tauri/gen/apple/build/arm64/${APP_NAME}.ipa"

# ── Helpers ───────────────────────────────────────────────────────────────────

step() { echo ""; echo "── $* ──────────────────────────────────────────────"; }
ok()   { echo "✅  $*"; }
fail() { echo "❌  $*" >&2; exit 1; }

# ── Steps ─────────────────────────────────────────────────────────────────────

do_clean() {
  step "Clean"
  rm -rf "${GEN_APPLE}"
  ok "Removed ${GEN_APPLE}"
}

do_init() {
  step "Init"

  [[ -f "$IOS_CONFIG" ]]           || fail "Config not found: $IOS_CONFIG"
  [[ -f "$TAURI_CLI_MANIFEST" ]]   || fail "Tauri CLI manifest not found: $TAURI_CLI_MANIFEST\n       Set TAURI_CLI_MANIFEST to the path of your local tauri/Cargo.toml"

  echo "📱  config  → ${IOS_CONFIG}"
  echo "🦀  cli     → ${TAURI_CLI_MANIFEST}"
  echo ""

  cargo run --release \
    --manifest-path "${TAURI_CLI_MANIFEST}" \
    -p tauri-cli \
    -- tauri ios init \
    -c "${IOS_CONFIG}"

  ok "Xcode project generated → ${GEN_APPLE}"
}

do_icons() {
  step "Icons"
  pnpm gim
  ok "Icons generated"
}

do_override() {
  step "Override"

  if [[ -d "${GEN_OVERRIDE}" ]]; then
    cp -r "${GEN_OVERRIDE}/." "${GEN_APPLE}/"
    ok "Copied ${GEN_OVERRIDE} → ${GEN_APPLE}"
  else
    echo "ℹ️   No overrides found at ${GEN_OVERRIDE}, skipping."
  fi
}

do_build() {
  step "Build"

  [[ -f "$IOS_CONFIG" ]] || fail "Config not found: $IOS_CONFIG"
  [[ -d "$GEN_APPLE" ]]  || fail "Xcode project not found at ${GEN_APPLE}\n       Run 'init' step first."

  # CFBundleVersion: YYYYMMDD.HHMM (UTC)
  #   Two period-separated integers → valid for Apple
  #   Monotonically increasing      → satisfies App Store requirement
  BUNDLE_VERSION="$(date -u +"%Y%m%d.%H%M")"
  BUNDLE_VERSION_JSON="{\"bundle\":{\"iOS\":{\"bundleVersion\":\"${BUNDLE_VERSION}\"}}}"

  echo "🏷   bundleVersion  → ${BUNDLE_VERSION}"
  echo "📦  app config     → ${IOS_CONFIG}"
  echo ""

  cargo tauri ios build \
    --export-method app-store-connect \
    --config "${IOS_CONFIG}" \
    --config "${BUNDLE_VERSION_JSON}"

  [[ -f "$IPA_PATH" ]] || fail "Build succeeded but .ipa not found at: $IPA_PATH"
  ok "Build complete → ${IPA_PATH}"
}

do_upload() {
  step "Upload"

  [[ -f "$IPA_PATH" ]] || fail ".ipa not found: ${IPA_PATH}\n       Run 'build' step first."

  echo "📤  file    → ${IPA_PATH}"
  echo "🔑  apiKey  → ${ASC_API_KEY}"
  echo "🏢  issuer  → ${ASC_ISSUER_ID}"
  echo ""

  xcrun altool \
    --upload-app \
    --type ios \
    --file "${IPA_PATH}" \
    --apiKey "${ASC_API_KEY}" \
    --apiIssuer "${ASC_ISSUER_ID}"

  ok "Uploaded to App Store Connect"
}

# ── Entry point ───────────────────────────────────────────────────────────────

STEP="${1:-all}"

case "$STEP" in
  clean)    do_clean    ;;
  init)     do_init     ;;
  icons)    do_icons    ;;
  override) do_override ;;
  build)    do_build    ;;
  upload)   do_upload   ;;
  all)
    do_clean
    do_init
    do_icons
    do_override
    do_build
    do_upload
    echo ""
    echo "🎉  Pipeline complete: built and uploaded ${APP_NAME} to App Store Connect."
    ;;
  *)
    echo "Usage: $0 [clean|init|icons|override|build|upload|all]" >&2
    exit 1
    ;;
esac
