provider "aws" {
  region = var.region
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "manufacturing-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.region}a", "${var.region}b", "${var.region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false

  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "manufacturing-${var.environment}"
  cluster_version = "1.28"

  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      min_size     = 2
      max_size     = 10
      desired_size = 3

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }
  }

  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
  }

  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "manufacturing-${var.environment}"

  engine            = "postgres"
  engine_version    = "15.3"
  instance_class    = "db.t3.medium"
  allocated_storage = 20
  storage_encrypted = true

  db_name  = "manufacturing"
  username = var.db_username
  password = var.db_password
  port     = "5432"

  vpc_security_group_ids = [aws_security_group.rds.id]
  subnet_ids             = module.vpc.private_subnets
  
  family               = "postgres15"
  major_engine_version = "15"

  backup_retention_period = 7
  skip_final_snapshot     = true

  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

resource "aws_security_group" "rds" {
  name        = "manufacturing-rds-${var.environment}"
  description = "Allow database traffic from EKS cluster"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description      = "PostgreSQL from EKS"
    from_port        = 5432
    to_port          = 5432
    protocol         = "tcp"
    security_groups  = [module.eks.node_security_group_id]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

module "elasticache" {
  source = "terraform-aws-modules/elasticache-redis/aws"
  version = "~> 3.0"

  name_prefix       = "manufacturing-redis-${var.environment}"
  num_cache_nodes   = 1
  node_type         = "cache.t3.small"
  engine_version    = "7.0"
  port              = 6379
  
  subnet_group_name = aws_elasticache_subnet_group.default.name
  security_group_ids = [aws_security_group.redis.id]

  family = "redis7"
  
  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

resource "aws_elasticache_subnet_group" "default" {
  name       = "manufacturing-redis-subnet-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis" {
  name        = "manufacturing-redis-${var.environment}"
  description = "Allow Redis traffic from EKS cluster"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description      = "Redis from EKS"
    from_port        = 6379
    to_port          = 6379
    protocol         = "tcp"
    security_groups  = [module.eks.node_security_group_id]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}