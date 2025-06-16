import { ValidationOptions, ValidationResult } from './BaseValidator';
import { ISO14224Validator, ISO14224DataCategory } from './standards/ISO14224Validator';
import { ISO22400Validator, ISO22400KPICategory, ISO22400Level } from './standards/ISO22400Validator';
import { validationRegistry } from './ValidationRegistry';

/**
 * Example: Validate equipment data against ISO 14224 standard
 */
async function validateEquipmentData(equipmentData: any, options?: ValidationOptions): Promise<ValidationResult> {
  // Get validator from registry
  const validator = validationRegistry.getValidator({
    standard: 'ISO14224',
    version: '2016',
    dataType: ISO14224DataCategory.EQUIPMENT
  });
  
  if (!validator) {
    throw new Error('ISO 14224 validator not found in registry');
  }
  
  // Validate the data
  return validator.validate(equipmentData, options);
}

/**
 * Example: Validate manufacturing KPI data against ISO 22400 standard
 */
async function validateKPIData(kpiData: any, options?: ValidationOptions): Promise<ValidationResult> {
  // Get validator from registry
  const validator = validationRegistry.getValidator({
    standard: 'ISO22400',
    version: '2014',
    dataType: ISO22400KPICategory.EFFICIENCY
  });
  
  if (!validator) {
    throw new Error('ISO 22400 validator not found in registry');
  }
  
  // Validate the data
  return validator.validate(kpiData, options);
}

/**
 * Example: Create validators directly without using the registry
 */
function createValidatorsDirectly() {
  // Create ISO 14224 validator
  const iso14224Validator = new ISO14224Validator();
  
  // Create ISO 22400 validator
  const iso22400Validator = new ISO22400Validator();
  
  return {
    iso14224Validator,
    iso22400Validator
  };
}

/**
 * Example: Sample equipment data for ISO 14224
 */
const sampleEquipmentData = {
  equipmentId: 'PUMP-101',
  taxonomyLevel: 6, // Equipment unit
  industryCode: 'MFG',
  businessCategory: 'Discrete Manufacturing',
  installation: 'Plant A',
  plantUnit: 'Assembly Line 1',
  sectionSystem: 'Hydraulic System',
  equipmentUnit: 'Pump Assembly',
  manufacturer: 'Acme Pumps',
  modelNumber: 'AP-2000',
  serialNumber: 'SN12345',
  installationDate: '2022-01-15',
  operatingContext: {
    phase: 'Production',
    mode: 'Automatic',
    environment: 'Indoor'
  }
};

/**
 * Example: Sample KPI data for ISO 22400
 */
const sampleKPIData = {
  kpiId: 'OEE-LINE1-2023-06',
  name: 'oee',
  category: ISO22400KPICategory.EFFICIENCY,
  value: 85.2,
  unitOfMeasure: '%',
  timestamp: '2023-06-15T14:30:00Z',
  level: ISO22400Level.WORK_CENTER,
  workElementId: 'LINE1',
  context: {
    productId: 'PROD-A',
    orderId: 'ORD-12345',
    shift: 'Morning'
  },
  timeRange: {
    start: '2023-06-15T06:00:00Z',
    end: '2023-06-15T14:00:00Z'
  },
  components: {
    availability: 92.5,
    efficiency: 94.3,
    quality_ratio: 97.6
  },
  formula: 'availability * efficiency * quality_ratio / 10000',
  target: 90.0,
  minimum: 75.0,
  maximum: 100.0
};

/**
 * Example: Using the validators in a data processing pipeline
 */
async function processManufacturingData(data: any[]): Promise<any[]> {
  const processedData = [];
  const validationErrors = [];
  
  for (const item of data) {
    // Determine data type and get appropriate validator
    let validator;
    let validationOptions: ValidationOptions = {
      strictMode: true,
      validateRelationships: true
    };
    
    if (item.equipmentId && item.taxonomyLevel) {
      // Equipment data - use ISO 14224
      validator = validationRegistry.getValidator({
        standard: 'ISO14224',
        version: '2016',
        dataType: ISO14224DataCategory.EQUIPMENT
      });
    } else if (item.kpiId && item.category) {
      // KPI data - use ISO 22400
      validator = validationRegistry.getValidator({
        standard: 'ISO22400',
        version: '2014',
        dataType: item.category
      });
    } else {
      // Unknown data type
      validationErrors.push({
        item,
        error: 'Unknown data type, no validator available'
      });
      continue;
    }
    
    if (!validator) {
      validationErrors.push({
        item,
        error: 'No validator found for data type'
      });
      continue;
    }
    
    // Validate the data
    const validationResult = await Promise.resolve(validator.validate(item, validationOptions));
    
    if (validationResult.isValid) {
      // Data is valid, process it
      processedData.push(item);
    } else {
      // Data is invalid, record the errors
      validationErrors.push({
        item,
        validationResult
      });
    }
  }
  
  // Log validation errors for monitoring
  if (validationErrors.length > 0) {
    console.error(`Validation errors: ${validationErrors.length}`);
    console.error(JSON.stringify(validationErrors, null, 2));
  }
  
  return processedData;
}

// Export examples
export {
  validateEquipmentData,
  validateKPIData,
  createValidatorsDirectly,
  sampleEquipmentData,
  sampleKPIData,
  processManufacturingData
};