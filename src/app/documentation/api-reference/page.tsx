import Link from 'next/link';

export default function ApiReference() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          API Reference
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Comprehensive reference documentation for the Adaptive Factory AI Solutions API, covering all endpoints, parameters, and response formats.
        </p>
      </div>

      {/* API Reference Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
        <div className="md:col-span-3 lg:col-span-2">
          <div className="sticky top-20">
            <nav className="space-y-1">
              <h3 className="font-medium text-gray-900 mb-2">Introduction</h3>
              <ul className="mb-6 space-y-1">
                <li>
                  <a href="#overview" className="text-blue-600 hover:text-blue-800 block py-1">Overview</a>
                </li>
                <li>
                  <a href="#authentication" className="text-blue-600 hover:text-blue-800 block py-1">Authentication</a>
                </li>
                <li>
                  <a href="#error-handling" className="text-blue-600 hover:text-blue-800 block py-1">Error Handling</a>
                </li>
              </ul>

              <h3 className="font-medium text-gray-900 mb-2">Core APIs</h3>
              <ul className="mb-6 space-y-1">
                <li>
                  <a href="#equipment-api" className="text-blue-600 hover:text-blue-800 block py-1">Equipment API</a>
                </li>
                <li>
                  <a href="#alerts-api" className="text-blue-600 hover:text-blue-800 block py-1">Alerts API</a>
                </li>
                <li>
                  <a href="#metrics-api" className="text-blue-600 hover:text-blue-800 block py-1">Metrics API</a>
                </li>
                <li>
                  <a href="#chat-api" className="text-blue-600 hover:text-blue-800 block py-1">Chat API</a>
                </li>
              </ul>

              <h3 className="font-medium text-gray-900 mb-2">Supporting APIs</h3>
              <ul className="mb-6 space-y-1">
                <li>
                  <a href="#auth-api" className="text-blue-600 hover:text-blue-800 block py-1">Auth API</a>
                </li>
                <li>
                  <a href="#integration-api" className="text-blue-600 hover:text-blue-800 block py-1">Integration API</a>
                </li>
                <li>
                  <a href="#admin-api" className="text-blue-600 hover:text-blue-800 block py-1">Admin API</a>
                </li>
                <li>
                  <a href="#websocket-api" className="text-blue-600 hover:text-blue-800 block py-1">WebSocket API</a>
                </li>
              </ul>

              <h3 className="font-medium text-gray-900 mb-2">API Resources</h3>
              <ul className="mb-6 space-y-1">
                <li>
                  <a href="#postman-collection" className="text-blue-600 hover:text-blue-800 block py-1">Postman Collection</a>
                </li>
                <li>
                  <a href="#openapi-spec" className="text-blue-600 hover:text-blue-800 block py-1">OpenAPI Specification</a>
                </li>
                <li>
                  <a href="#code-examples" className="text-blue-600 hover:text-blue-800 block py-1">Code Examples</a>
                </li>
                <li>
                  <a href="#rate-limits" className="text-blue-600 hover:text-blue-800 block py-1">Rate Limits</a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="md:col-span-9 lg:col-span-10">
          <div className="prose prose-blue max-w-none">
            {/* Overview */}
            <section id="overview" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
              <p>
                The Adaptive Factory AI Solutions API provides a comprehensive set of endpoints for interacting 
                with the platform's data and functionality. The API follows RESTful principles and uses JSON 
                for request and response bodies.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Base URL</h3>
              <p>
                All API requests should be made to the base URL for your deployment:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>https://api.your-domain.com/api/v1</code>
              </pre>
              <p>
                For local development environments, the base URL is:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>http://localhost:4000/api/v1</code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">API Versioning</h3>
              <p>
                The API is versioned to ensure backward compatibility as new features are added. The current 
                version is v1. The version is specified in the URL path.
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>https://api.your-domain.com/api/v1/equipment</code>
              </pre>
              <p>
                You can also use the 'latest' alias to always access the most recent version:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>https://api.your-domain.com/api/latest/equipment</code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Request Format</h3>
              <p>
                All request bodies should be in JSON format with the Content-Type header set to application/json:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`Content-Type: application/json

{
  "key": "value"
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Response Format</h3>
              <p>
                All responses are returned in JSON format with the appropriate HTTP status code:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`{
  "status": "success",
  "data": {
    // Response data
  }
}`}
                </code>
              </pre>
              <p>
                For error responses:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`{
  "status": "error",
  "message": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details
  }
}`}
                </code>
              </pre>
            </section>

            {/* Authentication */}
            <section id="authentication" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication</h2>
              <p>
                The API uses JSON Web Tokens (JWT) for authentication. To authenticate your requests, 
                include the JWT token in the Authorization header:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`Authorization: Bearer your-jwt-token`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Obtaining a Token</h3>
              <p>
                To obtain a JWT token, make a POST request to the login endpoint with your credentials:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}`}
                </code>
              </pre>
              <p>
                The response will include the JWT token and a refresh token:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`{
  "status": "success",
  "data": {
    "token": "your-jwt-token",
    "refreshToken": "your-refresh-token",
    "expiresAt": 1678356521
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Refreshing a Token</h3>
              <p>
                JWT tokens expire after a certain period (typically 1 hour). To refresh your token, make a 
                POST request to the refresh endpoint with your refresh token:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}`}
                </code>
              </pre>
              <p>
                The response will include a new JWT token:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`{
  "status": "success",
  "data": {
    "token": "new-jwt-token",
    "expiresAt": 1678360121
  }
}`}
                </code>
              </pre>
            </section>

            {/* Error Handling */}
            <section id="error-handling" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Handling</h2>
              <p>
                The API uses standard HTTP status codes to indicate the success or failure of requests. 
                In addition, error responses include detailed information about the error.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">HTTP Status Codes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Status Code</th>
                      <th className="py-2 px-4 border-b text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border-b">200 OK</td>
                      <td className="py-2 px-4 border-b">The request was successful</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">201 Created</td>
                      <td className="py-2 px-4 border-b">A new resource was created successfully</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">400 Bad Request</td>
                      <td className="py-2 px-4 border-b">The request was invalid or malformed</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">401 Unauthorized</td>
                      <td className="py-2 px-4 border-b">Authentication is required or failed</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">403 Forbidden</td>
                      <td className="py-2 px-4 border-b">The authenticated user does not have permission</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">404 Not Found</td>
                      <td className="py-2 px-4 border-b">The requested resource was not found</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">422 Unprocessable Entity</td>
                      <td className="py-2 px-4 border-b">The request was well-formed but had semantic errors</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">429 Too Many Requests</td>
                      <td className="py-2 px-4 border-b">Rate limit exceeded</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">500 Internal Server Error</td>
                      <td className="py-2 px-4 border-b">An unexpected error occurred on the server</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Error Response Format</h3>
              <p>
                Error responses include a JSON body with details about the error:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`{
  "status": "error",
  "message": "Equipment not found",
  "code": "RESOURCE_NOT_FOUND",
  "details": {
    "resource": "equipment",
    "id": "equip-123"
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Common Error Codes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Error Code</th>
                      <th className="py-2 px-4 border-b text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border-b">VALIDATION_ERROR</td>
                      <td className="py-2 px-4 border-b">The request data failed validation</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">AUTHENTICATION_ERROR</td>
                      <td className="py-2 px-4 border-b">Authentication failed</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">AUTHORIZATION_ERROR</td>
                      <td className="py-2 px-4 border-b">The user does not have permission</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">RESOURCE_NOT_FOUND</td>
                      <td className="py-2 px-4 border-b">The requested resource was not found</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">RATE_LIMIT_EXCEEDED</td>
                      <td className="py-2 px-4 border-b">Too many requests</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">INTERNAL_SERVER_ERROR</td>
                      <td className="py-2 px-4 border-b">An unexpected server error occurred</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Equipment API */}
            <section id="equipment-api" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Equipment API</h2>
              <p>
                The Equipment API provides endpoints for accessing and managing manufacturing equipment data.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">List Equipment</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/equipment

Query Parameters:
- status: Filter by equipment status (operational, maintenance, offline, error)
- type: Filter by equipment type
- department: Filter by department
- page: Page number for pagination (default: 1)
- limit: Number of items per page (default: 20)
- sort: Field to sort by (default: name)
- order: Sort order (asc or desc, default: asc)

Response:
{
  "status": "success",
  "data": {
    "equipment": [
      {
        "id": "equip-1",
        "name": "CNC Machine XYZ-1000",
        "serialNumber": "SN12345",
        "model": "XYZ-1000",
        "manufacturer": "Machining Co.",
        "type": "CNC",
        "location": "Building A, Floor 2, Cell 3",
        "department": "Machining",
        "status": "operational",
        // Additional equipment properties
      },
      // More equipment items
    ],
    "total": 42,
    "page": 1,
    "pages": 3,
    "limit": 20
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Equipment</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/equipment/:id

Response:
{
  "status": "success",
  "data": {
    "id": "equip-1",
    "name": "CNC Machine XYZ-1000",
    "serialNumber": "SN12345",
    "model": "XYZ-1000",
    "manufacturer": "Machining Co.",
    "type": "CNC",
    "location": "Building A, Floor 2, Cell 3",
    "department": "Machining",
    "installationDate": "2022-06-15",
    "lastMaintenanceDate": "2023-01-15",
    "nextMaintenanceDate": "2023-07-15",
    "status": "operational",
    "specifications": {
      "Power": "7.5 kW",
      "Weight": "3200 kg",
      "Dimensions": "2400 x 1800 x 2100 mm",
      "Max Spindle Speed": "12000 RPM",
      "Axis Travel (X/Y/Z)": "500/400/450 mm",
      "Tool Capacity": "24 tools"
    },
    "metrics": [
      {
        "id": "metric-1",
        "name": "Temperature",
        "value": 65.2,
        "unit": "°C",
        "timestamp": "2023-06-16T10:30:00Z",
        "min": 20,
        "max": 85,
        "warning": {
          "high": 75,
          "low": 25
        },
        "critical": {
          "high": 85,
          "low": 20
        }
      },
      // More metrics
    ],
    "maintenanceHistory": [
      {
        "id": "maint-1",
        "type": "preventive",
        "scheduledDate": "2023-01-15",
        "completedDate": "2023-01-15",
        "description": "Quarterly maintenance",
        "status": "completed",
        "technician": "John Smith",
        "notes": "Replaced filters, lubricant change, general inspection",
        "parts": ["Filter set", "Lubricant"]
      },
      // More maintenance records
    ],
    "tags": ["machining", "high-precision", "metal"],
    "createdAt": "2022-06-15T10:30:00Z",
    "updatedAt": "2023-01-15T14:20:00Z"
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Create Equipment</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/equipment
Content-Type: application/json

{
  "name": "CNC Machine XYZ-1000",
  "serialNumber": "SN12345",
  "model": "XYZ-1000",
  "manufacturer": "Machining Co.",
  "type": "CNC",
  "location": "Building A, Floor 2, Cell 3",
  "department": "Machining",
  "installationDate": "2022-06-15",
  "status": "operational",
  "specifications": {
    "Power": "7.5 kW",
    "Weight": "3200 kg",
    "Dimensions": "2400 x 1800 x 2100 mm",
    "Max Spindle Speed": "12000 RPM",
    "Axis Travel (X/Y/Z)": "500/400/450 mm",
    "Tool Capacity": "24 tools"
  },
  "tags": ["machining", "high-precision", "metal"]
}

Response:
{
  "status": "success",
  "data": {
    "id": "equip-1",
    "name": "CNC Machine XYZ-1000",
    // All equipment properties
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Update Equipment</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`PUT /api/v1/equipment/:id
Content-Type: application/json

