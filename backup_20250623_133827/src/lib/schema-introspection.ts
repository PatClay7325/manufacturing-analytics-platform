/**
 * Dynamic Schema Introspection Utility
 * Provides runtime field detection and mapping for Prisma models
 * to ensure APIs remain functional even when schema changes
 */

import { prisma } from '@/lib/prisma';

interface FieldMapping {
  [key: string]: string[];
}

interface ModelIntrospection {
  availableFields: string[];
  fieldMappings: FieldMapping;
}

/**
 * Common field aliases for backward compatibility
 * Maps standardized field names to possible schema variations
 */
export const FIELD_ALIASES: FieldMapping = {
  // Production quantity fields
  totalParts: ['totalParts', 'totalPartsProduced', 'partsProduced', 'totalUnits', 'unitsProduced'],
  goodParts: ['goodParts', 'goodUnits', 'acceptedParts', 'passedParts'],
  rejectedParts: ['rejectedParts', 'rejectParts', 'defectiveParts', 'failedParts', 'scrapParts'],
  reworkParts: ['reworkParts', 'reworkUnits', 'repairedParts'],
  plannedProduction: ['plannedProduction', 'targetProduction', 'plannedUnits', 'targetUnits'],
  
  // OEE component fields
  availability: ['availability', 'uptime', 'uptimeRatio'],
  performance: ['performance', 'performanceRate', 'speedRatio'],
  quality: ['quality', 'qualityRate', 'firstPassYield', 'fpyRate'],
  oeeScore: ['oeeScore', 'oee', 'overallEffectiveness'],
  
  // Time-related fields
  operatingTime: ['operatingTime', 'runTime', 'activeTime'],
  plannedDowntime: ['plannedDowntime', 'scheduledDowntime'],
  unplannedDowntime: ['unplannedDowntime', 'unscheduledDowntime', 'breakdownTime'],
  
  // Cycle time fields
  idealCycleTime: ['idealCycleTime', 'targetCycleTime', 'standardCycleTime'],
  actualCycleTime: ['actualCycleTime', 'realCycleTime', 'currentCycleTime'],
  
  // Throughput fields
  throughputRate: ['throughputRate', 'productionRate', 'outputRate'],
  targetThroughput: ['targetThroughput', 'plannedThroughput', 'expectedThroughput'],
  
  // Quality metrics
  firstPassYield: ['firstPassYield', 'fpyRate', 'qualityRate', 'passRate'],
  scrapRate: ['scrapRate', 'defectRate', 'rejectRate'],
  reworkRate: ['reworkRate', 'repairRate'],
  
  // Equipment identification
  machineName: ['machineName', 'equipmentName', 'workUnitName', 'deviceName'],
  workUnitId: ['workUnitId', 'equipmentId', 'machineId', 'unitId'],
  
  // Context fields
  shift: ['shift', 'shiftName', 'workShift'],
  productType: ['productType', 'product', 'partType', 'itemType'],
  operatorName: ['operatorName', 'operator', 'worker', 'technician'],
  
  // Location fields
  plant: ['plant', 'facility', 'site', 'location'],
  area: ['area', 'department', 'zone', 'section'],
  cellWorkCenter: ['cellWorkCenter', 'workCenter', 'cell', 'station'],
};

/**
 * Introspect a Prisma model to discover available fields
 */
export async function introspectModel(modelName: string): Promise<ModelIntrospection> {
  try {
    // Get a sample record to inspect available fields
    const sampleRecord = await (prisma as any)[modelName].findFirst();
    
    let availableFields: string[] = [];
    
    if (sampleRecord) {
      availableFields = Object.keys(sampleRecord);
    } else {
      // If no records exist, try to get field info from Prisma's introspection
      // This is a fallback approach
      console.warn(`No sample records found for model ${modelName}. Using default field mappings.`);
      availableFields = getDefaultFieldsForModel(modelName);
    }
    
    // Create field mappings based on available fields
    const fieldMappings: FieldMapping = {};
    
    for (const [standardField, aliases] of Object.entries(FIELD_ALIASES)) {
      const availableAlias = aliases.find(alias => availableFields.includes(alias));
      if (availableAlias) {
        fieldMappings[standardField] = [availableAlias];
      }
    }
    
    return {
      availableFields,
      fieldMappings
    };
  } catch (error) {
    console.error(`Error introspecting model ${modelName}:`, error);
    
    // Return default mappings as fallback
    return {
      availableFields: getDefaultFieldsForModel(modelName),
      fieldMappings: getDefaultFieldMappingsForModel(modelName)
    };
  }
}

/**
 * Get the actual field name for a standardized field in a specific model
 */
export function resolveFieldName(
  standardFieldName: string, 
  modelIntrospection: ModelIntrospection
): string | null {
  const mapping = modelIntrospection.fieldMappings[standardFieldName];
  if (mapping && mapping.length > 0) {
    return mapping[0];
  }
  
  // Check if the standard field name exists directly
  if (modelIntrospection.availableFields.includes(standardFieldName)) {
    return standardFieldName;
  }
  
  return null;
}

