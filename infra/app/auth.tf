resource "aws_iam_role" "cognito_sms" {
  name = "${var.project_name}-cognito-sms-${local.resource_suffix}"
  tags = local.tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cognito-idp.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "cognito_sms" {
  name = "${var.project_name}-cognito-sms"
  role = aws_iam_role.cognito_sms.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = "sns:Publish"
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_cognito_user_pool" "users" {
  name = "${var.project_name}-users-${local.resource_suffix}"

  auto_verified_attributes = ["phone_number"]
  mfa_configuration        = "OFF"
  username_attributes      = ["phone_number"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 1
    }
  }

  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD", "SMS_OTP"]
  }

  sms_configuration {
    external_id    = "${var.project_name}-${local.resource_suffix}"
    sns_caller_arn = aws_iam_role.cognito_sms.arn
    sns_region     = var.aws_region
  }

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["phone_number"]
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    sms_message          = "Your Birthdays code is {####}"
  }

  tags = local.tags
}

resource "aws_cognito_user_pool_client" "app" {
  name         = "${var.project_name}-app"
  user_pool_id = aws_cognito_user_pool.users.id

  access_token_validity         = 60
  auth_session_validity         = 3
  enable_token_revocation       = true
  explicit_auth_flows           = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_AUTH"]
  id_token_validity             = 60
  prevent_user_existence_errors = "LEGACY"
  refresh_token_validity        = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}
