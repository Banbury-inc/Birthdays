variable "project_name" {
  description = "Project name used to prefix application resources."
  type        = string
  default     = "birthdays"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "project_name must contain only lowercase letters, numbers, and dashes."
  }
}

variable "aws_region" {
  description = "AWS region for the static site S3 bucket."
  type        = string
  default     = "us-east-1"
}

variable "resource_suffix" {
  description = "Optional suffix for globally unique resource names. A random suffix is generated when empty."
  type        = string
  default     = ""
}

variable "site_bucket_name" {
  description = "Optional explicit S3 bucket name for built frontend assets."
  type        = string
  default     = null
}

variable "price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "database_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "birthdays"

  validation {
    condition     = can(regex("^[A-Za-z][A-Za-z0-9_]*$", var.database_name))
    error_message = "database_name must start with a letter and contain only letters, numbers, and underscores."
  }
}

variable "database_username" {
  description = "PostgreSQL master username. The password is managed by AWS Secrets Manager."
  type        = string
  default     = "birthdays_admin"

  validation {
    condition     = can(regex("^[A-Za-z][A-Za-z0-9_]*$", var.database_username)) && var.database_username != "rdsadmin"
    error_message = "database_username must start with a letter, contain only letters, numbers, and underscores, and cannot be rdsadmin."
  }
}

variable "database_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to PostgreSQL. Use a narrow /32 for public development access."
  type        = list(string)

  validation {
    condition     = alltrue([for cidr_block in var.database_allowed_cidr_blocks : can(cidrhost(cidr_block, 0))])
    error_message = "database_allowed_cidr_blocks must contain valid CIDR blocks."
  }
}

variable "database_vpc_cidr" {
  description = "CIDR block for the database VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "database_engine_version" {
  description = "PostgreSQL engine major version."
  type        = string
  default     = "16"
}

variable "database_instance_class" {
  description = "RDS instance class for PostgreSQL."
  type        = string
  default     = "db.t4g.micro"
}

variable "database_allocated_storage" {
  description = "Allocated database storage in GiB."
  type        = number
  default     = 20
}

variable "database_backup_retention_days" {
  description = "Number of days to retain automated database backups."
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags to apply to application resources."
  type        = map(string)
  default     = {}
}
