# Birthdays

An iPhone-first birthday reminder app starter built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.

## What is included

- Mobile-first app shell sized for an iPhone viewport
- Capacitor 8 iOS shell with `@capgo/capacitor-contacts` (Swift PM aligned with core) and Contacts usage copy
- Twilio Verify phone-number sign-in through the protected API infrastructure
- PostgreSQL migration for phone-number profiles and contact matching
- shadcn/ui configured with the Nova preset and Radix primitives
- Phone login, birthday onboarding, contacts sync, and matched birthdays screens
- TypeScript path aliases through `@/*`

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run cap:sync
npm run ios
```


## Environment

Copy `.env.example` to `.env.local` and fill the values from Terraform outputs:

```bash
VITE_API_BASE_URL=
VITE_DEFAULT_COUNTRY=US
```

After `terraform apply` completes in `infra/app`, you can fill the local values with:

```bash
VITE_API_BASE_URL=$(terraform -chdir=infra/app output -raw api_url)
VITE_DEFAULT_COUNTRY=US
```

Phone login uses Twilio Verify. The frontend calls the Birthdays API, and the API Lambda talks to Twilio with server-side credentials. Set these GitHub Actions secrets before deploying:

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

The API Lambda expects the `pg` package to be available at runtime. Provide it with a Lambda layer through `lambda_pg_layer_arn` or bundle `infra/app/lambda/package.json` dependencies into the function artifact in your deployment pipeline.

## Infrastructure

Terraform configuration lives in `infra/` and deploys the app as a private S3 static site served by CloudFront, with an AWS-hosted PostgreSQL database.

Start with the one-time remote state bootstrap, then initialize and apply the app stack:

```bash
cd infra/bootstrap
terraform init
terraform apply

cd ../app
terraform init -backend-config=backend.hcl
terraform apply
```

See `infra/README.md` for the full setup and deployment workflow.

GitHub Actions deploys automatically to AWS when changes are pushed to `main`, including merges from pull requests.

## iOS App Store releases

GitHub Actions also includes an iOS release workflow at `.github/workflows/ios-app-store.yml`. It runs on pushes to `main` and can be started manually with `workflow_dispatch`.

The workflow builds the Vite app, syncs Capacitor into `ios/`, archives the Xcode project with Fastlane, uploads the IPA to App Store Connect, and submits the version for App Store review. Approved builds are configured for manual release, not automatic public release.

Set these GitHub Actions secrets before enabling the workflow:

```bash
APP_STORE_CONNECT_API_KEY_BASE64=
APP_STORE_CONNECT_ISSUER_ID=
APP_STORE_CONNECT_KEY_ID=
APP_REVIEW_EMAIL=
```

The workflow also accepts Fastlane-style App Store Connect API key secrets:

```bash
APP_STORE_CONNECT_API_KEY_KEY=
APP_STORE_CONNECT_API_KEY_ISSUER_ID=
APP_STORE_CONNECT_API_KEY_KEY_ID=
```

For signing, provide manual signing assets (no match repo):

```bash
IOS_DISTRIBUTION_CERTIFICATE_BASE64=
IOS_DISTRIBUTION_CERTIFICATE_PASSWORD=
IOS_PROVISIONING_PROFILE_BASE64=
IOS_KEYCHAIN_PASSWORD=
```

When using manual profiles, set **`IOS_PROVISIONING_PROFILE_SPECIFIER`** to the **exact provisioning profile name** shown in Xcode (Signing & Capabilities) or the Apple Developer portal (must match the embedded name in the `.mobileprovision`).

Do not set `MATCH_GIT_URL` when using manual signing. If `MATCH_GIT_URL` is set, the workflow uses Fastlane match instead.

Set these repository variables:

```bash
APPLE_TEAM_ID=
APP_STORE_CONNECT_TEAM_ID=
APP_STORE_APPLE_ID=
VITE_API_BASE_URL=
VITE_DEFAULT_COUNTRY=US
IOS_PROVISIONING_PROFILE_SPECIFIER=
```

Optional variables include `APP_STORE_SKU`, `APP_STORE_COMPANY_NAME`, `APP_STORE_CONNECT_CREATE_APP`, `FASTLANE_SKIP_SCREENSHOTS`, `MATCH_GIT_URL` (only when using Fastlane match), and the `APP_REVIEW_*` contact fields. If `com.banbury.birthdays` already exists in App Store Connect, each `main` merge submits a new version using the version from `package.json` and the next TestFlight build number.

First-time App Store submissions still require complete App Store Connect setup, including app privacy answers, age rating verification, pricing/availability, screenshots, support URL, and privacy policy URL. See `ios/fastlane/README.md` for the release lane details.

## Adding shadcn components

Add more UI primitives with:

```bash
npx shadcn@latest add <component>
```
