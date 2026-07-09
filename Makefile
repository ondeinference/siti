# Siti AI Makefile
#
# ── macOS App Store ────────────────────────────────────────────────────────
# make asmacos         — full pipeline: build → sign → upload
# make asmacos-build   — tauri build only (universal, App Store config)
# make asmacos-sign    — sign the .app into a .pkg
# make asmacos-upload  — upload the .pkg to App Store Connect
#
# ── iOS App Store ──────────────────────────────────────────────────────────
# make asios              — full pipeline: clean → init → icons → override → build → upload
# make asios-clean        — rm -rf src-tauri/gen/apple
# make asios-init         — cargo tauri ios init
# make asios-icons        — pnpm gim
# make asios-override     — copy gen-override/apple into gen/apple
# make asios-build        — cargo tauri ios build
# make asios-upload       — xcrun altool upload
#
# ── Android Play Store ─────────────────────────────────────────────────────
# make psmobile          — full pipeline: clean → init → icons → override → keystore → build → open (.aab)
# make psmobile-clean    — rm -rf src-tauri/gen/android
# make psmobile-init     — cargo tauri android init
# make psmobile-icons    — pnpm gim
# make psmobile-override — copy gen-override/android into gen/android
# make psmobile-keystore — patch keystore.properties storeFile path
# make psmobile-build    — cargo tauri android build --aab
# make psmobile-open     — open the .aab output dir (upload to Play Console)
#
# ── Development ────────────────────────────────────────────────────────────
# make dev              — start the Tauri dev server
# make build            — standard debug build
# make fmt              — cargo fmt
# make lint             — clippy + tsc
# make clean            — remove build artefacts

.PHONY: dev build \
        asmacos asmacos-build asmacos-sign asmacos-upload \
        asios asios-clean asios-init asios-icons asios-override asios-build asios-upload \
        psmobile psmobile-clean psmobile-init psmobile-icons psmobile-override psmobile-keystore psmobile-build psmobile-open \
        web-dev web-build web-deploy \
        fmt lint clean

# ── macOS App Store ────────────────────────────────────────────────────────

asmacos:
	./scripts/build-appstore.sh all

asmacos-build:
	./scripts/build-appstore.sh build

asmacos-sign:
	./scripts/build-appstore.sh sign

asmacos-upload:
	./scripts/build-appstore.sh upload

# ── iOS App Store ──────────────────────────────────────────────────────────

asios:
	./scripts/build-ios.sh all

asios-clean:
	./scripts/build-ios.sh clean

asios-init:
	./scripts/build-ios.sh init

asios-icons:
	./scripts/build-ios.sh icons

asios-override:
	./scripts/build-ios.sh override

asios-build:
	./scripts/build-ios.sh build

asios-upload:
	./scripts/build-ios.sh upload

# ── Android Play Store ─────────────────────────────────────────────────────

psmobile:
	./scripts/build-android.sh all
	open src-tauri/gen/android/app/build/outputs/bundle/universalRelease/

psmobile-clean:
	./scripts/build-android.sh clean

psmobile-init:
	./scripts/build-android.sh init

psmobile-icons:
	./scripts/build-android.sh icons

psmobile-override:
	./scripts/build-android.sh override

psmobile-keystore:
	./scripts/build-android.sh keystore

psmobile-build:
	./scripts/build-android.sh build

psmobile-open:
	open src-tauri/gen/android/app/build/outputs/bundle/universalRelease/

# ── Development ────────────────────────────────────────────────────────────

dev:
	pnpm tauri dev

build:
	pnpm tauri build

# ── Landing page (web) ─────────────────────────────────────────────────────
# web-dev     — run the Next.js landing page locally (http://localhost:3034)
# web-build   — production build (.next/standalone) for smbCloud nextjs-ssr
# web-deploy  — build + deploy to smbCloud via the smb CLI

web-dev:
	pnpm --filter @siti/web dev

web-build:
	pnpm --filter @siti/web build

web-deploy: web-build
	smb deploy

fmt:
	cargo fmt --manifest-path src-tauri/Cargo.toml --all

lint:
	cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
	pnpm tsc --noEmit

clean:
	cargo clean --manifest-path src-tauri/Cargo.toml
