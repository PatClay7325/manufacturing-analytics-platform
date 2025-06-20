import { 
  ValidationError, 
  ValidationOptions, 
  ValidationResult, 
  ValidationWarning 
} from './BaseValidator';
import { Schema, SchemaValidator, SchemaValidationOptions } from './SchemaValidator';

/**
 * ISO22400 KPI categories
 */
export enum ISO22400KPICategory {
  TIME = 'time',
  QUALITY = 'quality',
  EFFICIENCY = 'efficiency',
  ENERGY = 'energy',
  INVENTORY = 'inventory',
  MAINTENANCE = 'maintenance',
  THROUGHPUT = 'throughput',
  STAFF = 'staff'
}

/**
 * ISO22400 hierarchical levels
 */
export enum ISO22400Level {
  ENTERPRISE = 'enterprise',
  SITE = 'site',
  AREA = 'area',
  WORK_CENTER = 'workCenter',
  WORK_UNIT = 'workUnit',
  EQUIPMENT = 'equipment'
}

/**
 * ISO22400 validation options
 */
export interface ISO22400ValidationOptions extends SchemaValidationOptions {
  validateUnitOfMeasure?: boolean;
  validateRanges?: boolean;
  validateFormulas?: boolean;
}

/**
 * ISO22400 validator for manufacturing operations KPIs
 * Implements ISO 22400 standard for Manufacturing operations management KPIs
 */
