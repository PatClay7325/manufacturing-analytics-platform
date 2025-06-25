/**
 * ISO 22400 KPI Standards Implementation
 * Implements Key Performance Indicators for manufacturing operations management
 */

export interface ISO22400_KPI {
  id: string;
  name: string;
  description: string;
  formula: string;
  unit: string;
  category: 'effectiveness' | 'efficiency' | 'quality' | 'capacity' | 'environmental' | 'inventory' | 'maintenance';
  level: 1 | 2 | 3; // KPI hierarchy level
}

export const ISO22400_KPIs: Record<string, ISO22400_KPI> = {
  // Level 1 - Strategic KPIs
  OEE: {
    id: 'OEE',
    name: 'Overall Equipment Effectiveness',
    description: 'Measures the overall effectiveness of equipment',
    formula: 'Availability × Performance × Quality',
    unit: '%',
    category: 'effectiveness',
    level: 1
  },
  
  OOE: {
    id: 'OOE',
    name: 'Overall Operations Effectiveness',
    description: 'Measures the overall effectiveness of operations',
    formula: 'Availability × Performance × Quality × Planning',
    unit: '%',
    category: 'effectiveness',
    level: 1
  },

  TEEP: {
    id: 'TEEP',
    name: 'Total Effective Equipment Performance',
    description: 'OEE × Loading',
    formula: 'OEE × (Scheduled Time / Calendar Time)',
    unit: '%',
    category: 'effectiveness',
    level: 1
  },

  // Level 2 - Tactical KPIs
  Availability: {
    id: 'A',
    name: 'Availability',
    description: 'Ratio of actual production time to planned production time',
    formula: '(Planned Production Time - Downtime) / Planned Production Time',
    unit: '%',
    category: 'efficiency',
    level: 2
  },

  Performance: {
    id: 'P',
    name: 'Performance Efficiency',
    description: 'Ratio of actual to theoretical production',
    formula: '(Actual Production / Theoretical Production)',
    unit: '%',
    category: 'efficiency',
    level: 2
  },

  Quality: {
    id: 'Q',
    name: 'Quality Rate',
    description: 'Ratio of good products to total products',
    formula: '(Total Production - Defective Production) / Total Production',
    unit: '%',
    category: 'quality',
    level: 2
  },

  // Level 3 - Operational KPIs
  MTBF: {
    id: 'MTBF',
    name: 'Mean Time Between Failures',
    description: 'Average time between equipment failures',
    formula: 'Total Operating Time / Number of Failures',
    unit: 'hours',
    category: 'maintenance',
    level: 3
  },

  MTTR: {
    id: 'MTTR',
    name: 'Mean Time To Repair',
    description: 'Average time to repair equipment',
    formula: 'Total Repair Time / Number of Repairs',
    unit: 'hours',
    category: 'maintenance',
    level: 3
  },

  MCE: {
    id: 'MCE',
    name: 'Manufacturing Cycle Efficiency',
    description: 'Ratio of value-added time to total cycle time',
    formula: 'Value-Added Time / Total Cycle Time',
    unit: '%',
    category: 'efficiency',
    level: 3
  },

  FPY: {
    id: 'FPY',
    name: 'First Pass Yield',
    description: 'Percentage of units that pass quality inspection on first attempt',
    formula: 'Units Passing First Inspection / Total Units Produced',
    unit: '%',
    category: 'quality',
    level: 3
  },

  Scrap: {
    id: 'SR',
    name: 'Scrap Rate',
    description: 'Percentage of material that becomes waste',
    formula: 'Scrap Quantity / Total Material Used',
    unit: '%',
    category: 'quality',
    level: 3
  },

  Rework: {
    id: 'RR',
    name: 'Rework Rate',
    description: 'Percentage of products requiring rework',
    formula: 'Rework Quantity / Total Production',
    unit: '%',
    category: 'quality',
    level: 3
  },

  Throughput: {
    id: 'TP',
    name: 'Throughput',
    description: 'Rate of production output',
    formula: 'Total Good Units Produced / Production Time',
    unit: 'units/hour',
    category: 'capacity',
    level: 3
  },

  Utilization: {
    id: 'U',
    name: 'Utilization Rate',
    description: 'Ratio of actual to available capacity',
    formula: 'Actual Production Time / Available Time',
    unit: '%',
    category: 'capacity',
    level: 3
  },

  Energy: {
    id: 'EE',
    name: 'Energy Efficiency',
    description: 'Energy consumed per unit produced',
    formula: 'Total Energy Consumed / Total Units Produced',
    unit: 'kWh/unit',
    category: 'environmental',
    level: 3
  }
};

