# Multi-Tenancy Framework

## Overview

The Multi-Tenancy Framework provides a comprehensive solution for running a single instance of the Manufacturing Analytics Platform that serves multiple tenants (customers). This framework ensures proper isolation of tenant data and resources while enabling efficient resource sharing.

## Key Concepts

### What is Multi-Tenancy?

Multi-tenancy is an architectural pattern where a single instance of software serves multiple tenants (customers). Each tenant's data and configuration are isolated from other tenants, creating the impression that each tenant has a dedicated instance of the application.

### Benefits of Multi-Tenancy

- **Cost Efficiency**: Reduced infrastructure and operational costs by sharing resources
- **Simplified Management**: Centralized deployment, updates, and maintenance
- **Resource Optimization**: Better utilization of system resources
- **Scalability**: Easier to scale a single application than multiple isolated instances
- **Consistent Updates**: All tenants receive updates simultaneously

## Tenant Isolation Models

The framework supports multiple isolation models to accommodate different security, compliance, and performance requirements:

### Database Isolation

- **Dedicated Database**: Each tenant has its own physical database
- **Highest Isolation**: Complete separation of data at the database level
- **Use Case**: High-security environments, strict regulatory requirements
- **Tradeoffs**: Higher resource usage, more complex management

### Schema Isolation

- **Shared Database, Separate Schemas**: All tenants share a database, but each has its own schema
- **Medium Isolation**: Data separation at schema level
- **Use Case**: Balance between isolation and resource sharing
- **Tradeoffs**: Good performance with reasonable resource usage

### Shared Isolation

- **Shared Tables**: All tenants share the same database and schema
- **Row-Level Isolation**: Tenant data is filtered using a tenant identifier column
- **Use Case**: Maximizing resource sharing, simpler management
- **Tradeoffs**: Requires careful query design to prevent data leakage

### Hybrid Isolation

- **Mixed Approach**: Different isolation models for different types of data
- **Flexible Security**: Critical data can use stricter isolation
- **Use Case**: Complex applications with varying security needs
- **Tradeoffs**: More complex implementation and management

## Architecture Components

### TenantContext

The `TenantContext` interface provides access to the current tenant information throughout the application:

```typescript
interface TenantContext {
  getCurrentContext(): TenantContextData | null;
  setCurrentContext(context: TenantContextData): void;
  getCurrentTenant(): Tenant | null;
  getCurrentTenantId(): string | null;
  getCurrentTenantConfiguration(): TenantConfiguration | null;
  getConfigValue<T>(key: string, defaultValue?: T): T | undefined;
  isFeatureEnabled(featureFlag: string): boolean;
  clearContext(): void;
  hasContext(): boolean;
  hasPermission(permission: string): boolean;
}
```

### TenantManager

The `TenantManager` interface handles tenant lifecycle management:

```typescript
interface TenantManager {
  createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant>;
  getTenantById(tenantId: string): Promise<Tenant | null>;
  updateTenant(tenantId: string, tenantData: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Tenant>;
  deactivateTenant(tenantId: string): Promise<boolean>;
  activateTenant(tenantId: string): Promise<boolean>;
  deleteTenant(tenantId: string): Promise<boolean>;
  listTenants(filter?: Partial<Tenant>): Promise<Tenant[]>;
  updateTenantConfiguration(tenantId: string, config: Partial<TenantConfiguration>): Promise<Tenant>;
  provisionTenantResources(tenantId: string): Promise<boolean>;
  deprovisionTenantResources(tenantId: string): Promise<boolean>;
}
```

### TenantResolver

The `TenantResolver` interface handles identification of tenants from various sources:

```typescript
interface TenantResolver {
  resolveTenant(context: TenantIdentificationContext): Promise<TenantResolutionResult>;
  resolveFromPath(path: string): Promise<string | null>;
  resolveFromSubdomain(host: string): Promise<string | null>;
  resolveFromHeaders(headers: Record<string, string>): Promise<string | null>;
  resolveFromToken(token: string): Promise<string | null>;
  resolveFromEnvironment(env: Record<string, string>): Promise<string | null>;
  getDefaultTenant(): Promise<string | null>;
  validateTenant(tenantId: string): Promise<boolean>;
}
```

### MultiTenantDatabaseAdapter

The `MultiTenantDatabaseAdapter` implements the `DatabaseAdapter` interface to provide tenant-aware data access:

```typescript
class MultiTenantDatabaseAdapter implements DatabaseAdapter {
  async query<T>(query: string, params?: any[], options?: QueryOptions): Promise<QueryResult<T>>;
  async beginTransaction(options?: any): Promise<any>;
  async commitTransaction(transaction: any): Promise<void>;
  async rollbackTransaction(transaction: any): Promise<void>;
  async close(): Promise<void>;
}
```

