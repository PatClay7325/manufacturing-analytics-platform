provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "manufacturing-${var.environment}-rg"
  location = var.location
  
  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

resource "azurerm_virtual_network" "main" {
  name                = "manufacturing-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "db" {
  name                 = "db-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]
  service_endpoints    = ["Microsoft.Sql"]
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = "manufacturing-${var.environment}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "manufacturing-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = 3
    vm_size             = "Standard_D2s_v3"
    vnet_subnet_id      = azurerm_subnet.aks.id
    enable_auto_scaling = true
    min_count           = 2
    max_count           = 10
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
  }
  
  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "manufacturing-${var.environment}-pg"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "15"
  administrator_login    = var.db_username
  administrator_password = var.db_password
  
  storage_mb             = 32768
  sku_name               = "GP_Standard_D2s_v3"
  backup_retention_days  = 7
  
  delegated_subnet_id    = azurerm_subnet.db.id
  private_dns_zone_id    = azurerm_private_dns_zone.postgres.id
  
  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.postgres
  ]
  
  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "manufacturing-${var.environment}-postgres.private.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "manufacturing-${var.environment}-pg-vnet-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = azurerm_resource_group.main.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "manufacturing"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_redis_cache" "main" {
  name                = "manufacturing-${var.environment}-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 1
  family              = "C"
  sku_name            = "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  
  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}

resource "azurerm_container_registry" "acr" {
  name                = "manufacturing${var.environment}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard"
  admin_enabled       = true
  
  tags = {
    Environment = var.environment
    Project     = "manufacturing-analytics"
  }
}