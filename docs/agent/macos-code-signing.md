# macOS Code Signing and Notarization Setup

This guide documents how to configure code signing and notarization for the Neovate desktop app using electron-builder.

## Prerequisites

1. **Apple Developer Account** (paid membership)
2. **Developer ID Application certificate** - for distributing outside Mac App Store
3. **App-Specific Password** - for notarization

## Step 1: Create Developer ID Application Certificate

1. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Click "+" to create a new certificate
3. Select **"Developer ID Application"**
4. Follow the instructions to create a Certificate Signing Request (CSR) using Keychain Access
5. Download the `.cer` file and double-click to install in Keychain

## Step 2: Install Intermediate Certificate

Your Developer ID certificate requires Apple's intermediate certificate to complete the chain of trust.

Check your certificate's issuer:

```bash
security find-certificate -c "Developer ID Application" -p | openssl x509 -noout -issuer
```

If the output shows `OU=G2`, download and install the G2 intermediate certificate:

```bash
# Download the G2 intermediate certificate
curl -O https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer

# Install it to your login keychain
security add-certificates DeveloperIDG2CA.cer

# Clean up
rm DeveloperIDG2CA.cer
```

For older certificates (non-G2), use:
- https://www.apple.com/certificateauthority/DeveloperIDCA.cer

## Step 3: Verify Certificate Installation

```bash
# List all valid codesigning identities
security find-identity -v -p codesigning
```

Expected output:
```
1) F2126F07551FA852E6E2C0CC1B3140D92B11F562 "Developer ID Application: Your Name (TEAM_ID)"
   1 valid identities found
```

## Step 4: Configure electron-builder

### Production Config (`configs/electron-builder.mjs`)

```javascript
mac: {
  icon: 'build/icons/icon.icns',
  category: 'public.app-category.developer-tools',
  hardenedRuntime: true,
  entitlements: 'build/entitlements.mac.plist',
  entitlementsInherit: 'build/entitlements.mac.plist',
  identity: "Developer ID Application: Your Name (TEAM_ID)",
  // notarize is enabled by default when env vars are set
}
```

### Development Config (`configs/electron-builder.dev.mjs`)

```javascript
mac: {
  ...baseConfig.mac,
  // Sign with ad-hoc identity for faster dev builds
  identity: null,
  // Skip notarization for dev builds
  notarize: false,
}
```

## Step 5: Create App-Specific Password for Notarization

1. Go to https://appleid.apple.com/account/manage
2. Sign in → **App-Specific Passwords** → Generate one
3. Name it "electron-notarize"
4. Save the generated password securely

## Step 6: Set Environment Variables for Notarization

Before building, set one of these credential combinations:

### Option 1: Apple ID (simplest)

```bash
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Option 2: API Key (recommended for CI/CD)

```bash
export APPLE_API_KEY="/path/to/AuthKey_XXXXXX.p8"
export APPLE_API_KEY_ID="XXXXXXXXXX"
export APPLE_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Option 3: Keychain Profile (convenient for local builds)

First, store credentials:

```bash
xcrun notarytool store-credentials "notarytool-profile" \
  --apple-id "your@email.com" \
  --team-id "XXXXXXXXXX" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

Then set:

```bash
export APPLE_KEYCHAIN="login.keychain-db"
export APPLE_KEYCHAIN_PROFILE="notarytool-profile"
```

## Step 7: Build

```bash
npm run package
```

## Troubleshooting

### Error: "unable to build chain to self-signed root"

**Cause:** Missing intermediate certificate or incorrect trust settings.

**Fix 1:** Install the intermediate certificate (see Step 2).

**Fix 2:** Reset certificate trust settings:

1. Open **Keychain Access**
2. Find your "Developer ID Application" certificate
3. Double-click → expand **Trust** section
4. Change "When using this certificate:" to **"Use System Defaults"**
5. Close and enter password to save

### Error: "errSecInternalComponent"

**Cause:** Often caused by manually setting "Always Trust" on the certificate.

**Fix:** Reset trust settings to "Use System Defaults" (see above).

### Error: "configuration.mac.notarize should be a boolean"

**Cause:** electron-builder v26+ changed the `notarize` API.

**Fix:** Use `notarize: true` or `notarize: false` (boolean only). Pass credentials via environment variables, not in the config.

### Verify codesign works manually

```bash
echo "test" > /tmp/testfile
codesign --sign "Developer ID Application: Your Name (TEAM_ID)" --force /tmp/testfile
```

If this succeeds, the certificate is correctly configured.

## GitHub Actions CI/CD Setup

To automate code signing and notarization in GitHub Actions:

### Step 1: Export Certificate as .p12

1. Open **Keychain Access**
2. Find **"Developer ID Application: Your Name (TEAM_ID)"**
3. Right-click → **Export...**
4. Save as `.p12` format
5. Set a strong password

### Step 2: Base64 Encode the Certificate

```bash
base64 -i /path/to/your-certificate.p12 | pbcopy
```

This copies the base64 string to your clipboard.

### Step 3: Add GitHub Repository Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Description |
|-------------|-------------|
| `CSC_LINK` | Base64-encoded .p12 certificate |
| `CSC_KEY_PASSWORD` | Password used when exporting .p12 |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from appleid.apple.com |
| `APPLE_TEAM_ID` | Your 10-character Team ID |

### Step 4: Workflow Configuration

See `.github/workflows/publish.yml` for the complete workflow. Key environment variables:

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  CSC_LINK: ${{ secrets.CSC_LINK }}
  CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
  APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

### Step 5: Trigger a Release

Create and push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow will build, sign, notarize, and publish to GitHub Releases.

## References

- [Apple Certificate Authority](https://www.apple.com/certificateauthority/)
- [electron-builder macOS Configuration](https://www.electron.build/mac)
- [electron-builder Code Signing](https://www.electron.build/code-signing)
- [Apple Notarization Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
