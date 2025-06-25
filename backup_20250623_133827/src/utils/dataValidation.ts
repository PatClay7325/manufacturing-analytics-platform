/**
 * Data Validation Utilities for Manufacturing Metrics
 * Ensures data integrity and prevents impossible values
 */

export class DataValidationError extends Error {
  constructor(
    public field: string,
    public value: any,
    public constraint: string
  ) {
    super(`Validation failed for ${field}: ${value} - ${constraint}`);
    this.name = 'DataValidationError';
  }
}

export class ManufacturingDataValidator {
  /**
   * Validate percentage values (0-100)
   */
  static validatePercentage(value: number, fieldName: string): number {
    if (value < 0 || value > 100) {
      throw new DataValidationError(
        fieldName,
        value,
        'Must be between 0 and 100'
      );
    }
    return value;
  }

  /**
   * Validate OEE components
   */
  static validateOEEMetrics(data: {
    availability?: number;
    performance?: number;
    quality?: number;
    oeeScore?: number;
  }): void {
    if (data.availability !== undefined) {
      this.validatePercentage(data.availability, 'availability');
    }
    if (data.performance !== undefined) {
      this.validatePercentage(data.performance, 'performance');
    }
    if (data.quality !== undefined) {
      this.validatePercentage(data.quality, 'quality');
    }
    if (data.oeeScore !== undefined) {
      this.validatePercentage(data.oeeScore, 'oeeScore');
      
      // Validate OEE calculation if all components present
      if (data.availability && data.performance && data.quality) {
        const calculatedOEE = (data.availability * data.performance * data.quality) / 10000;
        if (Math.abs(calculatedOEE - data.oeeScore) > 1) {
          throw new DataValidationError(
            'oeeScore',
            data.oeeScore,
            `Does not match calculation (expected ~${calculatedOEE.toFixed(1)})`
          );
        }
      }
    }
  }

  /**
   * Validate time values
   */
  static validateTimeMetrics(data: {
    plannedProductionTime?: number;
    operatingTime?: number;
    runTime?: number;
    plannedDowntime?: number;
    unplannedDowntime?: number;
  }): void {
    const { 
      plannedProductionTime, 
      operatingTime, 
      runTime,
      plannedDowntime,
      unplannedDowntime
    } = data;

    if (plannedProductionTime !== undefined && plannedProductionTime < 0) {
      throw new DataValidationError(
        'plannedProductionTime',
        plannedProductionTime,
        'Must be non-negative'
      );
    }

    if (operatingTime !== undefined && plannedProductionTime !== undefined) {
      if (operatingTime > plannedProductionTime) {
        throw new DataValidationError(
          'operatingTime',
          operatingTime,
          `Cannot exceed planned production time (${plannedProductionTime})`
        );
      }
    }

    if (runTime !== undefined && operatingTime !== undefined) {
      if (runTime > operatingTime) {
        throw new DataValidationError(
          'runTime',
          runTime,
          `Cannot exceed operating time (${operatingTime})`
        );
      }
    }

    // Validate downtime doesn't exceed planned time
    if (plannedProductionTime !== undefined) {
      const totalDowntime = (plannedDowntime || 0) + (unplannedDowntime || 0);
      if (totalDowntime > plannedProductionTime) {
        throw new DataValidationError(
          'downtime',
          totalDowntime,
          `Total downtime cannot exceed planned production time (${plannedProductionTime})`
        );
      }
    }
  }

  /**
   * Validate production counts
   */
  static validateProductionCounts(data: {
    totalParts?: number;
    goodParts?: number;
    rejectedParts?: number;
    reworkParts?: number;
  }): void {
    const { totalParts, goodParts, rejectedParts, reworkParts } = data;

    if (totalParts !== undefined && totalParts < 0) {
      throw new DataValidationError('totalParts', totalParts, 'Must be non-negative');
    }

    if (goodParts !== undefined && totalParts !== undefined) {
      if (goodParts > totalParts) {
        throw new DataValidationError(
          'goodParts',
          goodParts,
          `Cannot exceed total parts (${totalParts})`
        );
      }
    }

    if (rejectedParts !== undefined && totalParts !== undefined) {
      if (rejectedParts > totalParts) {
        throw new DataValidationError(
          'rejectedParts',
          rejectedParts,
          `Cannot exceed total parts (${totalParts})`
        );
      }
    }

    // Validate sum doesn't exceed total
    if (totalParts !== undefined && goodParts !== undefined && rejectedParts !== undefined) {
      const sum = goodParts + rejectedParts;
      if (sum > totalParts) {
        throw new DataValidationError(
          'parts',
          sum,
          `Sum of good + rejected (${sum}) exceeds total (${totalParts})`
        );
      }
    }
  }

  /**
   * Validate equipment health metrics
   */
  static validateEquipmentHealth(data: {
    overallHealth?: number;
    mechanicalHealth?: number;
    electricalHealth?: number;
    softwareHealth?: number;
    mtbf?: number;
    mttr?: number;
    availability?: number;
    reliability?: number;
  }): void {
    // Validate health percentages
    const healthFields = [
      'overallHealth',
      'mechanicalHealth', 
      'electricalHealth',
      'softwareHealth',
      'availability',
      'reliability'
    ] as const;

    healthFields.forEach(field => {
      if (data[field] !== undefined) {
        this.validatePercentage(data[field]!, field);
      }
    });

    // Validate MTBF/MTTR
    if (data.mtbf !== undefined && data.mtbf < 0) {
      throw new DataValidationError('mtbf', data.mtbf, 'Must be non-negative');
    }

    if (data.mttr !== undefined && data.mttr < 0) {
      throw new DataValidationError('mttr', data.mttr, 'Must be non-negative');
    }

    // Validate availability calculation if MTBF and MTTR present
    if (data.mtbf !== undefined && data.mttr !== undefined && data.availability !== undefined) {
      const calculatedAvailability = (data.mtbf / (data.mtbf + data.mttr)) * 100;
      if (Math.abs(calculatedAvailability - data.availability) > 1) {
        throw new DataValidationError(
          'availability',
          data.availability,
          `Does not match MTBF/MTTR calculation (expected ~${calculatedAvailability.toFixed(1)})`
        );
      }
    }
  }

