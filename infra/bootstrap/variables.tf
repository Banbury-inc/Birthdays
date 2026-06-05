variable "project_name" {
  description = "Project name used to prefix Terraform state resources."
  type        = string
  default     = "birthdays"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "project_name must contain only lowercase letters, numbers, and dashes."
  }
}

variable "aws_region" {
  description = "AWS region for the remote state resources."
  type        = string
  default     = "us-east-1"
}

variable "resource_suffix" {
  description = "Optional suffix for globally unique resource names. A random suffix is generated when empty."
  type        = string
  default     = ""
}

variable "state_bucket_name" {
  description = "Optional explicit S3 bucket name for Terraform remote state."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to bootstrap resources."
  type        = map(string)
  default     = {}
}
