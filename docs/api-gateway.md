# API Gateway Architecture

## Overview

The API Gateway serves as the entry point for all client requests to the Hybrid Manufacturing Intelligence Platform. It provides routing, versioning, authentication, authorization, rate limiting, and documentation features. This document explains the architecture and usage of the API Gateway.

## Core Components

### 1. Route Registry

The Route Registry manages API routes and versioning:

- **Route Registration**: Register routes for services
- **Route Discovery**: Find routes matching a request
- **Versioning**: Support for multiple API versions
- **Documentation**: Generate OpenAPI documentation

### 2. Request Handler

The Request Handler processes API requests:

- **Request Processing**: Handle incoming requests
- **Middleware Chain**: Apply middleware to requests
- **Response Generation**: Generate appropriate responses
- **Error Handling**: Handle errors during request processing

### 3. Authentication Manager

The Authentication Manager handles user authentication:

- **Token Generation**: Generate JWT tokens
- **Token Verification**: Verify JWT tokens
- **Refresh Tokens**: Manage token refreshing
- **User Authentication**: Authenticate requests

### 4. Authorization Manager

The Authorization Manager handles access control:

- **Role-Based Access**: Control access based on user roles
- **Permission Checking**: Check if users have required permissions
- **Route Protection**: Protect routes based on authorization rules

### 5. Rate Limiter

The Rate Limiter manages API usage limits:

- **Request Counting**: Count requests from clients
- **Limit Enforcement**: Enforce rate limits
- **Client Identification**: Identify clients for rate limiting
- **Limit Headers**: Provide rate limit information in headers

## API Versioning

The API Gateway supports versioning to ensure backward compatibility:

### 1. URL-Based Versioning

Versions are specified in the URL path:

```
/api/v1/equipment
/api/v2/equipment
```

### 2. Version Fallback

When a route is not found in the requested version, the Gateway can fall back to earlier versions.

### 3. Latest Version

The 'latest' version alias always points to the most recent version:

```
/api/latest/equipment  # Equivalent to the most recent version
```

## Request Processing Flow

1. **Routing**: Match the request to a registered route
2. **Authentication**: Verify the user's identity
3. **Authorization**: Check the user's permissions
4. **Rate Limiting**: Check if the client has exceeded rate limits
5. **Middleware**: Apply pre-request middleware
6. **Handler Execution**: Execute the route handler
7. **Middleware**: Apply post-request middleware
8. **Response**: Send the response to the client

## Authentication

The API Gateway supports JWT-based authentication:

### 1. Login Flow

```
POST /api/auth/login
Body: { username, password }
Response: { token, refreshToken }
```

### 2. Token Refresh

```
POST /api/auth/refresh
Body: { refreshToken }
Response: { token }
```

### 3. Token Verification

All protected routes verify the JWT token from the Authorization header:

```
Authorization: Bearer <token>
```

## Authorization

Routes can specify required roles for access control:

```typescript
{
  path: '/api/admin/settings',
  method: 'GET',
  version: 'v1',
  handler: getSettings,
  requiresAuth: true,
  requiredRoles: ['admin'],
}
```

## Rate Limiting

The API Gateway implements rate limiting to prevent abuse:

### 1. Default Limits

By default, clients are limited to 60 requests per minute.

### 2. Route-Specific Limits

Routes can specify their own rate limits:

```typescript
{
  path: '/api/stats',
  method: 'GET',
  version: 'v1',
  handler: getStats,
  rateLimit: 10, // 10 requests per minute
}
```

### 3. Rate Limit Headers

Clients receive rate limit information in headers:

```
X-Rate-Limit-Limit: 60
X-Rate-Limit-Remaining: 58
X-Rate-Limit-Reset: 1635528000
```

## CORS Support

The API Gateway includes built-in CORS support:

```typescript
cors: {
  enabled: true,
  allowedOrigins: ['*'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'],
  maxAge: 86400,
  allowCredentials: true,
}
```

## API Documentation

The API Gateway automatically generates documentation from route definitions:

### 1. OpenAPI JSON

```
GET /api/docs/openapi.json
```

### 2. OpenAPI YAML

```
GET /api/docs/openapi.yaml
```

### 3. HTML Documentation

```
GET /api/docs
```

## Registering Service APIs

Services can register their APIs with the Gateway:

```typescript
// Register equipment service API
apiGatewayService.registerServiceApi('equipment', [
  {
    path: '/api/equipment',
    method: 'GET',
    version: 'v1',
    handler: listEquipment,
    description: 'List all equipment',
    tags: ['equipment'],
  },
  {
    path: '/api/equipment/:id',
    method: 'GET',
    version: 'v1',
    handler: getEquipment,
    params: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Equipment ID',
      },
    ],
    description: 'Get equipment by ID',
    tags: ['equipment'],
  },
]);
```

## Error Handling

The API Gateway provides standardized error responses:

```json
{
  "status": 404,
  "message": "Not Found",
  "details": "No route found for GET /api/unknown",
  "code": "ROUTE_NOT_FOUND"
}
```

## Configuration

The API Gateway can be configured through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_PATH` | Base path for API | `/api` |
| `API_DEFAULT_VERSION` | Default API version | `v1` |
| `API_CORS_ENABLED` | Enable CORS | `true` |
| `API_RATE_LIMIT_ENABLED` | Enable rate limiting | `true` |
| `API_RATE_LIMIT_MAX` | Default rate limit | `60` |
| `API_AUTH_ENABLED` | Enable authentication | `true` |
| `JWT_SECRET` | JWT secret key | `your-secret-key` |
| `JWT_EXPIRATION` | JWT expiration in seconds | `3600` |

## Integration with Other Components

### 1. Event System

The API Gateway can emit events for significant actions:

- `api.request.received`: When a request is received
- `api.request.completed`: When a request is completed
- `api.auth.success`: When authentication succeeds
- `api.auth.failure`: When authentication fails
- `api.ratelimit.exceeded`: When rate limit is exceeded

### 2. Service System

Services can register their APIs with the Gateway:

```typescript
// Equipment service registration
apiGatewayService.registerServiceApi('equipment', equipmentRoutes);

// Metrics service registration
apiGatewayService.registerServiceApi('metrics', metricsRoutes);
```

### 3. AI System

The API Gateway can integrate with the AI system for:

- Request analysis
- Anomaly detection
- User behavior analysis
- API usage optimization

## Best Practices

1. **Route Organization**: Group routes by domain and functionality
2. **Version Management**: Use semantic versioning for API versions
3. **Authentication**: Always use HTTPS with JWT authentication
4. **Rate Limiting**: Implement appropriate rate limits for each route
5. **Documentation**: Provide detailed descriptions and examples
6. **Error Handling**: Return informative error messages
7. **Testing**: Test all routes with various inputs and edge cases

## Conclusion

The API Gateway provides a robust, secure, and flexible entry point for client applications to interact with the Hybrid Manufacturing Intelligence Platform. By centralizing routing, authentication, authorization, and rate limiting, it ensures consistent access patterns and security for all platform services.