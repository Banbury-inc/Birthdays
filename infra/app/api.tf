locals {
  api_lambda_source_dir = "${path.module}/lambda"
  api_lambda_zip        = "${path.module}/.terraform/${var.project_name}-api.zip"
}

resource "random_password" "contact_hash_secret" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "contact_hash_secret" {
  name = "${var.project_name}/contact-hash-secret-${local.resource_suffix}"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "contact_hash_secret" {
  secret_id     = aws_secretsmanager_secret.contact_hash_secret.id
  secret_string = random_password.contact_hash_secret.result
}

data "archive_file" "api_lambda" {
  type        = "zip"
  source_dir  = local.api_lambda_source_dir
  output_path = local.api_lambda_zip
}

resource "aws_security_group" "api" {
  name        = "${var.project_name}-api"
  description = "Allow the Birthdays API Lambda to reach PostgreSQL."
  vpc_id      = aws_vpc.database.id
  tags        = merge(local.tags, { Name = "${var.project_name}-api" })
}

resource "aws_vpc_security_group_egress_rule" "api_all" {
  security_group_id = aws_security_group.api.id
  cidr_ipv4         = "0.0.0.0/0"
  description       = "Allow API outbound traffic."
  ip_protocol       = "-1"
}

resource "aws_vpc_security_group_ingress_rule" "database_api_postgres" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.api.id
  from_port                    = 5432
  ip_protocol                  = "tcp"
  to_port                      = 5432
  description                  = "PostgreSQL access from the API Lambda."
}

resource "aws_security_group" "secrets_endpoint" {
  name        = "${var.project_name}-secrets-endpoint"
  description = "Allow the API Lambda to read Secrets Manager through a VPC endpoint."
  vpc_id      = aws_vpc.database.id
  tags        = merge(local.tags, { Name = "${var.project_name}-secrets-endpoint" })
}

resource "aws_vpc_security_group_ingress_rule" "secrets_endpoint_api_https" {
  security_group_id            = aws_security_group.secrets_endpoint.id
  referenced_security_group_id = aws_security_group.api.id
  from_port                    = 443
  ip_protocol                  = "tcp"
  to_port                      = 443
  description                  = "HTTPS access from the API Lambda."
}

resource "aws_vpc_endpoint" "secretsmanager" {
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.secrets_endpoint.id]
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  subnet_ids          = aws_subnet.database_public[*].id
  tags                = local.tags
  vpc_endpoint_type   = "Interface"
  vpc_id              = aws_vpc.database.id
}

resource "aws_iam_role" "api_lambda" {
  name = "${var.project_name}-api-${local.resource_suffix}"
  tags = local.tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_lambda_basic" {
  role       = aws_iam_role.api_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "api_lambda_vpc" {
  role       = aws_iam_role.api_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "api_lambda_secrets" {
  name = "${var.project_name}-api-secrets"
  role = aws_iam_role.api_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Effect = "Allow"
        Resource = [
          aws_db_instance.database.master_user_secret[0].secret_arn,
          aws_secretsmanager_secret.contact_hash_secret.arn
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "api" {
  function_name    = "${var.project_name}-api-${local.resource_suffix}"
  filename         = data.archive_file.api_lambda.output_path
  handler          = "index.handler"
  layers           = var.lambda_pg_layer_arn == "" ? [] : [var.lambda_pg_layer_arn]
  role             = aws_iam_role.api_lambda.arn
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  timeout          = 15
  tags             = local.tags

  environment {
    variables = {
      ALLOWED_ORIGINS         = join(",", var.api_allowed_origins)
      CONTACT_HASH_SECRET_ARN = aws_secretsmanager_secret.contact_hash_secret.arn
      DATABASE_HOST           = aws_db_instance.database.address
      DATABASE_NAME           = aws_db_instance.database.db_name
      DATABASE_PORT           = tostring(aws_db_instance.database.port)
      DATABASE_SECRET_ARN     = aws_db_instance.database.master_user_secret[0].secret_arn
    }
  }

  vpc_config {
    security_group_ids = [aws_security_group.api.id]
    subnet_ids         = aws_subnet.database_public[*].id
  }
}

resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-api-${local.resource_suffix}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["authorization", "content-type"]
    allow_methods = ["GET", "POST", "PUT", "OPTIONS"]
    allow_origins = var.api_allowed_origins
    max_age       = 3600
  }

  tags = local.tags
}

resource "aws_apigatewayv2_authorizer" "api" {
  api_id           = aws_apigatewayv2_api.api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project_name}-cognito"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.app.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.users.id}"
  }
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_method     = "POST"
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api" {
  for_each = toset([
    "GET /me",
    "PUT /me",
    "POST /contacts/sync",
    "GET /contacts/matches"
  ])

  api_id             = aws_apigatewayv2_api.api.id
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.api.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "api" {
  api_id      = aws_apigatewayv2_api.api.id
  auto_deploy = true
  name        = "$default"
  tags        = local.tags
}

resource "aws_lambda_permission" "api_gateway" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
