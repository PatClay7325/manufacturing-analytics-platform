
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


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

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

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
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
