<#
.SYNOPSIS
  Pack the built Windows app into an MSIX for Microsoft Store submission.

.DESCRIPTION
  Runs after `pnpm tauri build -c src-tauri/tauri.prod-windows-microsoftstore.conf.json`.
  Tauri emits an .exe plus .msi/.exe installers; this assembles a full-trust
  MSIX layout around the raw .exe and calls makeappx.

  The MSIX is the Store artifact. The .msi/.exe stay useful for direct
  download, but a Store MSI/EXE submission gets no package identity, so
  in-app purchase only works from this MSIX.

  Leave the package unsigned for Partner Center — the Store re-signs it with
  the publisher certificate. Sign it locally only to sideload for testing.

.PARAMETER IdentityName
  Package/Identity/@Name from Partner Center (Product identity page),
  e.g. "SplitfireAB.SitiAI". Defaults to $env:MSIX_IDENTITY_NAME.

.PARAMETER Publisher
  Package/Identity/@Publisher from Partner Center, the full subject string,
  e.g. "CN=1234ABCD-....". Defaults to $env:MSIX_PUBLISHER.

.PARAMETER Version
  Four-part version. The Store requires the revision (fourth) part to be 0.
  Defaults to the version in tauri.prod-windows-microsoftstore.conf.json.

.PARAMETER ValidateOnly
  Check the manifest against makeappx's schema using stub payload files,
  without needing a real build. Manifest schema errors are otherwise only
  discovered after the ~50-minute Rust build, so CI runs this first to fail
  in seconds instead.
#>
[CmdletBinding()]
param(
  [string]$IdentityName = $env:MSIX_IDENTITY_NAME,
  [string]$Publisher = $env:MSIX_PUBLISHER,
  [string]$Version,
  [string]$Configuration = "release",
  [switch]$ValidateOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$tauriDir = Join-Path $repoRoot "src-tauri"
$confPath = Join-Path $tauriDir "tauri.prod-windows-microsoftstore.conf.json"
$conf = Get-Content $confPath -Raw | ConvertFrom-Json
$productName = $conf.productName

# Cargo names the raw binary in target/release/ after Cargo.toml's [package]
# name, NOT tauri.conf.json's productName — that friendly name only gets
# applied to the bundled .msi/.exe Tauri's bundler produces afterwards. Read
# it from Cargo.toml directly rather than hardcoding, since it's the actual
# source of truth for what cargo build emits.
$cargoTomlPath = Join-Path $tauriDir "Cargo.toml"
$cargoNameLine = Select-String -Path $cargoTomlPath -Pattern '^\s*name\s*=\s*"([^"]+)"' | Select-Object -First 1
if (-not $cargoNameLine) {
  throw "Could not find [package] name in $cargoTomlPath."
}
$cargoBinName = $cargoNameLine.Matches[0].Groups[1].Value

if (-not $IdentityName) {
  throw "IdentityName is required. Pass -IdentityName or set MSIX_IDENTITY_NAME. Find it in Partner Center under Product identity."
}
if (-not $Publisher) {
  throw "Publisher is required. Pass -Publisher or set MSIX_PUBLISHER. It is the full 'CN=...' string from Partner Center, not the display name."
}

if (-not $Version) {
  # tauri.conf.json carries a three-part version; MSIX wants four parts with a
  # trailing 0, since the Store reserves the revision part for itself.
  $Version = "$($conf.version).0"
}
if ($Version -notmatch '^\d+\.\d+\.\d+\.0$') {
  throw "Version must be four parts ending in 0 (got '$Version'). The Microsoft Store rejects packages whose revision part is non-zero."
}

$targetDir = Join-Path $tauriDir "target\$Configuration"
$exePath = Join-Path $targetDir "$cargoBinName.exe"
if (-not $ValidateOnly -and -not (Test-Path $exePath)) {
  throw "Built executable not found at $exePath. Run 'pnpm tauri build -c src-tauri/tauri.prod-windows-microsoftstore.conf.json' first."
}

$layoutDir = Join-Path $targetDir "msix-layout"
$assetsDir = Join-Path $layoutDir "Assets"
if (Test-Path $layoutDir) { Remove-Item $layoutDir -Recurse -Force }
New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null

# Renamed to the friendly name here (not $cargoBinName) so it matches the
# Executable= attribute AppxManifest.xml already declares — the source
# filename and the packaged filename don't have to match.
if ($ValidateOnly) {
  # A stub stands in for the real binary: makeappx validates the manifest
  # against its schema regardless of what the payload files actually contain,
  # which is the whole point of running this before the build.
  Set-Content (Join-Path $layoutDir "$productName.exe") "stub" -Encoding ASCII
} else {
  Copy-Item $exePath (Join-Path $layoutDir "$productName.exe")
}

# Tauri's WebView2 install modes are installer-only concepts; an MSIX cannot
# run a bootstrapper, so the package relies on the Evergreen WebView2 runtime
# that ships with Windows 11 and is serviced onto Windows 10. Any WebView2
# loader emitted next to the .exe still needs to travel with it.
Get-ChildItem $targetDir -Filter "WebView2Loader.dll" -ErrorAction SilentlyContinue |
  ForEach-Object { Copy-Item $_.FullName $layoutDir }

# Exactly the logos AppxManifest.xml references.
$logos = @(
  "Square44x44Logo.png",
  "Square71x71Logo.png",
  "Square150x150Logo.png",
  "StoreLogo.png"
)
foreach ($logo in $logos) {
  $source = Join-Path $tauriDir "icons\$logo"
  if (-not (Test-Path $source)) {
    throw "Missing icon $source. Regenerate the Windows icon set with 'pnpm tauri icon'."
  }
  Copy-Item $source (Join-Path $assetsDir $logo)
}

$manifest = Get-Content (Join-Path $tauriDir "msix\AppxManifest.xml") -Raw
$manifest = $manifest.Replace("__IDENTITY_NAME__", $IdentityName)
$manifest = $manifest.Replace("__PUBLISHER__", $Publisher)
$manifest = $manifest.Replace("__VERSION__", $Version)
Set-Content (Join-Path $layoutDir "AppxManifest.xml") $manifest -Encoding UTF8

$makeappx = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter "makeappx.exe" -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match "x64" } |
  Sort-Object FullName -Descending |
  Select-Object -First 1
if (-not $makeappx) {
  throw "makeappx.exe not found. Install the Windows 10/11 SDK."
}

$outputDir = Join-Path $targetDir "bundle\msix"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
$msixPath = Join-Path $outputDir "$productName-$Version.msix"
if (Test-Path $msixPath) { Remove-Item $msixPath -Force }

& $makeappx.FullName pack /d $layoutDir /p $msixPath /o
if ($LASTEXITCODE -ne 0) {
  throw "makeappx pack failed with exit code $LASTEXITCODE"
}

if ($ValidateOnly) {
  # Throw the stub package away — it contains a 4-byte "exe" and would be
  # actively dangerous to mistake for a real artifact later in the job.
  Remove-Item $msixPath -Force
  Remove-Item $layoutDir -Recurse -Force
  Write-Host "AppxManifest.xml passed makeappx schema validation."
} else {
  Write-Host "MSIX written to $msixPath"
}