/**
 * Calculate ISO 22400 compliant KPIs
 */
export class ISO22400Calculator {
  /**
   * Calculate OEE (Overall Equipment Effectiveness)
   */
  static calculateOEE(
    availability: number,
    performance: number,
    quality: number
  ): number {
    return (availability * performance * quality) * 100;
  }

  /**
   * Calculate Availability
   */
  static calculateAvailability(
    plannedProductionTime: number,
    downtime: number
  ): number {
    if (plannedProductionTime === 0) return 0;
    return ((plannedProductionTime - downtime) / plannedProductionTime);
  }

  /**
   * Calculate Performance Efficiency
   */
  static calculatePerformance(
    actualProduction: number,
    theoreticalProduction: number
  ): number {
    if (theoreticalProduction === 0) return 0;
    return (actualProduction / theoreticalProduction);
  }

  /**
   * Calculate Quality Rate
   */
  static calculateQuality(
    totalProduction: number,
    defectiveProduction: number
  ): number {
    if (totalProduction === 0) return 0;
    return ((totalProduction - defectiveProduction) / totalProduction);
  }

  /**
   * Calculate MTBF (Mean Time Between Failures)
   */
  static calculateMTBF(
    totalOperatingTime: number,
    numberOfFailures: number
  ): number {
    if (numberOfFailures === 0) return totalOperatingTime;
    return totalOperatingTime / numberOfFailures;
  }

  /**
   * Calculate MTTR (Mean Time To Repair)
   */
  static calculateMTTR(
    totalRepairTime: number,
    numberOfRepairs: number
  ): number {
    if (numberOfRepairs === 0) return 0;
    return totalRepairTime / numberOfRepairs;
  }

  /**
   * Calculate First Pass Yield
   */
  static calculateFPY(
    unitsPassingFirstInspection: number,
    totalUnitsProduced: number
  ): number {
    if (totalUnitsProduced === 0) return 0;
    return (unitsPassingFirstInspection / totalUnitsProduced) * 100;
  }

  /**
   * Calculate Manufacturing Cycle Efficiency
   */
  static calculateMCE(
    valueAddedTime: number,
    totalCycleTime: number
  ): number {
    if (totalCycleTime === 0) return 0;
    return (valueAddedTime / totalCycleTime) * 100;
  }

  /**
   * Get KPI benchmark ranges
   */
  static getBenchmark(kpiId: string): {
    worldClass: number;
    good: number;
    average: number;
    poor: number;
  } {
    const benchmarks: Record<string, any> = {
      OEE: { worldClass: 85, good: 60, average: 40, poor: 0 },
      Availability: { worldClass: 90, good: 80, average: 70, poor: 0 },
      Performance: { worldClass: 95, good: 85, average: 75, poor: 0 },
      Quality: { worldClass: 99, good: 95, average: 90, poor: 0 },
      FPY: { worldClass: 95, good: 85, average: 75, poor: 0 },
      MCE: { worldClass: 25, good: 10, average: 5, poor: 0 }
    };

    return benchmarks[kpiId] || { worldClass: 100, good: 75, average: 50, poor: 0 };
  }

  /**
   * Evaluate KPI performance against benchmarks
   */
  static evaluatePerformance(kpiId: string, value: number): {
    level: 'world-class' | 'good' | 'average' | 'poor';
    recommendation: string;
  } {
    const benchmark = this.getBenchmark(kpiId);
    
    if (value >= benchmark.worldClass) {
      return {
        level: 'world-class',
        recommendation: 'Maintain current performance and share best practices'
      };
    } else if (value >= benchmark.good) {
      return {
        level: 'good',
        recommendation: 'Continue improvement efforts to reach world-class levels'
      };
    } else if (value >= benchmark.average) {
      return {
        level: 'average',
        recommendation: 'Focus on systematic improvements and root cause analysis'
      };
    } else {
      return {
        level: 'poor',
        recommendation: 'Immediate action required - conduct comprehensive assessment'
      };
    }
  }
}