# Terraform Infrastructure

This Terraform configuration deploys the Birthdays Vite app as a private S3 static site served through CloudFront, with an AWS-hosted PostgreSQL database.

## Layout

- `bootstrap/` creates the S3 bucket used for Terraform remote state.
- `app/` creates the static site bucket, CloudFront Origin Access Control, CloudFront distribution, and RDS PostgreSQL database.

## Prerequisites

- Terraform `>= 1.10.0`
- AWS CLI credentials with permission to manage S3, IAM-style bucket policies, CloudFront, VPC networking, Security Groups, RDS, and Secrets Manager
- An AWS region for the buckets and database, defaulting to `us-east-1`

## 1. Bootstrap Remote State

The state bucket cannot be used until it exists, so apply the bootstrap stack with local state first.

```bash
cd infra/bootstrap
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

After apply, inspect the backend values:

```bash
terraform output backend_config
```

Copy those values into `infra/app/backend.hcl`. Start from the example:

```bash
cd ../app
cp backend.hcl.example backend.hcl
```

`backend.hcl` is intentionally ignored by git because it is environment-specific.

## 2. Provision Static Hosting

Initialize the app stack with the remote backend, then apply it.

```bash
cd infra/app
cp terraform.tfvars.example terraform.tfvars
terraform init -backend-config=backend.hcl
terraform apply
```

Before applying, replace `database_allowed_cidr_blocks` in `terraform.tfvars` with your current public IP as a `/32`.

Terraform will output:

- `site_bucket_name`
- `cloudfront_distribution_id`
- `cloudfront_domain_name`
- `site_url`
- `api_url`
- `database_endpoint`
- `database_name`
- `database_username`
- `database_master_user_secret_arn`

Use `api_url` as the matching `VITE_API_BASE_URL` value for local development. GitHub Actions reads this output after Terraform apply and passes it into the Vite build automatically.

Phone login uses Twilio Verify. Terraform stores the Twilio credentials in AWS Secrets Manager for the API Lambda. Provide these sensitive variables when applying `infra/app`:

```bash
TF_VAR_twilio_account_sid=
TF_VAR_twilio_auth_token=
TF_VAR_twilio_verify_service_sid=
```

The API Lambda runs in private subnets with NAT access so it can reach Twilio over HTTPS while still connecting to PostgreSQL.

The database password is generated and stored by AWS Secrets Manager. Retrieve it with:

```bash
aws secretsmanager get-secret-value \
  --secret-id "$(terraform -chdir=infra/app output -raw database_master_user_secret_arn)" \
  --query SecretString \
  --output text
```

## 3. Deploy Built Assets

Build the app, sync the generated `dist/` directory to the site bucket, then invalidate CloudFront.

```bash
npm run build
aws s3 sync dist "s3://$(terraform -chdir=infra/app output -raw site_bucket_name)" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(terraform -chdir=infra/app output -raw cloudfront_distribution_id)" \
  --paths "/*"
```

## GitHub Actions Deployments

The workflow in `.github/workflows/deploy.yml` runs on pushes to `main` and manual `workflow_dispatch` runs.

On each deployment it:

- Assumes an AWS IAM role through GitHub OIDC.
- Initializes Terraform with the S3 remote backend.
- Runs `terraform fmt -check`, `terraform validate`, and `terraform apply -auto-approve`.
- Installs dependencies with `npm ci`.
- Reads the Terraform API URL output.
- Builds the Vite app with the API URL as a `VITE_` environment variable.
- Syncs `dist/` to the Terraform-managed S3 site bucket.
- Invalidates the Terraform-managed CloudFront distribution.

Before the workflow can run, apply `infra/bootstrap` once so the remote state bucket exists. Then create these GitHub repository variables:

| Variable | Example | Purpose |
| --- | --- | --- |
| `AWS_ROLE_TO_ASSUME` | `arn:aws:iam::123456789012:role/github-birthdays-deploy` | IAM role GitHub Actions assumes through OIDC. |
| `AWS_REGION` | `us-east-1` | AWS region for Terraform and AWS CLI commands. |
| `TF_STATE_BUCKET` | `birthdays-terraform-state-abcd1234` | S3 bucket created by `infra/bootstrap`. |
| `TF_STATE_KEY` | `birthdays/app/terraform.tfstate` | S3 object key for the app stack state. |
| `DATABASE_ALLOWED_CIDR_BLOCKS` | `["198.51.100.25/32"]` | CIDR allowlist for public PostgreSQL access. |

Create these GitHub repository secrets for Twilio Verify:

| Secret | Purpose |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID used by the API Lambda. |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token used by the API Lambda. |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID that sends login codes. |

The AWS role should trust `token.actions.githubusercontent.com` and be scoped to this repository. It needs permissions for Terraform to manage the resources in `infra/app`, plus S3 object uploads and CloudFront invalidations for deployments.

## Notes

- The app bucket is private. CloudFront reads it through Origin Access Control.
- The PostgreSQL database is publicly reachable for development, but only from the CIDR blocks in `database_allowed_cidr_blocks`.
- Do not connect to PostgreSQL directly from the browser app. Use these database outputs from a backend/API when one is added.
- Terraform state locking uses the S3 backend `use_lockfile` setting instead of DynamoDB.
- Unknown SPA routes fall back to `/index.html` for `403` and `404` responses.
- Custom domains are not configured yet. The site is available at the `site_url` output.
- The bootstrap S3 bucket uses `prevent_destroy` to reduce accidental deletion risk.
