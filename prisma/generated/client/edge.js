
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/edge.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.DimSiteScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  timezone: 'timezone'
};

exports.Prisma.DimAreaScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  siteId: 'siteId'
};

exports.Prisma.DimWorkCenterScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  areaId: 'areaId',
  capacity: 'capacity',
  capacityUnit: 'capacityUnit'
};

exports.Prisma.DimEquipmentScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'type',
  workCenterId: 'workCenterId',
  manufacturer: 'manufacturer',
  model: 'model',
  serialNumber: 'serialNumber',
  installationDate: 'installationDate',
  criticalityLevel: 'criticalityLevel',
  theoreticalRate: 'theoreticalRate',
  attributes: 'attributes',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DimProductScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  family: 'family',
  unitOfMeasure: 'unitOfMeasure',
  standardCost: 'standardCost',
  targetCycleTime: 'targetCycleTime'
};

exports.Prisma.DimShiftScalarFieldEnum = {
  id: 'id',
  siteId: 'siteId',
  name: 'name',
  startTime: 'startTime',
  endTime: 'endTime',
  breakMinutes: 'breakMinutes',
  isActive: 'isActive'
};

exports.Prisma.DimDowntimeReasonScalarFieldEnum = {
  id: 'id',
  code: 'code',
  description: 'description',
  category: 'category',
  isPlanned: 'isPlanned',
  affectsOee: 'affectsOee',
  isFailure: 'isFailure'
};

exports.Prisma.DimUnitScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'type'
};

exports.Prisma.FactProductionScalarFieldEnum = {
  id: 'id',
  dateId: 'dateId',
  shiftId: 'shiftId',
  equipmentId: 'equipmentId',
  productId: 'productId',
  orderNumber: 'orderNumber',
  startTime: 'startTime',
  endTime: 'endTime',
  plannedProductionTime: 'plannedProductionTime',
  operatingTime: 'operatingTime',
  plannedParts: 'plannedParts',
  totalPartsProduced: 'totalPartsProduced',
  goodParts: 'goodParts',
  scrapParts: 'scrapParts',
  reworkParts: 'reworkParts',
  operatorId: 'operatorId',
  createdAt: 'createdAt'
};

exports.Prisma.FactDowntimeScalarFieldEnum = {
  id: 'id',
  productionId: 'productionId',
  equipmentId: 'equipmentId',
  reasonId: 'reasonId',
  startTime: 'startTime',
  endTime: 'endTime',
  downtimeDuration: 'downtimeDuration',
  comments: 'comments',
  createdAt: 'createdAt'
};

exports.Prisma.FactScrapScalarFieldEnum = {
  id: 'id',
  productionId: 'productionId',
  productId: 'productId',
  scrapCode: 'scrapCode',
  scrapQty: 'scrapQty',
  scrapCost: 'scrapCost',
  createdAt: 'createdAt'
};

exports.Prisma.FactMaintenanceScalarFieldEnum = {
  id: 'id',
  equipmentId: 'equipmentId',
  workOrderNumber: 'workOrderNumber',
  maintenanceType: 'maintenanceType',
  startTime: 'startTime',
  endTime: 'endTime',
  laborHours: 'laborHours',
  materialCost: 'materialCost',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.FactSensorEventScalarFieldEnum = {
  eventId: 'eventId',
  equipmentId: 'equipmentId',
  eventTs: 'eventTs',
  parameter: 'parameter',
  value: 'value',
  unitId: 'unitId'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  username: 'username',
  action: 'action',
  tableName: 'tableName',
  recordId: 'recordId',
  logTs: 'logTs',
  beforeData: 'beforeData',
  afterData: 'afterData'
};

exports.Prisma.AuditEventScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  aggregateId: 'aggregateId',
  aggregateType: 'aggregateType',
  eventData: 'eventData',
  eventMetadata: 'eventMetadata',
  userId: 'userId',
  correlationId: 'correlationId',
  causationId: 'causationId',
  createdAt: 'createdAt'
};

exports.Prisma.DataDictionaryScalarFieldEnum = {
  id: 'id',
  schemaName: 'schemaName',
  tableName: 'tableName',
  columnName: 'columnName',
  dataType: 'dataType',
  isNullable: 'isNullable',
  description: 'description',
  businessName: 'businessName',
  dataSteward: 'dataSteward',
  classification: 'classification',
  piiFlag: 'piiFlag',
  retentionDays: 'retentionDays',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DataRetentionPolicyScalarFieldEnum = {
  id: 'id',
  tableName: 'tableName',
  retentionDays: 'retentionDays',
  archiveEnabled: 'archiveEnabled',
  archiveTableName: 'archiveTableName',
  lastArchived: 'lastArchived',
  createdAt: 'createdAt'
};

exports.Prisma.QueryPerformanceScalarFieldEnum = {
  id: 'id',
  queryHash: 'queryHash',
  queryText: 'queryText',
  totalTime: 'totalTime',
  meanTime: 'meanTime',
  maxTime: 'maxTime',
  minTime: 'minTime',
  calls: 'calls',
  rows: 'rows',
  capturedAt: 'capturedAt'
};

exports.Prisma.DataQualityScoresScalarFieldEnum = {
  id: 'id',
  tableName: 'tableName',
  checkName: 'checkName',
  checkType: 'checkType',
  passed: 'passed',
  score: 'score',
  totalRows: 'totalRows',
  failedRows: 'failedRows',
  details: 'details',
  checkedAt: 'checkedAt'
};

exports.Prisma.SystemMetricsScalarFieldEnum = {
  id: 'id',
  metricType: 'metricType',
  metricName: 'metricName',
  metricValue: 'metricValue',
  metricUnit: 'metricUnit',
  hostName: 'hostName',
  serviceName: 'serviceName',
  tags: 'tags',
  collectedAt: 'collectedAt'
};

exports.Prisma.DimDateRangeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate'
};

