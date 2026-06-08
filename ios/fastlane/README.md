# iOS Release Automation

The `ios release` lane builds `com.banbury.birthdays`, uploads the IPA to App Store Connect, and submits the version for App Store review.

App Store Connect authentication accepts either these environment variables:

```bash
APP_STORE_CONNECT_API_KEY_BASE64=
APP_STORE_CONNECT_ISSUER_ID=
APP_STORE_CONNECT_KEY_ID=
```

Or Fastlane-style names:

```bash
APP_STORE_CONNECT_API_KEY_KEY=
APP_STORE_CONNECT_API_KEY_ISSUER_ID=
APP_STORE_CONNECT_API_KEY_KEY_ID=
```

## Normal Release Flow

1. Push or merge to `main`.
2. GitHub Actions runs `.github/workflows/ios-app-store.yml` on `macos-latest`.
3. The workflow runs `npm ci`, `npm run build`, and `npx cap sync ios`.
4. Fastlane sets the Xcode marketing version from `package.json`, increments the build number from the latest TestFlight build, archives the app, uploads it, and submits it for review.

The lane sets `automatic_release: false`, so Apple approval does not immediately publish the app to all users.

## App Store Connect

Existing app records are discovered by bundle ID: `com.banbury.birthdays`.

If the app record does not exist, set these variables to let the lane attempt creation:

```bash
APP_STORE_CONNECT_CREATE_APP=true
APP_STORE_COMPANY_NAME=
APP_STORE_SKU=birthdays-ios
APP_STORE_PRIMARY_LOCALE=en-US
```

Fastlane can find existing apps with App Store Connect API-key auth. First-time app creation can still require manual App Store Connect setup or an Apple ID session, depending on Apple's current API support and account state.

## Signing

Preferred signing uses Fastlane match:

```bash
MATCH_GIT_URL=
MATCH_GIT_BRANCH=main
MATCH_PASSWORD=
MATCH_GIT_BASIC_AUTHORIZATION=
```

If `MATCH_GIT_URL` is not set, the lane uses **manual** signing. You must set **`IOS_PROVISIONING_PROFILE_SPECIFIER`** to the App Store profile’s **name** (the string Xcode shows for the provisioning profile, not the UUID). The GitHub workflow can install a base64-encoded `.p12` and `.mobileprovision` from secrets; the profile is copied into `~/Library/MobileDevice/Provisioning Profiles/` using its UUID filename so Xcode can resolve it.

The lane sets the `App` target to **Apple Distribution**, manual signing, that profile, and passes the same mapping to `gym`’s `export_options.provisioningProfiles` for the archive/export step.

## Metadata

Metadata lives in `metadata/en-US`. Replace the placeholder support, marketing, and privacy URLs before the first App Store review. The workflow skips screenshot upload by default through `FASTLANE_SKIP_SCREENSHOTS=true`; set it to `false` after adding screenshots to `screenshots/`.

App privacy answers, pricing, availability, and any account-specific compliance prompts must still be completed in App Store Connect before Apple can approve the first release.