export class ISO22400Validator extends SchemaValidator {
  private static readonly KPI_SCHEMA: Schema = {
    type: 'object',
    properties: {
      kpiId: { type: 'string' },
      name: { type: 'string' },
      category: { 
        type: 'string', 
        enum: Object.values(ISO22400KPICategory)
      },
      value: { type: 'number' },
      timestamp: { type: 'string', format: 'date-time' },
      unitOfMeasure: { type: 'string' },
      level: { 
        type: 'string',
        enum: Object.values(ISO22400Level)
      },
      workElementId: { type: 'string' },
      context: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          orderId: { type: 'string' },
          shift: { type: 'string' },
          personnel: { type: 'string' }
        }
      },
      timeRange: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' }
        },
        required: ['start', 'end']
      },
      components: {
        type: 'object',
        additionalProperties: true
      },
      formula: { type: 'string' },
      target: { type: 'number' },
      minimum: { type: 'number' },
      maximum: { type: 'number' }
    },
    required: ['kpiId', 'name', 'category', 'value', 'timestamp', 'level'],
    additionalProperties: false
  };

  // Maps KPI categories to expected units of measure
  private unitOfMeasureMap: Map<ISO22400KPICategory, string[]>;
  
  // Maps KPI names to valid value ranges
  private kpiRangeMap: Map<string, [number, number]>;
  
  // Maps KPI names to their formula components
  private kpiFormulaMap: Map<string, string[]>;

  /**
   * Create a new ISO22400 validator
   */
  constructor() {
    super(
      'ISO22400Validator', 
      '2014', // ISO 22400:2014 is the current version
      ISO22400Validator.KPI_SCHEMA,
      Object.values(ISO22400KPICategory)
    );
    
    // Initialize unit of measure map
    this.unitOfMeasureMap = new Map();
    this.unitOfMeasureMap.set(ISO22400KPICategory.TIME, ['s', 'min', 'h', 'd']);
    this.unitOfMeasureMap.set(ISO22400KPICategory.QUALITY, ['%', 'ppm', 'count']);
    this.unitOfMeasureMap.set(ISO22400KPICategory.EFFICIENCY, ['%', 'ratio']);
    this.unitOfMeasureMap.set(ISO22400KPICategory.ENERGY, ['kWh', 'MJ', 'BTU']);
    this.unitOfMeasureMap.set(ISO22400KPICategory.INVENTORY, ['count', 'kg', 'lb']);
    this.unitOfMeasureMap.set(ISO22400KPICategory.MAINTENANCE, ['%', 'h', 'count']);
    this.unitOfMeasureMap.set(ISO22400KPICategory.THROUGHPUT, ['count/h', 'kg/h', 'units/h']);
    this.unitOfMeasureMap.set(ISO22400KPICategory.STAFF, ['count', 'h', '%']);
    
    // Initialize KPI range map
    this.kpiRangeMap = new Map();
    this.kpiRangeMap.set('availability', [0, 100]);
    this.kpiRangeMap.set('efficiency', [0, 100]);
    this.kpiRangeMap.set('quality_ratio', [0, 100]);
    this.kpiRangeMap.set('oee', [0, 100]);
    this.kpiRangeMap.set('scrap_ratio', [0, 100]);
    this.kpiRangeMap.set('rework_ratio', [0, 100]);
    this.kpiRangeMap.set('utilization', [0, 100]);
    
    // Initialize KPI formula components map
    this.kpiFormulaMap = new Map();
    this.kpiFormulaMap.set('availability', ['planned_busy_time', 'actual_busy_time']);
    this.kpiFormulaMap.set('efficiency', ['actual_busy_time', 'actual_execution_time']);
    this.kpiFormulaMap.set('quality_ratio', ['produced_quantity', 'good_quantity']);
    this.kpiFormulaMap.set('oee', ['availability', 'efficiency', 'quality_ratio']);
    this.kpiFormulaMap.set('throughput_rate', ['produced_quantity', 'production_time']);
    this.kpiFormulaMap.set('allocation_ratio', ['actual_order_execution_time', 'order_time']);
  }

  /**
   * Validate data against ISO 22400 standard
   * 
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validate(data: any, options?: ISO22400ValidationOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Set default options
    const opts: ISO22400ValidationOptions = {
      strictMode: true,
      validateUnitOfMeasure: true,
      validateRanges: true,
      validateFormulas: true,
      validateRelationships: true,
      validateCompleteness: true,
      ...options
    };
    
    // Run basic schema validation
    const schemaResult = super.validate(data, opts);
    
    // Add schema validation errors
    errors.push(...schemaResult.errors);
    if (schemaResult.warnings) {
      warnings.push(...schemaResult.warnings);
    }
    
    // Skip additional validations if basic schema validation failed
    if (errors.length > 0) {
      return this.createResult(false, errors, warnings);
    }
    
    // Perform additional validations
    if (opts.validateUnitOfMeasure) {
      this.validateUnitOfMeasure(data, errors, warnings);
    }
    
    if (opts.validateRanges) {
      this.validateValueRange(data, errors, warnings);
    }
    
    if (opts.validateFormulas) {
      this.validateFormula(data, errors, warnings);
    }
    
    if (opts.validateRelationships) {
      this.validateRelationships(data, errors, warnings);
    }
    
    return this.createResult(errors.length === 0, errors, warnings);
  }
  
  /**
   * Validate unit of measure against KPI category
   */
  private validateUnitOfMeasure(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object' || !data.category || !data.unitOfMeasure) {
      return;
    }
    
    const category = data.category as ISO22400KPICategory;
    const validUnits = this.unitOfMeasureMap.get(category) || [];
    
    if (!validUnits.includes(data.unitOfMeasure)) {
      warnings.push(this.createWarning(
        'iso22400.invalidUnitOfMeasure',
        `Unit of measure '${data.unitOfMeasure}' is not standard for KPI category '${category}'. Expected one of: ${validUnits.join(', ')}`,
        '/unitOfMeasure',
        data.unitOfMeasure
      ));
    }
    
    // Check for specific KPIs that have fixed units
    const kpiFixedUnits: { [key: string]: string } = {
      'availability': '%',
      'efficiency': '%',
      'quality_ratio': '%',
      'oee': '%',
      'utilization': '%'
    };
    
    const expectedUnit = kpiFixedUnits[data.name.toLowerCase()];
    if (expectedUnit && data.unitOfMeasure !== expectedUnit) {
      errors.push(this.createError(
        'iso22400.incorrectUnitOfMeasure',
        `KPI '${data.name}' must use unit of measure '${expectedUnit}', but got '${data.unitOfMeasure}'`,
        '/unitOfMeasure',
        data.unitOfMeasure
      ));
    }
  }
  
  /**
   * Validate KPI value against expected range
   */
  private validateValueRange(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object' || data.value === undefined || !data.name) {
      return;
    }
    
    // Check against defined ranges
    const range = this.kpiRangeMap.get(data.name.toLowerCase());
    if (range) {
      const [min, max] = range;
      
      if (data.value < min || data.value > max) {
        errors.push(this.createError(
          'iso22400.valueOutOfRange',
          `Value ${data.value} for KPI '${data.name}' is outside the expected range [${min}, ${max}]`,
          '/value',
          data.value
        ));
      }
    }
    
    // Check against user-defined min/max if provided
    if (data.minimum !== undefined && data.value < data.minimum) {
      errors.push(this.createError(
        'iso22400.valueBelowMinimum',
        `Value ${data.value} for KPI '${data.name}' is below the defined minimum ${data.minimum}`,
        '/value',
        data.value
      ));
    }
    
    if (data.maximum !== undefined && data.value > data.maximum) {
      errors.push(this.createError(
        'iso22400.valueAboveMaximum',
        `Value ${data.value} for KPI '${data.name}' is above the defined maximum ${data.maximum}`,
        '/value',
        data.value
      ));
    }
    
    // Warn if value is significantly different from target
    if (data.target !== undefined) {
      const deviation = Math.abs((data.value - data.target) / data.target) * 100;
      if (deviation > 20) {
        warnings.push(this.createWarning(
          'iso22400.significantTargetDeviation',
          `Value ${data.value} for KPI '${data.name}' deviates ${deviation.toFixed(1)}% from target}`,
          '/value',
          data.value
        ));
      }
    }
  }
  
  /**
   * Validate KPI formula components
   */
  private validateFormula(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object' || !data.name || !data.components) {
      return;
    }
    
    const requiredComponents = this.kpiFormulaMap.get(data.name.toLowerCase());
    if (!requiredComponents) {
      return;
    }
    
    // Check if all required components are present
    for (const component of requiredComponents) {
      if (data.components[component] === undefined) {
        errors.push(this.createError(
          'iso22400.missingFormulaComponent',
          `KPI '${data.name}' is missing required formula component '${component}'`,
          `/components/${component}`
        ));
      }
    }
    
    // For OEE, validate the formula calculation
    if (data.name.toLowerCase() === 'oee' && 
        data.components.availability !== undefined && 
        data.components.efficiency !== undefined && 
        data.components.quality_ratio !== undefined) {
        
      const { availability, efficiency, quality_ratio } = data.components;
      const expectedOEE = (availability * efficiency * quality_ratio) / 10000; // Convert from percentage
      const calculatedOEE = parseFloat(expectedOEE.toFixed(4));
      const actualOEE = parseFloat(data.value.toFixed(4));
      
      if (Math.abs(calculatedOEE - actualOEE) > 0.0001) {
        errors.push(this.createError(
          'iso22400.formulaCalculationError',
          `OEE value ${actualOEE} does not match calculated value ${calculatedOEE} from components (availability: ${availability}, efficiency: ${efficiency}, quality_ratio: ${quality_ratio})`,
          '/value',
          data.value
        ));
      }
    }
  }
  
  /**
   * Validate relationships between KPI data
   */
  private validateRelationships(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object') {
      return;
    }
    
    // Validate time range
    if (data.timeRange) {
      const { start, end } = data.timeRange;
      if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (endDate <= startDate) {
          errors.push(this.createError(
            'iso22400.invalidTimeRange',
            'Time range end must be after start',
            '/timeRange',
            data.timeRange
          ));
        }
        
        // Check if the timestamp is within the time range
        if (data.timestamp) {
          const timestampDate = new Date(data.timestamp);
          if (timestampDate < startDate || timestampDate > endDate) {
            warnings.push(this.createWarning(
              'iso22400.timestampOutsideRange',
              'Timestamp is outside the specified time range',
              '/timestamp',
              data.timestamp
            ));
          }
        }
      }
    }
    
    // Validate hierarchical consistency
    if (data.level === ISO22400Level.WORK_UNIT && !data.workElementId) {
      warnings.push(this.createWarning(
        'iso22400.missingWorkElementId',
        'Work element ID should be provided for work unit level KPIs',
        '/workElementId'
      ));
    }
    
    // Validate that throughput KPIs have production time component
    if (data.category === ISO22400KPICategory.THROUGHPUT && 
        data.components && 
        !data.components.production_time) {
      warnings.push(this.createWarning(
        'iso22400.missingProductionTime',
        'Throughput KPIs should include production time component',
        '/components/production_time'
      ));
    }
  }
}