exports.Prisma.OntologyTermScalarFieldEnum = {
  term: 'term',
  modelName: 'modelName',
  fieldName: 'fieldName',
  priority: 'priority'
};

exports.Prisma.ViewOeeDailyScalarFieldEnum = {
  dateId: 'dateId',
  shiftId: 'shiftId',
  equipmentId: 'equipmentId',
  availability: 'availability',
  performance: 'performance',
  quality: 'quality',
  oee: 'oee'
};

exports.Prisma.ViewReliabilitySummaryScalarFieldEnum = {
  equipmentId: 'equipmentId',
  equipmentCode: 'equipmentCode',
  equipmentName: 'equipmentName',
  mtbfHours: 'mtbfHours',
  mttrHours: 'mttrHours',
  failureCount: 'failureCount'
};

exports.Prisma.ViewScrapSummaryScalarFieldEnum = {
  dateId: 'dateId',
  equipmentId: 'equipmentId',
  productId: 'productId',
  scrapCode: 'scrapCode',
  scrapReason: 'scrapReason',
  totalScrapQty: 'totalScrapQty',
  scrapIncidents: 'scrapIncidents',
  scrapCost: 'scrapCost'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  DimSite: 'DimSite',
  DimArea: 'DimArea',
  DimWorkCenter: 'DimWorkCenter',
  DimEquipment: 'DimEquipment',
  DimProduct: 'DimProduct',
  DimShift: 'DimShift',
  DimDowntimeReason: 'DimDowntimeReason',
  DimUnit: 'DimUnit',
  FactProduction: 'FactProduction',
  FactDowntime: 'FactDowntime',
  FactScrap: 'FactScrap',
  FactMaintenance: 'FactMaintenance',
  FactSensorEvent: 'FactSensorEvent',
  AuditLog: 'AuditLog',
  AuditEvent: 'AuditEvent',
  DataDictionary: 'DataDictionary',
  DataRetentionPolicy: 'DataRetentionPolicy',
  QueryPerformance: 'QueryPerformance',
  DataQualityScores: 'DataQualityScores',
  SystemMetrics: 'SystemMetrics',
  DimDateRange: 'DimDateRange',
  OntologyTerm: 'OntologyTerm',
  ViewOeeDaily: 'ViewOeeDaily',
  ViewReliabilitySummary: 'ViewReliabilitySummary',
  ViewScrapSummary: 'ViewScrapSummary'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "/mnt/d/Source/manufacturing-analytics-platform/prisma/generated/client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "debian-openssl-3.0.x",
        "native": true
      },
      {
        "fromEnvVar": null,
        "value": "windows"
      },
      {
        "fromEnvVar": null,
        "value": "debian-openssl-3.0.x"
      },
      {
        "fromEnvVar": null,
        "value": "linux-musl-openssl-3.0.x"
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "/mnt/d/Source/manufacturing-analytics-platform/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../../../.env"
  },
  "relativePath": "../..",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "// =============================================================================\n// LOCKED PRODUCTION SCHEMA - DO NOT MODIFY DIRECTLY\n// =============================================================================\n// This file is PROTECTED and should only be modified through controlled\n// database migration processes. Unauthorized changes will break production.\n//\n// Last Updated: 2024-06-25\n// Version: 1.0.0-PRODUCTION\n// Protection Level: LOCKED\n// =============================================================================\n\ngenerator client {\n  provider      = \"prisma-client-js\"\n  output        = \"./generated/client\"\n  binaryTargets = [\"native\", \"windows\", \"debian-openssl-3.0.x\", \"linux-musl-openssl-3.0.x\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n// =============================================================================\n// PRODUCTION-READY DIMENSION TABLES\n// =============================================================================\n\nmodel DimSite {\n  id       Int        @id @default(autoincrement()) @map(\"site_id\")\n  code     String     @unique @map(\"site_code\") @db.VarChar(20)\n  name     String     @map(\"site_name\") @db.VarChar(100)\n  timezone String?    @default(\"UTC\") @db.VarChar(50)\n  areas    DimArea[]\n  shifts   DimShift[]\n\n  @@map(\"dim_site\")\n}\n\nmodel DimArea {\n  id          Int             @id @default(autoincrement()) @map(\"area_id\")\n  code        String          @unique @map(\"area_code\") @db.VarChar(20)\n  name        String          @map(\"area_name\") @db.VarChar(100)\n  siteId      Int             @map(\"site_id\")\n  site        DimSite         @relation(fields: [siteId], references: [id])\n  workCenters DimWorkCenter[]\n\n  @@map(\"dim_area\")\n}\n\nmodel DimWorkCenter {\n  id           Int            @id @default(autoincrement()) @map(\"work_center_id\")\n  code         String         @unique @map(\"work_center_code\") @db.VarChar(20)\n  name         String         @map(\"work_center_name\") @db.VarChar(100)\n  areaId       Int            @map(\"area_id\")\n  capacity     Decimal?       @db.Decimal(10, 2)\n  capacityUnit String?        @map(\"capacity_unit\") @db.VarChar(20)\n  area         DimArea        @relation(fields: [areaId], references: [id])\n  equipment    DimEquipment[]\n\n  @@map(\"dim_work_center\")\n}\n\nmodel DimEquipment {\n  id               Int       @id @default(autoincrement()) @map(\"equipment_id\")\n  code             String    @unique @map(\"equipment_code\") @db.VarChar(50)\n  name             String    @map(\"equipment_name\") @db.VarChar(200)\n  type             String?   @map(\"equipment_type\") @db.VarChar(50)\n  workCenterId     Int       @map(\"work_center_id\")\n  manufacturer     String?   @db.VarChar(100)\n  model            String?   @db.VarChar(100)\n  serialNumber     String?   @map(\"serial_number\") @db.VarChar(100)\n  installationDate DateTime? @map(\"installation_date\") @db.Date\n  criticalityLevel String?   @map(\"criticality_level\") @db.VarChar(20)\n  theoreticalRate  Decimal?  @map(\"theoretical_rate\") @db.Decimal(10, 2)\n  attributes       Json?     @db.JsonB\n  isActive         Boolean?  @default(true) @map(\"is_active\")\n  createdAt        DateTime? @default(now()) @map(\"created_at\") @db.Timestamptz(6)\n  updatedAt        DateTime? @updatedAt @map(\"updated_at\") @db.Timestamptz(6)\n\n  workCenter   DimWorkCenter     @relation(fields: [workCenterId], references: [id])\n  production   FactProduction[]\n  downtime     FactDowntime[]\n  maintenance  FactMaintenance[]\n  sensorEvents FactSensorEvent[]\n\n  @@index([attributes], type: Gin)\n  @@index([workCenterId, isActive])\n  @@map(\"dim_equipment\")\n}\n\nmodel DimProduct {\n  id              Int              @id @default(autoincrement()) @map(\"product_id\")\n  code            String           @unique @map(\"product_code\") @db.VarChar(50)\n  name            String           @map(\"product_name\") @db.VarChar(200)\n  family          String?          @map(\"product_family\") @db.VarChar(100)\n  unitOfMeasure   String?          @default(\"EA\") @map(\"unit_of_measure\") @db.VarChar(20)\n  standardCost    Decimal?         @map(\"standard_cost\") @db.Decimal(12, 4)\n  targetCycleTime BigInt?          @map(\"target_cycle_time\")\n  production      FactProduction[]\n  scrap           FactScrap[]\n\n  @@map(\"dim_product\")\n}\n\nmodel DimShift {\n  id           Int              @id @default(autoincrement()) @map(\"shift_id\")\n  siteId       Int              @map(\"site_id\")\n  name         String           @map(\"shift_name\") @db.VarChar(50)\n  startTime    String           @map(\"start_time\") @db.VarChar(8)\n  endTime      String           @map(\"end_time\") @db.VarChar(8)\n  breakMinutes Int?             @default(0) @map(\"break_minutes\")\n  isActive     Boolean?         @default(true) @map(\"is_active\")\n  site         DimSite          @relation(fields: [siteId], references: [id])\n  production   FactProduction[]\n\n  @@unique([siteId, name])\n  @@map(\"dim_shift\")\n}\n\nmodel DimDowntimeReason {\n  id          Int            @id @default(autoincrement()) @map(\"reason_id\")\n  code        String         @unique @map(\"reason_code\") @db.VarChar(50)\n  description String         @map(\"reason_description\") @db.VarChar(200)\n  category    String         @map(\"reason_category\") @db.VarChar(50)\n  isPlanned   Boolean?       @default(false) @map(\"is_planned\")\n  affectsOee  Boolean?       @default(true) @map(\"affects_oee\")\n  isFailure   Boolean?       @default(false) @map(\"is_failure\")\n  downtime    FactDowntime[]\n\n  @@map(\"dim_downtime_reason\")\n}\n\nmodel DimUnit {\n  id           Int               @id @default(autoincrement()) @map(\"unit_id\")\n  code         String            @unique @map(\"unit_code\") @db.VarChar(20)\n  name         String            @map(\"unit_name\") @db.VarChar(50)\n  type         String            @map(\"unit_type\") @db.VarChar(50)\n  sensorEvents FactSensorEvent[]\n\n  @@map(\"dim_unit\")\n}\n\n// =============================================================================\n// PRODUCTION-READY FACT TABLES\n// =============================================================================\n\nmodel FactProduction {\n  id                    Int       @id @default(autoincrement()) @map(\"production_id\")\n  dateId                Int       @map(\"date_id\")\n  shiftId               Int       @map(\"shift_id\")\n  equipmentId           Int       @map(\"equipment_id\")\n  productId             Int       @map(\"product_id\")\n  orderNumber           String?   @map(\"order_number\") @db.VarChar(50)\n  startTime             DateTime  @map(\"start_time\") @db.Timestamptz(6)\n  endTime               DateTime  @map(\"end_time\") @db.Timestamptz(6)\n  plannedProductionTime BigInt    @map(\"planned_production_time\")\n  operatingTime         BigInt    @map(\"operating_time\")\n  plannedParts          Int       @map(\"planned_parts\")\n  totalPartsProduced    Int       @map(\"total_parts_produced\")\n  goodParts             Int       @map(\"good_parts\")\n  scrapParts            Int?      @default(0) @map(\"scrap_parts\")\n  reworkParts           Int?      @default(0) @map(\"rework_parts\")\n  operatorId            String?   @map(\"operator_id\") @db.VarChar(50)\n  createdAt             DateTime? @default(now()) @map(\"created_at\") @db.Timestamptz(6)\n\n  equipment DimEquipment   @relation(fields: [equipmentId], references: [id])\n  product   DimProduct     @relation(fields: [productId], references: [id])\n  shift     DimShift       @relation(fields: [shiftId], references: [id])\n  downtime  FactDowntime[]\n  scrap     FactScrap[]\n\n  @@index([startTime], type: Brin)\n  @@index([equipmentId, startTime(sort: Desc)])\n  @@map(\"fact_production\")\n}\n\nmodel FactDowntime {\n  id               Int       @id @default(autoincrement()) @map(\"downtime_id\")\n  productionId     Int?      @map(\"production_id\")\n  equipmentId      Int       @map(\"equipment_id\")\n  reasonId         Int       @map(\"reason_id\")\n  startTime        DateTime  @map(\"start_time\") @db.Timestamptz(6)\n  endTime          DateTime  @map(\"end_time\") @db.Timestamptz(6)\n  downtimeDuration BigInt    @map(\"downtime_duration\")\n  comments         String?\n  createdAt        DateTime? @default(now()) @map(\"created_at\") @db.Timestamptz(6)\n\n  equipment  DimEquipment      @relation(fields: [equipmentId], references: [id])\n  reason     DimDowntimeReason @relation(fields: [reasonId], references: [id])\n  production FactProduction?   @relation(fields: [productionId], references: [id])\n\n  @@index([startTime], type: Brin)\n  @@index([equipmentId, startTime(sort: Desc)])\n  @@map(\"fact_downtime\")\n}\n\nmodel FactScrap {\n  id           Int       @id @default(autoincrement()) @map(\"scrap_id\")\n  productionId Int       @map(\"production_id\")\n  productId    Int       @map(\"product_id\")\n  scrapCode    String    @map(\"scrap_code\") @db.VarChar(50)\n  scrapQty     Int       @map(\"scrap_qty\")\n  scrapCost    Decimal?  @map(\"scrap_cost\") @db.Decimal(12, 2)\n  createdAt    DateTime? @default(now()) @map(\"created_at\") @db.Timestamptz(6)\n\n  product    DimProduct     @relation(fields: [productId], references: [id])\n  production FactProduction @relation(fields: [productionId], references: [id])\n\n  @@map(\"fact_scrap\")\n}\n\nmodel FactMaintenance {\n  id              Int       @id @default(autoincrement()) @map(\"maintenance_id\")\n  equipmentId     Int       @map(\"equipment_id\")\n  workOrderNumber String    @map(\"work_order_number\") @db.VarChar(50)\n  maintenanceType String    @map(\"maintenance_type\") @db.VarChar(50)\n  startTime       DateTime  @map(\"start_time\") @db.Timestamptz(6)\n  endTime         DateTime  @map(\"end_time\") @db.Timestamptz(6)\n  laborHours      Decimal?  @map(\"labor_hours\") @db.Decimal(10, 2)\n  materialCost    Decimal?  @map(\"material_cost\") @db.Decimal(12, 2)\n  description     String?\n  createdAt       DateTime? @default(now()) @map(\"created_at\") @db.Timestamptz(6)\n\n  equipment DimEquipment @relation(fields: [equipmentId], references: [id])\n\n  @@map(\"fact_maintenance\")\n}\n\n// PARTITIONED TABLE - Handle with care\nmodel FactSensorEvent {\n  eventId     BigInt   @default(autoincrement()) @map(\"event_id\")\n  equipmentId Int      @map(\"equipment_id\")\n  eventTs     DateTime @map(\"event_ts\") @db.Timestamptz(6)\n  parameter   String   @db.VarChar(100)\n  value       Decimal  @db.Decimal(20, 6)\n  unitId      Int?     @map(\"unit_id\")\n\n  equipment DimEquipment @relation(fields: [equipmentId], references: [id])\n  unit      DimUnit?     @relation(fields: [unitId], references: [id])\n\n  @@id([eventId, eventTs])\n  @@index([equipmentId, eventTs(sort: Desc)])\n  @@index([eventTs], type: Brin)\n  @@map(\"fact_sensor_event\")\n}\n\n// =============================================================================\n// AUDIT & MONITORING (Partitioned)\n// =============================================================================\n\nmodel AuditLog {\n  id         BigInt    @id @default(autoincrement()) @map(\"log_id\")\n  username   String?   @db.VarChar(100)\n  action     String    @db.VarChar(20)\n  tableName  String    @map(\"table_name\") @db.VarChar(100)\n  recordId   String    @map(\"record_id\") @db.VarChar(100)\n  logTs      DateTime? @default(now()) @map(\"log_ts\") @db.Timestamptz(6)\n  beforeData Json?     @map(\"before_data\") @db.JsonB\n  afterData  Json?     @map(\"after_data\") @db.JsonB\n\n  @@index([afterData], type: Gin)\n  @@index([beforeData], type: Gin)\n  @@index([tableName, logTs(sort: Desc)])\n  @@map(\"audit_log\")\n}\n\n// EVENT STORE (Partitioned by month)\nmodel AuditEvent {\n  id            BigInt   @id @default(autoincrement()) @map(\"event_id\")\n  eventType     String   @map(\"event_type\")\n  aggregateId   String   @map(\"aggregate_id\")\n  aggregateType String   @map(\"aggregate_type\")\n  eventData     Json     @map(\"event_data\") @db.JsonB\n  eventMetadata Json?    @map(\"event_metadata\") @db.JsonB\n  userId        String?  @map(\"user_id\")\n  correlationId String?  @map(\"correlation_id\")\n  causationId   String?  @map(\"causation_id\")\n  createdAt     DateTime @default(now()) @map(\"created_at\") @db.Timestamptz(6)\n\n  @@index([aggregateType, aggregateId, createdAt(sort: Desc)])\n  @@index([eventType, createdAt(sort: Desc)])\n  @@index([correlationId])\n  @@map(\"audit_event\")\n}\n\n// =============================================================================\n// DATA GOVERNANCE\n// =============================================================================\n\nmodel DataDictionary {\n  id             Int       @id @default(autoincrement())\n  schemaName     String    @map(\"schema_name\")\n  tableName      String    @map(\"table_name\")\n  columnName     String    @map(\"column_name\")\n  dataType       String    @map(\"data_type\")\n  isNullable     Boolean   @map(\"is_nullable\")\n  description    String?\n  businessName   String?   @map(\"business_name\")\n  dataSteward    String?   @map(\"data_steward\")\n  classification String?\n  piiFlag        Boolean?  @default(false) @map(\"pii_flag\")\n  retentionDays  Int?      @map(\"retention_days\")\n  createdAt      DateTime? @default(now()) @map(\"created_at\") @db.Timestamptz(6)\n  updatedAt      DateTime? @updatedAt @map(\"updated_at\") @db.Timestamptz(6)\n\n  @@unique([schemaName, tableName, columnName])\n  @@map(\"data_dictionary\")\n}\n\nmodel DataRetentionPolicy {\n  id               Int       @id @default(autoincrement())\n  tableName        String    @unique @map(\"table_name\")\n  retentionDays    Int       @map(\"retention_days\")\n  archiveEnabled   Boolean?  @default(false) @map(\"archive_enabled\")\n  archiveTableName String?   @map(\"archive_table_name\")\n  lastArchived     DateTime? @map(\"last_archived\") @db.Timestamptz(6)\n  createdAt        DateTime? @default(now()) @map(\"created_at\") @db.Timestamptz(6)\n\n  @@map(\"data_retention_policy\")\n}\n\n// =============================================================================\n// MONITORING SCHEMA\n// =============================================================================\n\nmodel QueryPerformance {\n  id         Int      @id @default(autoincrement())\n  queryHash  String   @map(\"query_hash\")\n  queryText  String?  @map(\"query_text\")\n  totalTime  Decimal  @map(\"total_time\") @db.Decimal(12, 3)\n  meanTime   Decimal  @map(\"mean_time\") @db.Decimal(12, 3)\n  maxTime    Decimal  @map(\"max_time\") @db.Decimal(12, 3)\n  minTime    Decimal  @map(\"min_time\") @db.Decimal(12, 3)\n  calls      BigInt\n  rows       BigInt\n  capturedAt DateTime @default(now()) @map(\"captured_at\") @db.Timestamptz(6)\n\n  @@map(\"query_performance\")\n}\n\nmodel DataQualityScores {\n  id         Int      @id @default(autoincrement())\n  tableName  String   @map(\"table_name\")\n  checkName  String   @map(\"check_name\")\n  checkType  String   @map(\"check_type\")\n  passed     Boolean\n  score      Decimal  @db.Decimal(5, 2)\n  totalRows  BigInt?  @map(\"total_rows\")\n  failedRows BigInt?  @map(\"failed_rows\")\n  details    Json?    @db.JsonB\n  checkedAt  DateTime @default(now()) @map(\"checked_at\") @db.Timestamptz(6)\n\n  @@map(\"data_quality_scores\")\n}\n\nmodel SystemMetrics {\n  id          Int      @id @default(autoincrement())\n  metricType  String   @map(\"metric_type\")\n  metricName  String   @map(\"metric_name\")\n  metricValue Decimal  @map(\"metric_value\") @db.Decimal(20, 6)\n  metricUnit  String?  @map(\"metric_unit\")\n  hostName    String?  @map(\"host_name\")\n  serviceName String?  @map(\"service_name\")\n  tags        Json?    @db.JsonB\n  collectedAt DateTime @default(now()) @map(\"collected_at\") @db.Timestamptz(6)\n\n  @@index([metricType, collectedAt(sort: Desc)])\n  @@index([serviceName, collectedAt(sort: Desc)])\n  @@map(\"system_metrics\")\n}\n\n// =============================================================================\n// AI ENHANCEMENT MODELS\n// =============================================================================\n\nmodel DimDateRange {\n  id        Int      @id @default(autoincrement()) @map(\"range_id\")\n  name      String   @unique\n  startDate DateTime @map(\"start_date\") @db.Date\n  endDate   DateTime @map(\"end_date\") @db.Date\n\n  @@map(\"dim_date_range\")\n}\n\nmodel OntologyTerm {\n  term      String @id\n  modelName String @map(\"model_name\")\n  fieldName String @map(\"field_name\")\n  priority  Int    @default(0)\n\n  @@index([modelName, fieldName])\n  @@map(\"ontology_term\")\n}\n\n// =============================================================================\n// MATERIALIZED VIEWS (Read-only)\n// =============================================================================\n\n/// Daily OEE metrics by equipment and shift\nmodel ViewOeeDaily {\n  dateId       DateTime @map(\"date_id\") @db.Date\n  shiftId      Int      @map(\"shift_id\")\n  equipmentId  Int      @map(\"equipment_id\")\n  availability Float    @db.Real\n  performance  Float    @db.Real\n  quality      Float    @db.Real\n  oee          Float    @db.Real\n\n  @@id([dateId, shiftId, equipmentId])\n  @@map(\"view_oee_daily\")\n}\n\n/// Equipment reliability summary (MTBF, MTTR)\nmodel ViewReliabilitySummary {\n  equipmentId   Int    @id @map(\"equipment_id\")\n  equipmentCode String @map(\"equipment_code\") @db.VarChar(50)\n  equipmentName String @map(\"equipment_name\") @db.VarChar(200)\n  mtbfHours     Float  @map(\"mtbf_hours\") @db.Real\n  mttrHours     Float  @map(\"mttr_hours\") @db.Real\n  failureCount  Int    @map(\"failure_count\")\n\n  @@map(\"view_reliability_summary\")\n}\n\n/// Scrap/quality summary by date, equipment, and product\nmodel ViewScrapSummary {\n  dateId         DateTime @map(\"date_id\") @db.Date\n  equipmentId    Int      @map(\"equipment_id\")\n  productId      Int      @map(\"product_id\")\n  scrapCode      String   @map(\"scrap_code\") @db.VarChar(50)\n  scrapReason    String?  @map(\"scrap_reason\") @db.VarChar(200)\n  totalScrapQty  Int      @map(\"total_scrap_qty\")\n  scrapIncidents Int      @map(\"scrap_incidents\")\n  scrapCost      Decimal? @map(\"scrap_cost\") @db.Decimal(12, 2)\n\n  @@id([dateId, equipmentId, productId, scrapCode])\n  @@map(\"view_scrap_summary\")\n}\n\n// =============================================================================\n// END OF LOCKED PRODUCTION SCHEMA\n// =============================================================================\n",
  "inlineSchemaHash": "6a26be1dc3c86c840c6e699c2ee54954a29f4865cb0d49696baa40fbfb57f5e6",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"DimSite\":{\"dbName\":\"dim_site\",\"fields\":[{\"name\":\"id\",\"dbName\":\"site_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"dbName\":\"site_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"dbName\":\"site_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"timezone\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"UTC\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"areas\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimArea\",\"relationName\":\"DimAreaToDimSite\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shifts\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimShift\",\"relationName\":\"DimShiftToDimSite\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DimArea\":{\"dbName\":\"dim_area\",\"fields\":[{\"name\":\"id\",\"dbName\":\"area_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"dbName\":\"area_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"dbName\":\"area_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siteId\",\"dbName\":\"site_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"site\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimSite\",\"relationName\":\"DimAreaToDimSite\",\"relationFromFields\":[\"siteId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"workCenters\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimWorkCenter\",\"relationName\":\"DimAreaToDimWorkCenter\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DimWorkCenter\":{\"dbName\":\"dim_work_center\",\"fields\":[{\"name\":\"id\",\"dbName\":\"work_center_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"dbName\":\"work_center_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"dbName\":\"work_center_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"areaId\",\"dbName\":\"area_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"capacity\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"capacityUnit\",\"dbName\":\"capacity_unit\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"area\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimArea\",\"relationName\":\"DimAreaToDimWorkCenter\",\"relationFromFields\":[\"areaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipment\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimEquipment\",\"relationName\":\"DimEquipmentToDimWorkCenter\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DimEquipment\":{\"dbName\":\"dim_equipment\",\"fields\":[{\"name\":\"id\",\"dbName\":\"equipment_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"dbName\":\"equipment_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"dbName\":\"equipment_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"type\",\"dbName\":\"equipment_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"workCenterId\",\"dbName\":\"work_center_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"manufacturer\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"model\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"serialNumber\",\"dbName\":\"serial_number\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"installationDate\",\"dbName\":\"installation_date\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"criticalityLevel\",\"dbName\":\"criticality_level\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"theoreticalRate\",\"dbName\":\"theoretical_rate\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"attributes\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isActive\",\"dbName\":\"is_active\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"workCenter\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimWorkCenter\",\"relationName\":\"DimEquipmentToDimWorkCenter\",\"relationFromFields\":[\"workCenterId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"production\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactProduction\",\"relationName\":\"DimEquipmentToFactProduction\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"downtime\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactDowntime\",\"relationName\":\"DimEquipmentToFactDowntime\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"maintenance\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactMaintenance\",\"relationName\":\"DimEquipmentToFactMaintenance\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sensorEvents\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactSensorEvent\",\"relationName\":\"DimEquipmentToFactSensorEvent\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DimProduct\":{\"dbName\":\"dim_product\",\"fields\":[{\"name\":\"id\",\"dbName\":\"product_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"dbName\":\"product_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"dbName\":\"product_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"family\",\"dbName\":\"product_family\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"unitOfMeasure\",\"dbName\":\"unit_of_measure\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"EA\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"standardCost\",\"dbName\":\"standard_cost\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"targetCycleTime\",\"dbName\":\"target_cycle_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"production\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactProduction\",\"relationName\":\"DimProductToFactProduction\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrap\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactScrap\",\"relationName\":\"DimProductToFactScrap\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DimShift\":{\"dbName\":\"dim_shift\",\"fields\":[{\"name\":\"id\",\"dbName\":\"shift_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siteId\",\"dbName\":\"site_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"dbName\":\"shift_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startTime\",\"dbName\":\"start_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"endTime\",\"dbName\":\"end_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"breakMinutes\",\"dbName\":\"break_minutes\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isActive\",\"dbName\":\"is_active\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"site\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimSite\",\"relationName\":\"DimShiftToDimSite\",\"relationFromFields\":[\"siteId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"production\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactProduction\",\"relationName\":\"DimShiftToFactProduction\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"siteId\",\"name\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"siteId\",\"name\"]}],\"isGenerated\":false},\"DimDowntimeReason\":{\"dbName\":\"dim_downtime_reason\",\"fields\":[{\"name\":\"id\",\"dbName\":\"reason_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"dbName\":\"reason_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"dbName\":\"reason_description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"category\",\"dbName\":\"reason_category\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isPlanned\",\"dbName\":\"is_planned\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"affectsOee\",\"dbName\":\"affects_oee\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isFailure\",\"dbName\":\"is_failure\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"downtime\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactDowntime\",\"relationName\":\"DimDowntimeReasonToFactDowntime\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DimUnit\":{\"dbName\":\"dim_unit\",\"fields\":[{\"name\":\"id\",\"dbName\":\"unit_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"dbName\":\"unit_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"dbName\":\"unit_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"type\",\"dbName\":\"unit_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sensorEvents\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactSensorEvent\",\"relationName\":\"DimUnitToFactSensorEvent\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"FactProduction\":{\"dbName\":\"fact_production\",\"fields\":[{\"name\":\"id\",\"dbName\":\"production_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"dateId\",\"dbName\":\"date_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shiftId\",\"dbName\":\"shift_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipmentId\",\"dbName\":\"equipment_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productId\",\"dbName\":\"product_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"orderNumber\",\"dbName\":\"order_number\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startTime\",\"dbName\":\"start_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"endTime\",\"dbName\":\"end_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"plannedProductionTime\",\"dbName\":\"planned_production_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"operatingTime\",\"dbName\":\"operating_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"plannedParts\",\"dbName\":\"planned_parts\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalPartsProduced\",\"dbName\":\"total_parts_produced\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"goodParts\",\"dbName\":\"good_parts\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrapParts\",\"dbName\":\"scrap_parts\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"reworkParts\",\"dbName\":\"rework_parts\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"operatorId\",\"dbName\":\"operator_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipment\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimEquipment\",\"relationName\":\"DimEquipmentToFactProduction\",\"relationFromFields\":[\"equipmentId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"product\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimProduct\",\"relationName\":\"DimProductToFactProduction\",\"relationFromFields\":[\"productId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shift\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimShift\",\"relationName\":\"DimShiftToFactProduction\",\"relationFromFields\":[\"shiftId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"downtime\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactDowntime\",\"relationName\":\"FactDowntimeToFactProduction\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrap\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactScrap\",\"relationName\":\"FactProductionToFactScrap\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"FactDowntime\":{\"dbName\":\"fact_downtime\",\"fields\":[{\"name\":\"id\",\"dbName\":\"downtime_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productionId\",\"dbName\":\"production_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipmentId\",\"dbName\":\"equipment_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"reasonId\",\"dbName\":\"reason_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startTime\",\"dbName\":\"start_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"endTime\",\"dbName\":\"end_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"downtimeDuration\",\"dbName\":\"downtime_duration\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"comments\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipment\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimEquipment\",\"relationName\":\"DimEquipmentToFactDowntime\",\"relationFromFields\":[\"equipmentId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"reason\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimDowntimeReason\",\"relationName\":\"DimDowntimeReasonToFactDowntime\",\"relationFromFields\":[\"reasonId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"production\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactProduction\",\"relationName\":\"FactDowntimeToFactProduction\",\"relationFromFields\":[\"productionId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"FactScrap\":{\"dbName\":\"fact_scrap\",\"fields\":[{\"name\":\"id\",\"dbName\":\"scrap_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productionId\",\"dbName\":\"production_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productId\",\"dbName\":\"product_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrapCode\",\"dbName\":\"scrap_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrapQty\",\"dbName\":\"scrap_qty\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrapCost\",\"dbName\":\"scrap_cost\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"product\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimProduct\",\"relationName\":\"DimProductToFactScrap\",\"relationFromFields\":[\"productId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"production\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FactProduction\",\"relationName\":\"FactProductionToFactScrap\",\"relationFromFields\":[\"productionId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"FactMaintenance\":{\"dbName\":\"fact_maintenance\",\"fields\":[{\"name\":\"id\",\"dbName\":\"maintenance_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipmentId\",\"dbName\":\"equipment_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"workOrderNumber\",\"dbName\":\"work_order_number\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"maintenanceType\",\"dbName\":\"maintenance_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startTime\",\"dbName\":\"start_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"endTime\",\"dbName\":\"end_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"laborHours\",\"dbName\":\"labor_hours\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"materialCost\",\"dbName\":\"material_cost\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipment\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimEquipment\",\"relationName\":\"DimEquipmentToFactMaintenance\",\"relationFromFields\":[\"equipmentId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"FactSensorEvent\":{\"dbName\":\"fact_sensor_event\",\"fields\":[{\"name\":\"eventId\",\"dbName\":\"event_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipmentId\",\"dbName\":\"equipment_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"eventTs\",\"dbName\":\"event_ts\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"parameter\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"value\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"unitId\",\"dbName\":\"unit_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipment\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimEquipment\",\"relationName\":\"DimEquipmentToFactSensorEvent\",\"relationFromFields\":[\"equipmentId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"unit\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DimUnit\",\"relationName\":\"DimUnitToFactSensorEvent\",\"relationFromFields\":[\"unitId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"eventId\",\"eventTs\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"AuditLog\":{\"dbName\":\"audit_log\",\"fields\":[{\"name\":\"id\",\"dbName\":\"log_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"username\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"action\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tableName\",\"dbName\":\"table_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"recordId\",\"dbName\":\"record_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"logTs\",\"dbName\":\"log_ts\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"beforeData\",\"dbName\":\"before_data\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"afterData\",\"dbName\":\"after_data\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"AuditEvent\":{\"dbName\":\"audit_event\",\"fields\":[{\"name\":\"id\",\"dbName\":\"event_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BigInt\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"eventType\",\"dbName\":\"event_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"aggregateId\",\"dbName\":\"aggregate_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"aggregateType\",\"dbName\":\"aggregate_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"eventData\",\"dbName\":\"event_data\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"eventMetadata\",\"dbName\":\"event_metadata\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"dbName\":\"user_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"correlationId\",\"dbName\":\"correlation_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"causationId\",\"dbName\":\"causation_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DataDictionary\":{\"dbName\":\"data_dictionary\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"schemaName\",\"dbName\":\"schema_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tableName\",\"dbName\":\"table_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"columnName\",\"dbName\":\"column_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"dataType\",\"dbName\":\"data_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isNullable\",\"dbName\":\"is_nullable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Boolean\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"businessName\",\"dbName\":\"business_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"dataSteward\",\"dbName\":\"data_steward\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"classification\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"piiFlag\",\"dbName\":\"pii_flag\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"retentionDays\",\"dbName\":\"retention_days\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueFields\":[[\"schemaName\",\"tableName\",\"columnName\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"schemaName\",\"tableName\",\"columnName\"]}],\"isGenerated\":false},\"DataRetentionPolicy\":{\"dbName\":\"data_retention_policy\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tableName\",\"dbName\":\"table_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"retentionDays\",\"dbName\":\"retention_days\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"archiveEnabled\",\"dbName\":\"archive_enabled\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"archiveTableName\",\"dbName\":\"archive_table_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"lastArchived\",\"dbName\":\"last_archived\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"QueryPerformance\":{\"dbName\":\"query_performance\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"queryHash\",\"dbName\":\"query_hash\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"queryText\",\"dbName\":\"query_text\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalTime\",\"dbName\":\"total_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"meanTime\",\"dbName\":\"mean_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"maxTime\",\"dbName\":\"max_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"minTime\",\"dbName\":\"min_time\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"calls\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rows\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"capturedAt\",\"dbName\":\"captured_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DataQualityScores\":{\"dbName\":\"data_quality_scores\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tableName\",\"dbName\":\"table_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"checkName\",\"dbName\":\"check_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"checkType\",\"dbName\":\"check_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"passed\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Boolean\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"score\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalRows\",\"dbName\":\"total_rows\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"failedRows\",\"dbName\":\"failed_rows\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BigInt\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"details\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"checkedAt\",\"dbName\":\"checked_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"SystemMetrics\":{\"dbName\":\"system_metrics\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"metricType\",\"dbName\":\"metric_type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"metricName\",\"dbName\":\"metric_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"metricValue\",\"dbName\":\"metric_value\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"metricUnit\",\"dbName\":\"metric_unit\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"hostName\",\"dbName\":\"host_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"serviceName\",\"dbName\":\"service_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tags\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"collectedAt\",\"dbName\":\"collected_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DimDateRange\":{\"dbName\":\"dim_date_range\",\"fields\":[{\"name\":\"id\",\"dbName\":\"range_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startDate\",\"dbName\":\"start_date\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"endDate\",\"dbName\":\"end_date\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"OntologyTerm\":{\"dbName\":\"ontology_term\",\"fields\":[{\"name\":\"term\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"modelName\",\"dbName\":\"model_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fieldName\",\"dbName\":\"field_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"priority\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ViewOeeDaily\":{\"dbName\":\"view_oee_daily\",\"fields\":[{\"name\":\"dateId\",\"dbName\":\"date_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"shiftId\",\"dbName\":\"shift_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipmentId\",\"dbName\":\"equipment_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"availability\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"performance\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"quality\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"oee\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"dateId\",\"shiftId\",\"equipmentId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false,\"documentation\":\"Daily OEE metrics by equipment and shift\"},\"ViewReliabilitySummary\":{\"dbName\":\"view_reliability_summary\",\"fields\":[{\"name\":\"equipmentId\",\"dbName\":\"equipment_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipmentCode\",\"dbName\":\"equipment_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipmentName\",\"dbName\":\"equipment_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"mtbfHours\",\"dbName\":\"mtbf_hours\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"mttrHours\",\"dbName\":\"mttr_hours\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"failureCount\",\"dbName\":\"failure_count\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false,\"documentation\":\"Equipment reliability summary (MTBF, MTTR)\"},\"ViewScrapSummary\":{\"dbName\":\"view_scrap_summary\",\"fields\":[{\"name\":\"dateId\",\"dbName\":\"date_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"equipmentId\",\"dbName\":\"equipment_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productId\",\"dbName\":\"product_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrapCode\",\"dbName\":\"scrap_code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrapReason\",\"dbName\":\"scrap_reason\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalScrapQty\",\"dbName\":\"total_scrap_qty\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrapIncidents\",\"dbName\":\"scrap_incidents\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"scrapCost\",\"dbName\":\"scrap_cost\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"dateId\",\"equipmentId\",\"productId\",\"scrapCode\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false,\"documentation\":\"Scrap/quality summary by date, equipment, and product\"}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = undefined

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

