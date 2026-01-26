# Local Update Testing (macOS, Squirrel.Mac)

This document describes the local update testing flow for Neovate Dev using
`electron-updater` + Squirrel.Mac and a local update server. It also covers the
required code-signing behavior for local updates.

## Why signing matters for local updates

Squirrel.Mac validates the signature of the downloaded update against the
installed app's code requirement. Gatekeeper bypasses (spctl/xattr) do not
affect this validation step. For local testing, the installed app and the update
must be signed with the same identity. A self-signed certificate is sufficient.

## Prerequisites

- macOS
- Bun installed (for the local update server)
- A stable codesign identity in Keychain (self-signed is OK)

## Create a self-signed codesign certificate

1. Open Keychain Access.
2. Certificate Assistant -> Create a Certificate...
3. Name: `Neovate Local Code Sign`
4. Certificate Type: Code Signing
5. Identity Type: Self Signed Root
6. Keychain: login
7. Finish

Optional: verify the identity appears in Keychain

```
security find-identity -v -p codesigning
```

## Environment variables used by packaging

- `LOCAL_UPDATE_SERVER`: set to `http://localhost:8080`
- `LOCAL_UPDATE_SIGN_IDENTITY`: the Keychain identity name

## Recommended workflow (scripted)

Run the script and follow prompts:

```
bash ./scripts/dev-app-update.sh
```

The script will:
1) Clean `release-dev` and updater caches
2) Build v0.1.0 with the chosen signing identity
3) Ask you to install the v0.1.0 dmg
4) Build v0.2.0 with the same identity
5) Start the local update server

When the app is running, trigger an update check and choose "Update now".

## Manual workflow (if you prefer)

```
# Build v0.1.0
sed -i '' 's/"version": "[^"]*"/"version": "0.1.0"/' package.json
LOCAL_UPDATE_SIGN_IDENTITY="Neovate Local Code Sign" \
LOCAL_UPDATE_SERVER=http://localhost:8080 \
npm run package:local

# Install release-dev/neovate-dev-arm64.dmg, then quit the app

# Build v0.2.0
sed -i '' 's/"version": "[^"]*"/"version": "0.2.0"/' package.json
LOCAL_UPDATE_SIGN_IDENTITY="Neovate Local Code Sign" \
LOCAL_UPDATE_SERVER=http://localhost:8080 \
npm run package:local

# Start update server
bun run scripts/update-server.ts
```

## Verify signing (recommended if updates fail)

```
codesign --verify --deep --strict "release-dev/mac-arm64/Neovate Dev.app"
```

If this fails, the update will fail too.

## Clear caches between attempts

```
rm -rf ~/Library/Caches/com.neovateai.desktop.dev.ShipIt
rm -rf ~/Library/Caches/neovate-code-desktop-updater
```

## Check the installed version

```
defaults read "/Applications/Neovate Dev.app/Contents/Info" CFBundleShortVersionString
```

## Common failures

- "code has no resources but signature indicates they must be present"
  - The app bundle is not properly signed. Rebuild using a stable identity and
    ensure `codesign --verify --deep --strict` passes.
- "code requirement not satisfied"
  - The update was signed with a different identity than the installed app.
    Rebuild both versions with the same identity and clear caches.
*** End Patch}"} } }<|commentary to=functions.apply_patch code|>{"command":"*** Begin Patch\n*** Add File: docs/agent/local-update-testing.md\n+# Local Update Testing (macOS, Squirrel.Mac)\n+\n+This document describes the local update testing flow for Neovate Dev using\n+`electron-updater` + Squirrel.Mac and a local update server. It also covers the\n+required code-signing behavior for local updates.\n+\n+## Why signing matters for local updates\n+\n+Squirrel.Mac validates the signature of the downloaded update against the\n+installed app's code requirement. Gatekeeper bypasses (spctl/xattr) do not\n+affect this validation step. For local testing, the installed app and the update\n+must be signed with the same identity. A self-signed certificate is sufficient.\n+\n+## Prerequisites\n+\n+- macOS\n+- Bun installed (for the local update server)\n+- A stable codesign identity in Keychain (self-signed is OK)\n+\n+## Create a self-signed codesign certificate\n+\n+1. Open Keychain Access.\n+2. Certificate Assistant -> Create a Certificate...\n+3. Name: `Neovate Local Code Sign`\n+4. Certificate Type: Code Signing\n+5. Identity Type: Self Signed Root\n+6. Keychain: login\n+7. Finish\n+\n+Optional: verify the identity appears in Keychain\n+\n+```\n+security find-identity -v -p codesigning\n+```\n+\n+## Environment variables used by packaging\n+\n+- `LOCAL_UPDATE_SERVER`: set to `http://localhost:8080`\n+- `BUILD_ENV=dev`: enables dev branding and output dir\n+- `LOCAL_UPDATE_SIGN_IDENTITY`: the Keychain identity name\n+\n+## Recommended workflow (scripted)\n+\n+Run the script and follow prompts:\n+\n+```\n+bash ./scripts/test-update.sh\n+```\n+\n+The script will:\n+1) Clean `release-dev` and updater caches\n+2) Build v0.1.0 with the chosen signing identity\n+3) Ask you to install the v0.1.0 dmg\n+4) Build v0.2.0 with the same identity\n+5) Start the local update server\n+\n+When the app is running, trigger an update check and choose \"Update now\".\n+\n+## Manual workflow (if you prefer)\n+\n+```\n+# Build v0.1.0\n+sed -i '' 's/\"version\": \"[^\"]*\"/\"version\": \"0.1.0\"/' package.json\n+LOCAL_UPDATE_SIGN_IDENTITY=\"Neovate Local Code Sign\" \\\n+LOCAL_UPDATE_SERVER=http://localhost:8080 BUILD_ENV=dev \\\n+npm run package:dev\n+\n+# Install release-dev/neovate-dev-arm64.dmg, then quit the app\n+\n+# Build v0.2.0\n+sed -i '' 's/\"version\": \"[^\"]*\"/\"version\": \"0.2.0\"/' package.json\n+LOCAL_UPDATE_SIGN_IDENTITY=\"Neovate Local Code Sign\" \\\n+LOCAL_UPDATE_SERVER=http://localhost:8080 BUILD_ENV=dev \\\n+npm run package:dev\n+\n+# Start update server\n+bun run scripts/update-server.ts\n+```\n+\n+## Verify signing (recommended if updates fail)\n+\n+```\n+codesign --verify --deep --strict \"release-dev/mac-arm64/Neovate Dev.app\"\n+```\n+\n+If this fails, the update will fail too.\n+\n+## Clear caches between attempts\n+\n+```\n+rm -rf ~/Library/Caches/com.neovateai.desktop.dev.ShipIt\n+rm -rf ~/Library/Caches/neovate-code-desktop-updater\n+```\n+\n+## Check the installed version\n+\n+```\n+defaults read \"/Applications/Neovate Dev.app/Contents/Info\" CFBundleShortVersionString\n+```\n+\n+## Common failures\n+\n+- \"code has no resources but signature indicates they must be present\"\n+  - The app bundle is not properly signed. Rebuild using a stable identity and\n+    ensure `codesign --verify --deep --strict` passes.\n+- \"code requirement not satisfied\"\n+  - The update was signed with a different identity than the installed app.\n+    Rebuild both versions with the same identity and clear caches.\n*** End Patch","workdir":"/Users/dinq/GitHub/neovateai/neovate-code-desktop"} }```ctx commentary to=functions.apply_patch code
