# Database Schema Summary - Manufacturing Analytics Platform

## Overview
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Features**: Full-text search, indexes for performance optimization

## Models and Their Fields

### 1. Equipment
**Purpose**: Tracks all manufacturing equipment/machines

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated CUID |
| name | String | ✅ | Equipment name |
| type | String | ✅ | Equipment type (CNC, Robot, etc.) |
| manufacturerCode | String | ✅ | Manufacturer's code |
| serialNumber | String | ✅ | Unique serial number |
| installationDate | DateTime | ✅ | When installed |
| status | String | ✅ | operational/maintenance/offline/error |
| location | String | ❌ | Physical location |
| description | String | ❌ | Equipment description |
| model | String | ❌ | Model number |
| lastMaintenanceAt | DateTime | ❌ | Last maintenance date |

**Relationships**:
- Has many: ProductionLine[], MaintenanceRecord[], PerformanceMetric[], QualityMetric[], Alert[], Metric[]

### 2. ProductionLine
**Purpose**: Production lines that may have multiple equipment

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| name | String | ✅ | Line name |
| department | String | ✅ | Department |
| description | String | ❌ | Description |
| status | String | ✅ | active/inactive/maintenance |

**Relationships**:
- Has many: Equipment[], ProductionOrder[], PerformanceMetric[]

### 3. ProductionOrder
**Purpose**: Manufacturing orders on production lines

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| orderNumber | String | ✅ | Unique order number |
| productionLineId | String | ✅ | Foreign key |
| product | String | ✅ | Product name |
| quantity | Int | ✅ | Quantity to produce |
| targetStartDate | DateTime | ✅ | Planned start |
| targetEndDate | DateTime | ✅ | Planned end |
| actualStartDate | DateTime | ❌ | Actual start |
| actualEndDate | DateTime | ❌ | Actual end |
| status | String | ✅ | scheduled/in-progress/completed/cancelled |
| priority | Int | ✅ | 1-5 (1 = highest) |

**Relationships**:
- Belongs to: ProductionLine
- Has many: QualityCheck[]

### 4. MaintenanceRecord
**Purpose**: Maintenance history and schedules

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| equipmentId | String | ✅ | Foreign key |
| maintenanceType | String | ✅ | preventive/corrective/predictive |
| description | String | ✅ | What was done |
| technician | String | ✅ | Who did it |
| startTime | DateTime | ✅ | Start time |
| endTime | DateTime | ❌ | End time |
| status | String | ✅ | scheduled/in-progress/completed |
| notes | String | ❌ | Additional notes |
| parts | String[] | ✅ | Parts used (array) |

**Relationships**:
- Belongs to: Equipment

### 5. PerformanceMetric
**Purpose**: OEE and performance tracking

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| equipmentId | String | ❌ | Can be null |
| productionLineId | String | ❌ | Can be null |
| timestamp | DateTime | ✅ | When measured |
| availability | Float | ❌ | 0-1 scale |
| performance | Float | ❌ | 0-1 scale |
| quality | Float | ❌ | 0-1 scale |
| oeeScore | Float | ❌ | Calculated OEE |
| runTime | Float | ❌ | Minutes |
| plannedDowntime | Float | ❌ | Minutes |
| unplannedDowntime | Float | ❌ | Minutes |
| totalParts | Int | ❌ | Total produced |
| goodParts | Int | ❌ | Good parts |
| shift | String | ❌ | morning/afternoon/night |
| operator | String | ❌ | Operator name |

**Relationships**:
- Belongs to: Equipment (optional), ProductionLine (optional)

### 6. QualityMetric
**Purpose**: Quality measurements for equipment

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| equipmentId | String | ✅ | Foreign key |
| timestamp | DateTime | ✅ | When measured |
| parameter | String | ✅ | What was measured |
| value | Float | ✅ | Measured value |
| uom | String | ✅ | Unit of measure |
| lowerLimit | Float | ❌ | Lower spec limit |
| upperLimit | Float | ❌ | Upper spec limit |
| nominal | Float | ❌ | Target value |
| isWithinSpec | Boolean | ✅ | Pass/fail |
| deviation | Float | ❌ | From nominal |