### TenantResolutionMiddleware

The `TenantResolutionMiddleware` extracts tenant information from API requests:

```typescript
class TenantResolutionMiddleware {
  public async handle(
    req: ApiRequest, 
    res: ApiResponse, 
    next: () => Promise<void>
  ): Promise<void>;
}
```

## Tenant-Aware Services

The following core services have been enhanced to support multi-tenancy:

### ServiceRegistry

- Manages tenant-specific service registrations
- Allows services to be registered globally or per-tenant
- Ensures tenant isolation when retrieving services

### EventBus

- Provides tenant-isolated event publishing and subscription
- Prevents events from leaking across tenant boundaries
- Supports cross-tenant events with explicit permission

### ApiGatewayService

- Integrates with TenantResolutionMiddleware
- Routes requests to tenant-specific handlers
- Enforces tenant-specific API rate limits and policies

### IntegrationManager

- Manages tenant-specific integration adapters
- Ensures integration data is properly isolated by tenant
- Supports tenant-specific integration configurations

### ComplianceRegistry

- Maintains tenant-specific compliance profiles
- Enforces tenant-specific compliance rules
- Allows customization of compliance requirements per tenant

### AuthManager

- Embeds tenant information in authentication tokens
- Validates tenant context during authentication
- Manages tenant-specific authentication settings

### AuthorizationManager

- Enforces tenant-specific role-based access control
- Prevents cross-tenant access to resources
- Supports tenant-specific permission models

## Tenant Resolution Strategies

The framework supports multiple strategies for identifying tenants:

### URL Path

- Format: `/tenants/{tenantId}/resources`
- Configuration: Define path pattern in API gateway configuration
- Security: Moderate (can be spoofed, should be used with authentication)

### Subdomain

- Format: `{tenantId}.example.com`
- Configuration: DNS configuration for wildcard subdomains
- Security: Moderate (requires DNS control)

### Request Headers

- Format: `X-Tenant-ID: tenant123`
- Configuration: Define header name in API gateway configuration
- Security: Low (easily spoofed, should be used with authentication)

### Authentication Token

- Format: JWT with tenant claim
- Configuration: Configure AuthManager to include tenant ID
- Security: High (when using proper JWT security practices)

### Environment Variables

- Format: `TENANT_ID=tenant123`
- Configuration: Set in deployment environment
- Security: High (controlled by infrastructure)

## Security Considerations

### Data Isolation

- Always validate tenant context before accessing data
- Use parameterized queries to prevent SQL injection
- Apply tenant filters at the database level
- Test thoroughly for tenant data leakage

### Authentication and Authorization

- Always include tenant context in authentication tokens
- Validate tenant context on every request
- Implement tenant-specific role-based access control
- Use proper JWT security practices

### Cross-Tenant Access

- Require explicit permission for cross-tenant operations
- Log all cross-tenant access attempts
- Implement strict validation for cross-tenant operations
- Use elevated privileges sparingly

## Configuration

### Tenant Configuration

Each tenant has its own configuration that can include:

```typescript
interface TenantConfiguration {
  databaseConfig?: DatabaseConfig;
  schemaConfig?: SchemaConfig;
  sharedConfig?: SharedConfig;
  customSettings: Record<string, any>;
  featureFlags: Record<string, boolean>;
}
```

### Isolation Model Configuration

Database isolation:

```typescript
interface DatabaseConfig {
  connectionString: string;
  username: string;
  password: string;
}
```

Schema isolation:

```typescript
interface SchemaConfig {
  schemaName: string;
}
```

Shared isolation:

```typescript
interface SharedConfig {
  tenantIdentifier: string;
}
```

## Usage Examples

### Setting Up a New Tenant

```typescript
// Create a new tenant
const tenantManager = await serviceRegistry.getService<TenantManager>('TenantManager');
const newTenant = await tenantManager.createTenant({
  name: 'Acme Manufacturing',
  status: 'active',
  isolationModel: 'schema',
  config: {
    schemaConfig: {
      schemaName: 'acme_manufacturing'
    },
    customSettings: {
      supportEmail: 'support@acme-manufacturing.com'
    },
    featureFlags: {
      advancedAnalytics: true,
      predictiveMaintenance: false
    }
  }
});

// Provision resources for the tenant
await tenantManager.provisionTenantResources(newTenant.id);
```

### Creating a Tenant-Aware Service

