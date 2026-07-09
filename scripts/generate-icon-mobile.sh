#!/usr/bin/env bash

# This command should be run after the cargo tauri ios init.
#
# Generate icons for mobile platforms from the source artwork. The no-alpha
# version is used for iOS. Update the source path below if you change the
# artwork location.
cargo tauri icon assets/app-icon.png

# Restore the icons directory to its original state, keeping the freshly
# generated .icns for desktop builds.
git restore 'src-tauri/icons/*' ':(exclude)src-tauri/icons/*.icns'