**Relationships**:
- Belongs to: Equipment

### 7. QualityCheck
**Purpose**: Quality inspections for production orders

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| productionOrderId | String | ✅ | Foreign key |
| checkType | String | ✅ | in-process/final/pre-delivery |
| inspector | String | ✅ | Who checked |
| timestamp | DateTime | ✅ | When checked |
| result | String | ✅ | pass/fail/conditional |
| notes | String | ❌ | Notes |
| defectTypes | String[] | ✅ | Types of defects (array) |
| defectCounts | Int[] | ✅ | Count per defect type (array) |

**Relationships**:
- Belongs to: ProductionOrder

### 8. Alert
**Purpose**: System alerts and notifications

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| equipmentId | String | ❌ | Can be system-wide |
| alertType | String | ✅ | maintenance/quality/performance/safety |
| severity | String | ✅ | low/medium/high/critical |
| message | String | ✅ | Alert message |
| status | String | ✅ | active/acknowledged/resolved/false-alarm |
| timestamp | DateTime | ✅ | When created |
| acknowledgedBy | String | ❌ | Who acknowledged |
| acknowledgedAt | DateTime | ❌ | When acknowledged |
| resolvedBy | String | ❌ | Who resolved |
| resolvedAt | DateTime | ❌ | When resolved |

**Relationships**:
- Belongs to: Equipment (optional)

### 9. Metric
**Purpose**: Time-series sensor data (Analytics replacement)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| timestamp | DateTime | ✅ | When measured |
| equipmentId | String | ✅ | Foreign key |
| name | String | ✅ | Metric name (temperature, pressure, etc.) |
| value | Float | ✅ | Measured value |
| unit | String | ❌ | Unit (°C, bar, etc.) |
| tags | Json | ❌ | Flexible tags for filtering |
| source | String | ❌ | Source system |
| quality | Float | ❌ | Data quality score (0-1) |

**Relationships**:
- Belongs to: Equipment

### 10. User
**Purpose**: System users

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| email | String | ✅ | Unique email |
| name | String | ❌ | Display name |
| role | String | ✅ | admin/manager/engineer/operator |
| department | String | ❌ | Department |
| passwordHash | String | ✅ | Hashed password |
| lastLogin | DateTime | ❌ | Last login time |

**Relationships**:
- Has many: Dashboard[]

### 11. Setting
**Purpose**: Application configuration

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| key | String | ✅ | Unique setting key |
| value | String | ✅ | Setting value |
| category | String | ✅ | system/user/notification/integration |

### 12. Dashboard
**Purpose**: Dashboard configurations (Analytics-like)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | String | ✅ | Auto-generated |
| uid | String | ✅ | Unique identifier |
| title | String | ✅ | Dashboard title |
| slug | String | ✅ | URL slug |
| panels | Json | ✅ | Panel configurations |
| variables | Json | ❌ | Dashboard variables |
| tags | String[] | ✅ | Tags for organization |
| createdBy | String | ❌ | User ID |

**Relationships**:
- Belongs to: User (optional)

## Key Points for Test Fixes

### ❌ Fields That Don't Exist (causing test failures):
- Equipment.specifications
- Equipment.productionLineId (use many-to-many relation)
- QualityCheck.measurements
- Metric.metadata
- QualityMetric.metricType
- QualityMetric.totalInspected
- QualityMetric.defectCount

### ✅ Required Fields Often Missing in Tests:
- Equipment.installationDate
- Equipment.manufacturerCode
- Equipment.serialNumber (must be unique)
- MaintenanceRecord.parts (empty array is fine)
- QualityCheck.defectTypes & defectCounts (empty arrays are fine)

### Relationship Notes:
- Equipment ↔ ProductionLine is many-to-many
- Equipment has direct metrics via Metric model
- PerformanceMetric can belong to Equipment OR ProductionLine
- All timestamp fields default to now() if not specified