# Birthdays

An iPhone-first birthday reminder app starter built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.

## What is included

- Mobile-first app shell sized for an iPhone viewport
- Capacitor configuration for an iPhone app shell with Contacts permission copy
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

## Adding shadcn components

Add more UI primitives with:

```bash
npx shadcn@latest add <component>
```