/**
 * Create a dynamic select object for Prisma queries
 */
export function createDynamicSelect(
  requestedFields: string[],
  modelIntrospection: ModelIntrospection
): Record<string, boolean> {
  const selectObject: Record<string, boolean> = {};
  
  for (const field of requestedFields) {
    const actualFieldName = resolveFieldName(field, modelIntrospection);
    if (actualFieldName) {
      selectObject[actualFieldName] = true;
    }
  }
  
  // Always include essential fields
  selectObject.id = true;
  selectObject.timestamp = true;
  
  return selectObject;
}

/**
 * Transform query results to use standardized field names
 */
export function normalizeQueryResult(
  result: any,
  modelIntrospection: ModelIntrospection
): any {
  if (!result) return result;
  
  if (Array.isArray(result)) {
    return result.map(item => normalizeQueryResult(item, modelIntrospection));
  }
  
  const normalized: any = {};
  
  // Copy all original fields first
  Object.assign(normalized, result);
  
  // Add standardized field names
  for (const [standardField, mapping] of Object.entries(modelIntrospection.fieldMappings)) {
    if (mapping.length > 0) {
      const actualField = mapping[0];
      if (result[actualField] !== undefined) {
        normalized[standardField] = result[actualField];
      }
    }
  }
  
  return normalized;
}

/**
 * Handle multiple field variations for aggregation queries
 */
export function createDynamicAggregation(
  standardFieldName: string,
  modelIntrospection: ModelIntrospection,
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'sum'
): Record<string, any> {
  const actualField = resolveFieldName(standardFieldName, modelIntrospection);
  
  if (!actualField) {
    return {};
  }
  
  return {
    [operation]: {
      [actualField]: true
    }
  };
}

/**
 * Combine values from multiple possible field names
 * Useful for handling legacy data with different field names
 */
export function combineFieldValues(
  record: any,
  fieldAliases: string[],
  defaultValue: number = 0
): number {
  for (const field of fieldAliases) {
    if (record[field] !== null && record[field] !== undefined) {
      return Number(record[field]) || defaultValue;
    }
  }
  return defaultValue;
}

/**
 * Combine string values from multiple possible field names
 * Useful for handling legacy data with different field names
 */
export function combineStringFieldValues(
  record: any,
  fieldAliases: string[],
  defaultValue: string = 'Unknown'
): string {
  for (const field of fieldAliases) {
    if (record[field] !== null && record[field] !== undefined && record[field] !== '') {
      return String(record[field]);
    }
  }
  return defaultValue;
}

/**
 * Default field mappings for common models (fallback)
 */
function getDefaultFieldMappingsForModel(modelName: string): FieldMapping {
  const commonMappings: FieldMapping = {};
  
  if (modelName === 'performanceMetric') {
    Object.assign(commonMappings, {
      totalParts: ['totalParts'],
      goodParts: ['goodParts'],
      rejectedParts: ['rejectedParts'],
      availability: ['availability'],
      performance: ['performance'],
      quality: ['quality'],
      oeeScore: ['oeeScore'],
      machineName: ['machineName'],
      shift: ['shift'],
      productType: ['productType']
    });
  }
  
  return commonMappings;
}

/**
 * Default fields for common models (fallback)
 */
function getDefaultFieldsForModel(modelName: string): string[] {
  const commonFields = ['id', 'timestamp', 'createdAt', 'updatedAt'];
  
  if (modelName === 'performanceMetric') {
    return [
      ...commonFields,
      'totalParts', 'goodParts', 'rejectedParts', 'reworkParts',
      'availability', 'performance', 'quality', 'oeeScore',
      'machineName', 'shift', 'productType', 'operatorName'
    ];
  }
  
  if (modelName === 'qualityMetric') {
    return [
      ...commonFields,
      'parameter', 'value', 'uom', 'nominal', 'isWithinSpec',
      'qualityGrade', 'cpk', 'ppk', 'defectType', 'machineName'
    ];
  }
  
  return commonFields;
}

/**
 * Cache for model introspections to avoid repeated queries
 */
const introspectionCache = new Map<string, ModelIntrospection>();

/**
 * Get cached or fresh model introspection
 */
export async function getCachedModelIntrospection(modelName: string): Promise<ModelIntrospection> {
  if (introspectionCache.has(modelName)) {
    return introspectionCache.get(modelName)!;
  }
  
  const introspection = await introspectModel(modelName);
  introspectionCache.set(modelName, introspection);
  
  // Clear cache after 5 minutes to allow for schema updates
  setTimeout(() => {
    introspectionCache.delete(modelName);
  }, 5 * 60 * 1000);
  
  return introspection;
}