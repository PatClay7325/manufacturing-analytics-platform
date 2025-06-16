import { describe, it, expect } from 'vitest';

// Manufacturing calculations utilities
export const calculateOEE = (availability: number, performance: number, quality: number): number => {
  // OEE = Availability × Performance × Quality
  return Math.round((availability * performance * quality) / 10000);
};

export const calculateAvailability = (runTime: number, plannedProductionTime: number): number => {
  if (plannedProductionTime === 0) return 0;
  return Math.round((runTime / plannedProductionTime) * 100);
};

export const calculatePerformance = (actualOutput: number, theoreticalOutput: number): number => {
  if (theoreticalOutput === 0) return 0;
  return Math.round((actualOutput / theoreticalOutput) * 100);
};

export const calculateQuality = (goodCount: number, totalCount: number): number => {
  if (totalCount === 0) return 0;
  return Math.round((goodCount / totalCount) * 100);
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
  const threshold = 0.5; // 0.5% threshold for neutral
  const change = ((current - previous) / previous) * 100;
  
  if (Math.abs(change) < threshold) {
    return 'neutral';
  }
  return change > 0 ? 'up' : 'down';
};

export const calculateCycleTimeEfficiency = (actualCycleTime: number, idealCycleTime: number): number => {
  if (actualCycleTime === 0) return 0;
  return Math.min(100, Math.round((idealCycleTime / actualCycleTime) * 100));
};

describe('Manufacturing Calculations', () => {
  describe('calculateOEE', () => {
    it('calculates OEE correctly', () => {
      expect(calculateOEE(90, 95, 98)).toBe(84); // 0.90 * 0.95 * 0.98 = 0.8379 ≈ 84%
      expect(calculateOEE(100, 100, 100)).toBe(100);
      expect(calculateOEE(80, 85, 95)).toBe(65); // 0.80 * 0.85 * 0.95 = 0.646 ≈ 65%
    });

    it('handles zero values', () => {
      expect(calculateOEE(0, 95, 98)).toBe(0);
      expect(calculateOEE(90, 0, 98)).toBe(0);
      expect(calculateOEE(90, 95, 0)).toBe(0);
    });

    it('handles decimal inputs', () => {
      expect(calculateOEE(85.5, 92.3, 97.8)).toBe(77); // 0.855 * 0.923 * 0.978 = 0.772 ≈ 77%
    });
  });

  describe('calculateAvailability', () => {
    it('calculates availability correctly', () => {
      expect(calculateAvailability(450, 480)).toBe(94); // 450/480 = 0.9375 ≈ 94%
      expect(calculateAvailability(480, 480)).toBe(100);
      expect(calculateAvailability(0, 480)).toBe(0);
    });

    it('handles zero planned production time', () => {
      expect(calculateAvailability(100, 0)).toBe(0);
    });

    it('handles run time exceeding planned time', () => {
      expect(calculateAvailability(500, 480)).toBe(104); // Over 100% is possible
    });
  });

  describe('calculatePerformance', () => {
    it('calculates performance correctly', () => {
      expect(calculatePerformance(950, 1000)).toBe(95);
      expect(calculatePerformance(1000, 1000)).toBe(100);
      expect(calculatePerformance(0, 1000)).toBe(0);
    });

    it('handles zero theoretical output', () => {
      expect(calculatePerformance(500, 0)).toBe(0);
    });

    it('handles actual exceeding theoretical', () => {
      expect(calculatePerformance(1100, 1000)).toBe(110); // Over 100% is possible
    });
  });

  describe('calculateQuality', () => {
    it('calculates quality correctly', () => {
      expect(calculateQuality(980, 1000)).toBe(98);
      expect(calculateQuality(1000, 1000)).toBe(100);
      expect(calculateQuality(0, 1000)).toBe(0);
    });

    it('handles zero total count', () => {
      expect(calculateQuality(0, 0)).toBe(0);
    });

    it('handles decimal values', () => {
      expect(calculateQuality(975.5, 1000)).toBe(98); // 975.5/1000 = 0.9755 ≈ 98%
    });
  });

  describe('formatDuration', () => {
    it('formats seconds correctly', () => {
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(125)).toBe('2m 5s');
      expect(formatDuration(600)).toBe('10m 0s');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(3665)).toBe('1h 1m');
      expect(formatDuration(7200)).toBe('2h 0m');
      expect(formatDuration(10800)).toBe('3h 0m');
    });

    it('handles large durations', () => {
      expect(formatDuration(86400)).toBe('24h 0m'); // 24 hours
      expect(formatDuration(90061)).toBe('25h 1m'); // 25 hours, 1 minute, 1 second
    });
  });

  describe('calculateTrend', () => {
    it('identifies upward trends', () => {
      expect(calculateTrend(105, 100)).toBe('up');
      expect(calculateTrend(85.5, 80)).toBe('up');
      expect(calculateTrend(100.6, 100)).toBe('up');
    });

    it('identifies downward trends', () => {
      expect(calculateTrend(95, 100)).toBe('down');
      expect(calculateTrend(80, 85.5)).toBe('down');
      expect(calculateTrend(99.4, 100)).toBe('down');
    });

    it('identifies neutral trends within threshold', () => {
      expect(calculateTrend(100.3, 100)).toBe('neutral'); // 0.3% change
      expect(calculateTrend(99.7, 100)).toBe('neutral'); // -0.3% change
      expect(calculateTrend(100, 100)).toBe('neutral');
    });

    it('handles zero previous value', () => {
      expect(calculateTrend(100, 0)).toBe('up'); // Infinity becomes 'up'
    });
  });

  describe('calculateCycleTimeEfficiency', () => {
    it('calculates cycle time efficiency correctly', () => {
      expect(calculateCycleTimeEfficiency(50, 45)).toBe(90); // 45/50 = 0.9 = 90%
      expect(calculateCycleTimeEfficiency(60, 60)).toBe(100);
      expect(calculateCycleTimeEfficiency(100, 80)).toBe(80);
    });

    it('caps efficiency at 100%', () => {
      expect(calculateCycleTimeEfficiency(40, 50)).toBe(100); // Would be 125%, capped at 100%
    });

    it('handles zero actual cycle time', () => {
      expect(calculateCycleTimeEfficiency(0, 50)).toBe(0);
    });

    it('handles decimal values', () => {
      expect(calculateCycleTimeEfficiency(45.5, 40.95)).toBe(90); // 40.95/45.5 = 0.9 = 90%
    });
  });
});