{
  "name": "CNC Machine XYZ-1000 (Updated)",
  "status": "maintenance",
  "location": "Building B, Floor 1, Cell 5"
}

Response:
{
  "status": "success",
  "data": {
    "id": "equip-1",
    "name": "CNC Machine XYZ-1000 (Updated)",
    "status": "maintenance",
    "location": "Building B, Floor 1, Cell 5",
    // All equipment properties
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Delete Equipment</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`DELETE /api/v1/equipment/:id

Response:
{
  "status": "success",
  "data": {
    "id": "equip-1",
    "deleted": true
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Equipment Metrics</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/equipment/:id/metrics

Query Parameters:
- from: Start timestamp (ISO 8601 format)
- to: End timestamp (ISO 8601 format)
- metrics: Comma-separated list of metric names to include
- interval: Aggregation interval (minute, hour, day, week, month)

Response:
{
  "status": "success",
  "data": {
    "id": "equip-1",
    "name": "CNC Machine XYZ-1000",
    "metrics": [
      {
        "name": "Temperature",
        "unit": "°C",
        "data": [
          {
            "timestamp": "2023-06-16T10:00:00Z",
            "value": 65.2
          },
          {
            "timestamp": "2023-06-16T11:00:00Z",
            "value": 66.5
          },
          // More data points
        ],
        "statistics": {
          "min": 64.8,
          "max": 67.3,
          "avg": 66.1,
          "count": 24
        }
      },
      // More metrics
    ]
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Add Maintenance Record</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/equipment/:id/maintenance
Content-Type: application/json

{
  "type": "preventive",
  "scheduledDate": "2023-07-15",
  "description": "Quarterly maintenance",
  "status": "scheduled"
}

Response:
{
  "status": "success",
  "data": {
    "id": "maint-12",
    "type": "preventive",
    "scheduledDate": "2023-07-15",
    "description": "Quarterly maintenance",
    "status": "scheduled",
    "equipmentId": "equip-1",
    "createdAt": "2023-06-16T12:30:00Z"
  }
}`}
                </code>
              </pre>
            </section>

            {/* Alerts API */}
            <section id="alerts-api" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Alerts API</h2>
              <p>
                The Alerts API provides endpoints for accessing and managing manufacturing alerts.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">List Alerts</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/alerts

Query Parameters:
- status: Filter by alert status (active, acknowledged, resolved, muted)
- severity: Filter by alert severity (critical, high, medium, low, info)
- source: Filter by alert source (equipment, process, quality, etc.)
- from: Start timestamp (ISO 8601 format)
- to: End timestamp (ISO 8601 format)
- page: Page number for pagination (default: 1)
- limit: Number of items per page (default: 20)
- sort: Field to sort by (default: createdAt)
- order: Sort order (asc or desc, default: desc)

Response:
{
  "status": "success",
  "data": {
    "alerts": [
      {
        "id": "alert-1",
        "title": "Machine temperature exceeding threshold",
        "description": "CNC Machine XYZ-1000 temperature reached 78°C, exceeding the warning threshold of 75°C.",
        "severity": "high",
        "status": "active",
        "source": "equipment",
        "sourceId": "equip-1",
        "sourceName": "CNC Machine XYZ-1000",
        "createdAt": "2023-06-16T10:15:00Z",
        "updatedAt": "2023-06-16T10:15:00Z",
        "dueBy": "2023-06-16T11:30:00Z",
        "category": "temperature",
        "tags": ["temperature", "maintenance-required", "cnc"]
      },
      // More alerts
    ],
    "total": 35,
    "page": 1,
    "pages": 2,
    "limit": 20
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Alert</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/alerts/:id

Response:
{
  "status": "success",
  "data": {
    "id": "alert-1",
    "title": "Machine temperature exceeding threshold",
    "description": "CNC Machine XYZ-1000 temperature reached 78°C, exceeding the warning threshold of 75°C.",
    "severity": "high",
    "status": "active",
    "source": "equipment",
    "sourceId": "equip-1",
    "sourceName": "CNC Machine XYZ-1000",
    "createdAt": "2023-06-16T10:15:00Z",
    "updatedAt": "2023-06-16T10:15:00Z",
    "dueBy": "2023-06-16T11:30:00Z",
    "category": "temperature",
    "tags": ["temperature", "maintenance-required", "cnc"],
    "responses": [
      // Alert response history
    ]
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Create Alert</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/alerts
Content-Type: application/json

{
  "title": "Low inventory for raw material",
  "description": "Aluminum sheets (1.5mm) inventory is below reorder point. Current stock: 120 units, Reorder point: 200 units.",
  "severity": "medium",
  "source": "inventory",
  "sourceName": "Warehouse A",
  "dueBy": "2023-06-18T12:00:00Z",
  "category": "inventory",
  "tags": ["inventory", "raw-materials", "reorder"]
}

Response:
{
  "status": "success",
  "data": {
    "id": "alert-11",
    "title": "Low inventory for raw material",
    "description": "Aluminum sheets (1.5mm) inventory is below reorder point. Current stock: 120 units, Reorder point: 200 units.",
    "severity": "medium",
    "status": "active",
    "source": "inventory",
    "sourceName": "Warehouse A",
    "createdAt": "2023-06-16T12:30:00Z",
    "updatedAt": "2023-06-16T12:30:00Z",
    "dueBy": "2023-06-18T12:00:00Z",
    "category": "inventory",
    "tags": ["inventory", "raw-materials", "reorder"]
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Acknowledge Alert</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/alerts/:id/acknowledge
Content-Type: application/json

{
  "comment": "I will investigate this issue immediately"
}

Response:
{
  "status": "success",
  "data": {
    "id": "alert-1",
    "status": "acknowledged",
    "acknowledgedAt": "2023-06-16T12:45:00Z",
    "acknowledgedBy": "jane.doe",
    "updatedAt": "2023-06-16T12:45:00Z"
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Resolve Alert</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/alerts/:id/resolve
Content-Type: application/json

{
  "comment": "Issue has been resolved by adjusting the cooling system settings"
}

Response:
{
  "status": "success",
  "data": {
    "id": "alert-1",
    "status": "resolved",
    "resolvedAt": "2023-06-16T13:15:00Z",
    "resolvedBy": "jane.doe",
    "updatedAt": "2023-06-16T13:15:00Z"
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Alert Statistics</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/alerts/statistics

Query Parameters:
- from: Start timestamp (ISO 8601 format)
- to: End timestamp (ISO 8601 format)

Response:
{
  "status": "success",
  "data": {
    "total": 35,
    "bySeverity": {
      "critical": 2,
      "high": 8,
      "medium": 15,
      "low": 7,
      "info": 3
    },
    "byStatus": {
      "active": 12,
      "acknowledged": 8,
      "resolved": 15,
      "muted": 0
    },
    "bySource": {
      "equipment": 18,
      "process": 5,
      "quality": 3,
      "maintenance": 4,
      "inventory": 2,
      "safety": 2,
      "system": 1
    },
    "trend": [
      {
        "date": "2023-06-10",
        "count": 3
      },
      {
        "date": "2023-06-11",
        "count": 5
      },
      // More trend data
    ]
  }
}`}
                </code>
              </pre>
            </section>

            {/* Metrics API */}
            <section id="metrics-api" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Metrics API</h2>
              <p>
                The Metrics API provides endpoints for accessing manufacturing performance metrics.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Production Metrics</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/metrics/production

Query Parameters:
- lineId: Filter by production line ID
- period: Time period (daily, weekly, monthly)
- from: Start timestamp (ISO 8601 format)
- to: End timestamp (ISO 8601 format)

Response:
{
  "status": "success",
  "data": [
    {
      "lineId": "line-1",
      "lineName": "Production Line A",
      "target": 1200,
      "actual": 1140,
      "oee": 85.5,
      "availability": 92.0,
      "performance": 88.5,
      "quality": 96.2,
      "period": "daily"
    },
    // More production metrics
  ]
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Downtime Reasons</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/metrics/downtime

Query Parameters:
- period: Time period (daily, weekly, monthly)
- count: Number of top reasons to return (default: all)
- from: Start timestamp (ISO 8601 format)
- to: End timestamp (ISO 8601 format)

Response:
{
  "status": "success",
  "data": [
    {
      "reason": "Changeover",
      "hours": 4.2,
      "percentage": 45,
      "change": 5
    },
    {
      "reason": "Equipment Failure",
      "hours": 2.3,
      "percentage": 25,
      "change": -3
    },
    // More downtime reasons
  ]
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Quality Metrics</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/metrics/quality

Query Parameters:
- period: Time period (daily, weekly, monthly)
- from: Start timestamp (ISO 8601 format)
- to: End timestamp (ISO 8601 format)

Response:
{
  "status": "success",
  "data": {
    "period": "daily",
    "rejectRate": 2.8,
    "previousRate": 3.2,
    "changePercentage": -12.5,
    "defectCategories": [
      {
        "name": "Surface Scratches",
        "percentage": 42,
        "change": -5
      },
      {
        "name": "Dimensional Errors",
        "percentage": 28,
        "change": 3
      },
      // More defect categories
    ]
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Dashboard Metrics</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/metrics/dashboard

Response:
{
  "status": "success",
  "data": {
    "totalEquipment": 25,
    "operationalEquipment": 21,
    "equipmentInMaintenance": 3,
    "offlineEquipment": 1,
    "averageOee": 85.2,
    "productionTarget": 4650,
    "productionActual": 4361,
    "productionProgress": 93.8,
    "qualityRejectRate": 2.8,
    "alertsCritical": 2,
    "alertsHigh": 3,
    "alertsMedium": 5,
    "alertsLow": 2
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get OEE Trend</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/metrics/oee/trend

Query Parameters:
- lineId: Filter by production line ID
- days: Number of days to include (default: 30)
- from: Start timestamp (ISO 8601 format)
- to: End timestamp (ISO 8601 format)

Response:
{
  "status": "success",
  "data": [
    {
      "date": "2023-05-17",
      "oee": 84.2
    },
    {
      "date": "2023-05-18",
      "oee": 85.1
    },
    // More trend data
  ]
}`}
                </code>
              </pre>
            </section>

            {/* Chat API */}
            <section id="chat-api" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Chat API</h2>
              <p>
                The Chat API provides endpoints for interacting with the Manufacturing Assistant.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">List Chat Sessions</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/chat/sessions

Response:
{
  "status": "success",
  "data": {
    "sessions": [
      {
        "id": "session-1",
        "title": "Production Line Status",
        "createdAt": "2023-06-16T10:15:00Z",
        "updatedAt": "2023-06-16T10:20:00Z",
        "messageCount": 4
      },
      // More sessions
    ],
    "total": 3
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Chat Session</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/chat/sessions/:id

Response:
{
  "status": "success",
  "data": {
    "id": "session-1",
    "title": "Production Line Status",
    "createdAt": "2023-06-16T10:15:00Z",
    "updatedAt": "2023-06-16T10:20:00Z",
    "messageCount": 4
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Create Chat Session</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/chat/sessions
Content-Type: application/json

{
  "title": "OEE Analysis"
}

Response:
{
  "status": "success",
  "data": {
    "id": "session-4",
    "title": "OEE Analysis",
    "createdAt": "2023-06-16T13:30:00Z",
    "updatedAt": "2023-06-16T13:30:00Z",
    "messageCount": 0
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Session Messages</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/chat/sessions/:id/messages

Response:
{
  "status": "success",
  "data": {
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "What is the current status of production line A?",
        "timestamp": "2023-06-16T10:15:00Z",
        "name": "John Doe"
      },
      {
        "id": "msg-2",
        "role": "assistant",
        "content": "Production Line A is currently operating at 92% efficiency. There are no active alerts, and all equipment is functioning within normal parameters. The current production rate is 157 units per hour, which is 4% above the target rate of 150 units per hour.",
        "timestamp": "2023-06-16T10:16:00Z"
      },
      // More messages
    ],
    "total": 4
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Add Message</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/chat/sessions/:id/messages
Content-Type: application/json

{
  "role": "user",
  "content": "What are the top causes of downtime this week?",
  "name": "John Doe"
}

Response:
{
  "status": "success",
  "data": {
    "id": "msg-5",
    "role": "user",
    "content": "What are the top causes of downtime this week?",
    "timestamp": "2023-06-16T13:45:00Z",
    "name": "John Doe"
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get AI Response</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/chat/completions
Content-Type: application/json

{
  "messages": [
    {
      "role": "system",
      "content": "You are a manufacturing expert assistant."
    },
    {
      "role": "user",
      "content": "What are the top causes of downtime this week?",
      "name": "John Doe"
    }
  ],
  "model": "manufacturing-assistant-1"
}

Response:
{
  "status": "success",
  "data": {
    "id": "chatcmpl-123456",
    "object": "chat.completion",
    "created": 1686926700,
    "model": "manufacturing-assistant-1",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "The top causes of downtime this week are:\n\n1. Changeover time: 45% of total downtime (4.2 hours)\n2. Equipment failures: 25% of total downtime (2.3 hours)\n3. Material shortages: 15% of total downtime (1.4 hours)\n4. Quality adjustments: 10% of total downtime (0.9 hours)\n5. Other reasons: 5% of total downtime (0.5 hours)\n\nThe most significant equipment failure was the conveyor belt motor issue that occurred on Wednesday, accounting for 1.5 hours of downtime."
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 45,
      "completion_tokens": 95,
      "total_tokens": 140
    }
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Delete Chat Session</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`DELETE /api/v1/chat/sessions/:id

Response:
{
  "status": "success",
  "data": {
    "id": "session-1",
    "deleted": true
  }
}`}
                </code>
              </pre>
            </section>

            {/* Auth API */}
            <section id="auth-api" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Auth API</h2>
              <p>
                The Auth API provides endpoints for user authentication and authorization.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Login</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "john.doe",
  "password": "your-password"
}

Response:
{
  "status": "success",
  "data": {
    "token": "your-jwt-token",
    "refreshToken": "your-refresh-token",
    "expiresAt": 1686930300,
    "user": {
      "id": "user-1",
      "username": "john.doe",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "operator",
      "permissions": ["view:equipment", "view:alerts", "acknowledge:alerts"],
      "department": "Production"
    }
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Refresh Token</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}

Response:
{
  "status": "success",
  "data": {
    "token": "new-jwt-token",
    "expiresAt": 1686933900
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Logout</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`POST /api/v1/auth/logout

Response:
{
  "status": "success",
  "data": {
    "message": "Successfully logged out"
  }
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Get Current User</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`GET /api/v1/auth/me

Response:
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-1",
      "username": "john.doe",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "operator",
      "permissions": ["view:equipment", "view:alerts", "acknowledge:alerts"],
      "department": "Production",
      "createdAt": "2023-01-15T08:30:00Z",
      "updatedAt": "2023-05-10T14:45:00Z"
    }
  }
}`}
                </code>
              </pre>
            </section>

            {/* Other API sections */}
            <section id="integration-api" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Integration API</h2>
              <p>
                The Integration API provides endpoints for managing connections to external manufacturing systems.
                For detailed documentation, please refer to the <a href="#" className="text-blue-600 hover:underline">Integration API Guide</a>.
              </p>
            </section>

            <section id="admin-api" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin API</h2>
              <p>
                The Admin API provides endpoints for platform administration and configuration.
                For detailed documentation, please refer to the <a href="#" className="text-blue-600 hover:underline">Admin API Guide</a>.
              </p>
            </section>

            <section id="websocket-api" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">WebSocket API</h2>
              <p>
                The WebSocket API provides real-time updates and notifications for manufacturing events.
                For detailed documentation, please refer to the <a href="#" className="text-blue-600 hover:underline">WebSocket API Guide</a>.
              </p>
            </section>

            {/* API Resources */}
            <section id="postman-collection" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Postman Collection</h2>
              <p>
                We provide a Postman collection that includes all API endpoints with example requests and responses. 
                You can download the collection and import it into Postman to quickly start exploring the API.
              </p>
              <div className="mt-4">
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Postman Collection
                </a>
              </div>
            </section>

            <section id="openapi-spec" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">OpenAPI Specification</h2>
              <p>
                The API is documented using the OpenAPI Specification (formerly Swagger), which provides 
                a standardized format for describing RESTful APIs. You can use the OpenAPI specification 
                to generate client libraries, documentation, and test cases.
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download OpenAPI Spec (YAML)
                </a>
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download OpenAPI Spec (JSON)
                </a>
              </div>
            </section>

            <section id="code-examples" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Code Examples</h2>
              <p>
                The following examples demonstrate how to use the API in various programming languages.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">JavaScript</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`// Fetch equipment list
async function getEquipment() {
  const response = await fetch('https://api.your-domain.com/api/v1/equipment', {
    headers: {
      'Authorization': 'Bearer your-jwt-token',
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
}

// Create an alert
async function createAlert(alertData) {
  const response = await fetch('https://api.your-domain.com/api/v1/alerts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-jwt-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(alertData)
  });
  
  const data = await response.json();
  return data;
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Python</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`import requests

# Base URL for API
API_BASE_URL = 'https://api.your-domain.com/api/v1'
JWT_TOKEN = 'your-jwt-token'

# Headers for authentication
headers = {
    'Authorization': f'Bearer {JWT_TOKEN}',
    'Content-Type': 'application/json'
}

# Get equipment list
def get_equipment():
    response = requests.get(f'{API_BASE_URL}/equipment', headers=headers)
    response.raise_for_status()  # Raise exception for HTTP errors
    return response.json()

# Create an alert
def create_alert(alert_data):
    response = requests.post(
        f'{API_BASE_URL}/alerts',
        headers=headers,
        json=alert_data
    )
    response.raise_for_status()
    return response.json()`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Java</h3>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import com.fasterxml.jackson.databind.ObjectMapper;

public class ApiClient {
    private static final String API_BASE_URL = "https://api.your-domain.com/api/v1";
    private static final String JWT_TOKEN = "your-jwt-token";
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Get equipment list
    public String getEquipment() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(new URI(API_BASE_URL + "/equipment"))
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .header("Content-Type", "application/json")
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }

    // Create an alert
    public String createAlert(String alertData) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(new URI(API_BASE_URL + "/alerts"))
            .header("Authorization", "Bearer " + JWT_TOKEN)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(alertData))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }
}`}
                </code>
              </pre>
            </section>

            <section id="rate-limits" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Rate Limits</h2>
              <p>
                To ensure the stability and availability of the API, rate limits are applied to all endpoints. 
                Rate limits are based on the number of requests per minute from a specific IP address or API key.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Default Rate Limits</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Endpoint</th>
                      <th className="py-2 px-4 border-b text-left">Rate Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border-b">GET requests</td>
                      <td className="py-2 px-4 border-b">60 requests per minute</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">POST/PUT/DELETE requests</td>
                      <td className="py-2 px-4 border-b">30 requests per minute</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">Authentication endpoints</td>
                      <td className="py-2 px-4 border-b">10 requests per minute</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-b">Chat API</td>
                      <td className="py-2 px-4 border-b">20 requests per minute</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Rate Limit Headers</h3>
              <p>
                When you make an API request, the following headers are included in the response:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`X-Rate-Limit-Limit: 60
X-Rate-Limit-Remaining: 58
X-Rate-Limit-Reset: 1686927000`}
                </code>
              </pre>
              <ul className="list-disc pl-5 mt-4">
                <li><strong>X-Rate-Limit-Limit</strong>: The maximum number of requests allowed per minute</li>
                <li><strong>X-Rate-Limit-Remaining</strong>: The number of requests remaining in the current minute</li>
                <li><strong>X-Rate-Limit-Reset</strong>: The time at which the rate limit will reset (Unix timestamp)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Rate Limit Exceeded</h3>
              <p>
                If you exceed the rate limit, you'll receive a 429 Too Many Requests response with the following body:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`{
  "status": "error",
  "message": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 60,
    "reset": 1686927000
  }
}`}
                </code>
              </pre>
              <p className="mt-4">
                To handle rate limits gracefully, implement exponential backoff and retry mechanisms in your client applications.
              </p>
            </section>

            {/* Export Options */}
            <section id="export-options" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">API Reference Export</h2>
              <p className="mb-4">
                The API reference can be exported in various formats for offline access or distribution:
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 5a1 1 0 00-1-1H8a1 1 0 100 2h4a1 1 0 001-1z" clipRule="evenodd" />
                  </svg>
                  PDF Version
                </a>
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                  </svg>
                  EPUB Version
                </a>
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0H5v10h10V5z" clipRule="evenodd" />
                  </svg>
                  HTML Version
                </a>
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 2H8.828a2 2 0 00-1.414.586L6.293 3.707A1 1 0 015.586 4H4zm.5 2A.5.5 0 004 6.5v7a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-7a.5.5 0 00-.5-.5h-11z" clipRule="evenodd" />
                  </svg>
                  Markdown
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}