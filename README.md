# Birthdays

An iPhone-first birthday reminder app starter built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.

## What is included

- Mobile-first app shell sized for an iPhone viewport
- shadcn/ui configured with the Nova preset and Radix primitives
- Starter birthday dashboard using Button, Card, Badge, and Avatar components
- TypeScript path aliases through `@/*`

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
```

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

## Adding shadcn components

Add more UI primitives with:

```bash
npx shadcn@latest add <component>
```
