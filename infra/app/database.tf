data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  database_azs        = slice(data.aws_availability_zones.available.names, 0, 2)
  database_identifier = "${var.project_name}-postgres-${local.resource_suffix}"
}

resource "aws_vpc" "database" {
  cidr_block           = var.database_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = merge(local.tags, { Name = "${var.project_name}-database-vpc" })
}

resource "aws_internet_gateway" "database" {
  vpc_id = aws_vpc.database.id
  tags   = merge(local.tags, { Name = "${var.project_name}-database-igw" })
}

resource "aws_subnet" "database_public" {
  count = length(local.database_azs)

  vpc_id                  = aws_vpc.database.id
  cidr_block              = cidrsubnet(var.database_vpc_cidr, 8, count.index)
  availability_zone       = local.database_azs[count.index]
  map_public_ip_on_launch = true
  tags                    = merge(local.tags, { Name = "${var.project_name}-database-public-${count.index + 1}" })
}

resource "aws_route_table" "database_public" {
  vpc_id = aws_vpc.database.id
  tags   = merge(local.tags, { Name = "${var.project_name}-database-public" })
}

resource "aws_route" "database_public_internet" {
  route_table_id         = aws_route_table.database_public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.database.id
}

resource "aws_route_table_association" "database_public" {
  count = length(aws_subnet.database_public)

  subnet_id      = aws_subnet.database_public[count.index].id
  route_table_id = aws_route_table.database_public.id
}

resource "aws_security_group" "database" {
  name        = "${var.project_name}-postgres"
  description = "Allow PostgreSQL access from approved development CIDR blocks."
  vpc_id      = aws_vpc.database.id
  tags        = merge(local.tags, { Name = "${var.project_name}-postgres" })
}

resource "aws_vpc_security_group_ingress_rule" "database_postgres" {
  for_each = toset(var.database_allowed_cidr_blocks)

  security_group_id = aws_security_group.database.id
  cidr_ipv4         = each.value
  from_port         = 5432
  ip_protocol       = "tcp"
  to_port           = 5432
  description       = "PostgreSQL access from ${each.value}"
}

resource "aws_vpc_security_group_egress_rule" "database_all" {
  security_group_id = aws_security_group.database.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Allow outbound traffic."
}

resource "aws_db_subnet_group" "database" {
  name       = "${var.project_name}-postgres"
  subnet_ids = aws_subnet.database_public[*].id
  tags       = merge(local.tags, { Name = "${var.project_name}-postgres" })
}

resource "aws_db_instance" "database" {
  identifier = local.database_identifier

  engine         = "postgres"
  engine_version = var.database_engine_version
  instance_class = var.database_instance_class

  allocated_storage     = var.database_allocated_storage
  max_allocated_storage = var.database_allocated_storage * 2
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name                     = var.database_name
  username                    = var.database_username
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.database.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = true

  backup_retention_period = var.database_backup_retention_days
  deletion_protection     = false
  skip_final_snapshot     = true

  auto_minor_version_upgrade = true
  apply_immediately          = false
  tags                       = local.tags
}
