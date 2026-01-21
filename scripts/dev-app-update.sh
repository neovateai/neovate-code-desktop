#!/bin/bash
set -e

COLOR_STEP="\033[1;34m"
COLOR_RESET="\033[0m"
step() {
  printf "%b%s%b\n" "${COLOR_STEP}" "$1" "${COLOR_RESET}"
}

cd "$(dirname "$0")/.."

step "=== Local Update Test (Dev) ==="
echo ""
echo "This script will:"
echo "1) Build and install v0.1.0"
echo "2) Build v0.2.0 update artifacts"
echo "3) Start local update server"
echo ""
echo "Make sure you close any running Neovate Dev app before starting."
echo ""
echo "Squirrel.Mac requires the update to be signed by the same identity"
echo "as the installed app. Use a stable codesign identity (self-signed is OK)."
echo ""
DEFAULT_SIGN_IDENTITY="Neovate Local Code Sign"
read -p "Codesign identity name (default: ${DEFAULT_SIGN_IDENTITY}): " LOCAL_UPDATE_SIGN_IDENTITY
LOCAL_UPDATE_SIGN_IDENTITY=${LOCAL_UPDATE_SIGN_IDENTITY:-"${DEFAULT_SIGN_IDENTITY}"}
export LOCAL_UPDATE_SIGN_IDENTITY
echo "Using codesign identity: ${LOCAL_UPDATE_SIGN_IDENTITY}"
echo ""
# Note: Squirrel.Mac still validates update signatures even if Gatekeeper is bypassed.
echo ""
# if ! security find-identity -v -p codesigning | grep -Fq "${LOCAL_UPDATE_SIGN_IDENTITY}"; then
#   echo "Error: codesign identity not found: ${LOCAL_UPDATE_SIGN_IDENTITY}"
#   echo ""
#   echo "Create a self-signed Code Signing certificate:"
#   echo "1) Open Keychain Access"
#   echo "2) Certificate Assistant -> Create a Certificate..."
#   echo "3) Name: ${DEFAULT_SIGN_IDENTITY}"
#   echo "4) Check: Let me override defaults"
#   echo "5) Certificate Type: Code Signing"
#   echo "6) Identity Type: Self Signed Root"
#   echo "7) Key Pair: 2048-bit RSA"
#   echo "8) Key Usage: check Sign only (no encryption/auth options)"
#   echo "9) Extended Key Usage: check Code Signing only (no email/SSL options)"
#   echo "10) Basic Constraints: leave unchecked"
#   echo "11) Subject Alternative Name: leave unchecked"
#   echo "12) Keychain: login"
#   echo ""
#   echo "After creating the certificate, rerun this script."
#   exit 1
# fi
# echo "Codesign identity verified."
# echo ""
echo "Note: The same identity must be used for BOTH v0.1.0 and v0.2.0 builds."
echo "If you change it between builds, Squirrel.Mac will reject the update."
echo ""
echo "Press Enter to continue..."
read

step "=== Step -1: Uninstall app (clean) ==="
echo "This will remove:"
echo "- /Applications/Neovate Dev.app"
echo "- ~/Applications/Neovate Dev.app"
echo "- ~/Library/Application Support/Neovate Dev"
echo "- ~/Library/Preferences/com.neovateai.desktop.dev.plist"
echo "- ~/Library/Saved Application State/com.neovateai.desktop.dev.savedState"
echo "- ~/Library/Logs/Neovate Dev"
read -p "Proceed with uninstall? (y/N): " CONFIRM_UNINSTALL
if [[ "${CONFIRM_UNINSTALL}" == "y" || "${CONFIRM_UNINSTALL}" == "Y" ]]; then
  rm -rf "/Applications/Neovate Dev.app"
  rm -rf "${HOME}/Applications/Neovate Dev.app"
  rm -rf "${HOME}/Library/Application Support/Neovate Dev"
  rm -rf "${HOME}/Library/Preferences/com.neovateai.desktop.dev.plist"
  rm -rf "${HOME}/Library/Saved Application State/com.neovateai.desktop.dev.savedState"
  rm -rf "${HOME}/Library/Logs/Neovate Dev"
  echo "Uninstall complete."
else
  echo "Skipped uninstall."
fi

step "=== Step 0: Clean up ==="
rm -rf release-dev
rm -rf ~/Library/Caches/com.neovateai.desktop.dev.ShipIt
rm -rf ~/Library/Caches/neovate-code-desktop-updater
echo "Cleaned build output and updater caches"

echo ""
step "=== Step 1: Build v0.1.0 ==="
# Set version to 0.1.0
sed -i '' 's/"version": "[^"]*"/"version": "0.1.0"/' package.json
echo "Version set to 0.1.0"

# Build with the provided codesign identity
LOCAL_UPDATE_SERVER=http://localhost:8080 npm run package:local
echo "Opening release-dev..."
open release-dev

echo ""
step "=== Step 2: Install v0.1.0 ==="
echo "Please install: release-dev/neovate-dev-arm64.dmg"
echo "After install, launch Neovate Dev once to confirm it opens, then quit it."
echo "Press Enter when done..."
read

echo ""
step "=== Step 3: Build v0.2.0 ==="
# Set version to 0.2.0
sed -i '' 's/"version": "[^"]*"/"version": "0.2.0"/' package.json
echo "Version set to 0.2.0"

# Build with the same codesign identity
LOCAL_UPDATE_SERVER=http://localhost:8080 npm run package:local

echo ""
step "=== Step 4: Start update server ==="
echo "Starting update server at http://localhost:8080"
echo "Press Ctrl+C to stop when done testing"
echo ""
echo "Starting the installed Neovate Dev (v0.1.0) to test updates!"
echo "In the app: trigger update check and click 'Update now'."
echo ""
echo "If the update fails due to code signature, re-run package:local with the same identity."
echo ""

bun run scripts/dev-app-update-server.ts &
SERVER_PID=$!
sleep 1
open -a "Neovate Dev"
wait $SERVER_PID

echo ""
read -p "Press Enter to verify installed version... " _
EXPECTED_VERSION=$(node -p "require('./package.json').version")
INSTALLED_VERSION=$(defaults read "/Applications/Neovate Dev.app/Contents/Info" CFBundleShortVersionString 2>/dev/null || true)
if [[ -z "${INSTALLED_VERSION}" ]]; then
  echo "Unable to read installed version from /Applications/Neovate Dev.app"
elif [[ "${INSTALLED_VERSION}" == "${EXPECTED_VERSION}" ]]; then
  echo "Version check OK: ${INSTALLED_VERSION}"
else
  echo "Version check failed: expected ${EXPECTED_VERSION}, got ${INSTALLED_VERSION}"
fi