```typescript
import { BaseService } from '../core/architecture/BaseService';
import { TenantContext } from '../core/multi-tenancy/interfaces/TenantContext';

export class EquipmentService extends BaseService {
  private tenantContext?: TenantContext;
  private globalEquipment: Map<string, Equipment> = new Map();
  private tenantEquipment: Map<string, Map<string, Equipment>> = new Map();

  constructor(
    private readonly logger: LoggerService,
    private readonly databaseAdapter: DatabaseAdapter,
    tenantContext?: TenantContext
  ) {
    super('EquipmentService');
    this.tenantContext = tenantContext;
  }

  // Tenant-aware method
  async getEquipment(id: string): Promise<Equipment | null> {
    const tenantId = this.tenantContext?.getCurrentTenantId();
    
    if (tenantId && this.tenantEquipment.has(tenantId)) {
      const equipment = this.tenantEquipment.get(tenantId)?.get(id);
      if (equipment) return equipment;
    }
    
    // Fall back to global equipment if not found in tenant collection
    return this.globalEquipment.get(id) || null;
  }

  // Tenant-aware database access
  async listEquipmentByType(type: string): Promise<Equipment[]> {
    // The MultiTenantDatabaseAdapter will automatically apply tenant filtering
    const result = await this.databaseAdapter.query(
      'SELECT * FROM equipment WHERE type = $1',
      [type]
    );
    
    return result.rows;
  }
}
```

### Using the Tenant Resolution Middleware

```typescript
// In your API gateway setup
import { TenantResolutionMiddleware } from '../core/api-gateway/middleware/TenantResolutionMiddleware';

// Create middleware instance
const tenantResolver = await serviceRegistry.getService<TenantResolver>('TenantResolver');
const tenantContext = await serviceRegistry.getService<TenantContext>('TenantContext');
const tenantMiddleware = new TenantResolutionMiddleware(tenantResolver, tenantContext);

// Add middleware to your application
app.use(async (req, res, next) => {
  await tenantMiddleware.handle(req, res, next);
});
```

### Publishing Tenant-Specific Events

```typescript
// Get EventBus with tenant context
const tenantContext = await serviceRegistry.getService<TenantContext>('TenantContext');
const eventBus = await serviceRegistry.getService<EventBus>('EventBus', tenantContext);

// Publish event for current tenant
await eventBus.publish({
  type: 'equipment.status.changed',
  payload: {
    equipmentId: 'equip-123',
    status: 'maintenance',
    timestamp: new Date()
  },
  metadata: {
    // The tenant ID is automatically added by the EventBus
    source: 'EquipmentService',
    correlationId: 'corr-456'
  }
});
```

## Best Practices

### Developing Tenant-Aware Services

1. **Always check tenant context**: Verify tenant context before accessing or modifying data
2. **Use tenant-aware adapters**: Leverage the MultiTenantDatabaseAdapter for data access
3. **Isolate tenant resources**: Store tenant-specific resources in separate collections
4. **Clear tenant context**: Always clear tenant context after operations complete
5. **Test with multiple tenants**: Test services with various tenant configurations

### Performance Optimization

1. **Connection pooling**: Use connection pools for database connections
2. **Tenant-specific caching**: Implement tenant-aware caching strategies
3. **Efficient tenant resolution**: Optimize tenant resolution for performance
4. **Resource sharing**: Balance isolation and resource sharing based on requirements
5. **Monitoring**: Implement tenant-specific metrics and monitoring

### Troubleshooting

1. **Tenant context issues**: Check if tenant context is properly set and propagated
2. **Data leakage**: Verify tenant isolation in database queries
3. **Missing tenant information**: Ensure tenant resolution is working correctly
4. **Cross-tenant access**: Check authorization for cross-tenant operations
5. **Performance problems**: Monitor tenant-specific resource usage

## Integration with Other Platform Components

### Integration with Authentication

The multi-tenancy framework integrates with the authentication system by:

- Including tenant information in authentication tokens
- Validating tenant context during authentication
- Supporting tenant-specific authentication providers

### Integration with Authorization

The multi-tenancy framework integrates with the authorization system by:

- Enforcing tenant-specific role-based access control
- Preventing cross-tenant access to resources
- Supporting tenant-specific permission models

### Integration with API Gateway

The multi-tenancy framework integrates with the API gateway by:

- Resolving tenant information from requests
- Routing requests to tenant-specific handlers
- Enforcing tenant-specific API policies

### Integration with Event System

The multi-tenancy framework integrates with the event system by:

- Providing tenant-isolated event publishing and subscription
- Preventing events from leaking across tenant boundaries
- Supporting cross-tenant events with explicit permission

### Integration with Compliance Framework

The multi-tenancy framework integrates with the compliance framework by:

- Maintaining tenant-specific compliance profiles
- Enforcing tenant-specific compliance rules
- Supporting tenant-specific auditing and reporting

## Conclusion

The Multi-Tenancy Framework provides a comprehensive solution for building and managing multi-tenant applications in the Manufacturing Analytics Platform. By following the patterns and practices outlined in this document, developers can create secure, efficient, and scalable multi-tenant services.