  /**
   * Validate quality metrics
   */
  static validateQualityMetrics(data: {
    value?: number;
    upperLimit?: number;
    lowerLimit?: number;
    nominal?: number;
    cpk?: number;
    zScore?: number;
  }): void {
    const { value, upperLimit, lowerLimit, nominal } = data;

    // Validate limits relationship
    if (upperLimit !== undefined && lowerLimit !== undefined) {
      if (upperLimit <= lowerLimit) {
        throw new DataValidationError(
          'limits',
          { upper: upperLimit, lower: lowerLimit },
          'Upper limit must be greater than lower limit'
        );
      }
    }

    // Validate nominal within limits
    if (nominal !== undefined && upperLimit !== undefined && lowerLimit !== undefined) {
      if (nominal < lowerLimit || nominal > upperLimit) {
        throw new DataValidationError(
          'nominal',
          nominal,
          `Must be between limits (${lowerLimit} - ${upperLimit})`
        );
      }
    }

    // Validate Cpk
    if (data.cpk !== undefined) {
      if (data.cpk < 0) {
        throw new DataValidationError('cpk', data.cpk, 'Must be non-negative');
      }
      if (data.cpk > 10) {
        throw new DataValidationError('cpk', data.cpk, 'Unusually high - verify calculation');
      }
    }
  }

  /**
   * Validate energy metrics
   */
  static validateEnergyMetrics(data: {
    electricalConsumption?: number;
    powerFactor?: number;
    renewablePercent?: number;
  }): void {
    if (data.electricalConsumption !== undefined && data.electricalConsumption < 0) {
      throw new DataValidationError(
        'electricalConsumption',
        data.electricalConsumption,
        'Must be non-negative'
      );
    }

    if (data.powerFactor !== undefined) {
      if (data.powerFactor < 0 || data.powerFactor > 1) {
        throw new DataValidationError(
          'powerFactor',
          data.powerFactor,
          'Must be between 0 and 1'
        );
      }
    }

    if (data.renewablePercent !== undefined) {
      this.validatePercentage(data.renewablePercent, 'renewablePercent');
    }
  }

  /**
   * Validate complete performance metric
   */
  static validatePerformanceMetric(data: any): void {
    this.validateOEEMetrics(data);
    this.validateTimeMetrics(data);
    this.validateProductionCounts(data);

    // Additional cross-field validations
    if (data.throughputRate !== undefined && data.throughputRate < 0) {
      throw new DataValidationError(
        'throughputRate',
        data.throughputRate,
        'Must be non-negative'
      );
    }

    if (data.targetThroughput !== undefined && data.targetThroughput < 0) {
      throw new DataValidationError(
        'targetThroughput',
        data.targetThroughput,
        'Must be non-negative'
      );
    }

    // Validate cycle times
    if (data.actualCycleTime !== undefined && data.idealCycleTime !== undefined) {
      if (data.actualCycleTime < data.idealCycleTime) {
        throw new DataValidationError(
          'actualCycleTime',
          data.actualCycleTime,
          `Cannot be less than ideal cycle time (${data.idealCycleTime})`
        );
      }
    }
  }
}

/**
 * Sanitize data by clamping values to valid ranges
 */
export class DataSanitizer {
  static clampPercentage(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  static sanitizeOEEMetrics(data: any): any {
    const sanitized = { ...data };
    
    if (sanitized.availability !== undefined) {
      sanitized.availability = this.clampPercentage(sanitized.availability);
    }
    if (sanitized.performance !== undefined) {
      sanitized.performance = this.clampPercentage(sanitized.performance);
    }
    if (sanitized.quality !== undefined) {
      sanitized.quality = this.clampPercentage(sanitized.quality);
    }
    if (sanitized.oeeScore !== undefined) {
      sanitized.oeeScore = this.clampPercentage(sanitized.oeeScore);
    }

    return sanitized;
  }

  static sanitizeProductionCounts(data: any): any {
    const sanitized = { ...data };

    // Ensure non-negative values
    ['totalParts', 'goodParts', 'rejectedParts', 'reworkParts'].forEach(field => {
      if (sanitized[field] !== undefined && sanitized[field] < 0) {
        sanitized[field] = 0;
      }
    });

    // Ensure good + rejected doesn't exceed total
    if (sanitized.totalParts !== undefined && 
        sanitized.goodParts !== undefined && 
        sanitized.rejectedParts !== undefined) {
      const sum = sanitized.goodParts + sanitized.rejectedParts;
      if (sum > sanitized.totalParts) {
        // Proportionally reduce both to fit
        const ratio = sanitized.totalParts / sum;
        sanitized.goodParts = Math.floor(sanitized.goodParts * ratio);
        sanitized.rejectedParts = sanitized.totalParts - sanitized.goodParts;
      }
    }

    return sanitized;
  }
}