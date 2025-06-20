import { describe, it, expect } from 'vitest';
import { 
  calculateOEE,
  calculateMTBF,
  calculateMTTR
} from '@/utils/calculations';

describe('Manufacturing Calculations', () => {
  describe('calculateOEE', () => {
    it('calculates OEE correctly', () => {
      expect(calculateOEE(90, 95, 98)).toBe(84); // 0.90 * 0.95 * 0.98 = 0.8379 ≈ 84%
      expect(calculateOEE(100, 100, 100)).toBe(100); // 1.00 * 1.00 * 1.00 = 1.00 = 100%
      expect(calculateOEE(80, 75, 90)).toBe(54); // 0.80 * 0.75 * 0.90 = 0.54 = 54%
    });

    it('handles edge cases correctly', () => {
      expect(calculateOEE(0, 95, 98)).toBe(0); // 0 availability means 0 OEE
      expect(calculateOEE(90, 0, 98)).toBe(0); // 0 performance means 0 OEE
      expect(calculateOEE(90, 95, 0)).toBe(0); // 0 quality means 0 OEE
      expect(calculateOEE(0, 0, 0)).toBe(0); // All zeros means 0 OEE
    });

    it('throws TypeError for non-number inputs', () => {
      // @ts-expect-error Testing with invalid input
      expect(() => calculateOEE('90', 95, 98)).toThrow(TypeError);
      // @ts-expect-error Testing with invalid input
      expect(() => calculateOEE(90, '95', 98)).toThrow(TypeError);
      // @ts-expect-error Testing with invalid input
      expect(() => calculateOEE(90, 95, '98')).toThrow(TypeError);
    });

    it('throws RangeError for out-of-range inputs', () => {
      expect(() => calculateOEE(-1, 95, 98)).toThrow(RangeError);
      expect(() => calculateOEE(90, -5, 98)).toThrow(RangeError);
      expect(() => calculateOEE(90, 95, 101)).toThrow(RangeError);
      expect(() => calculateOEE(101, 95, 98)).toThrow(RangeError);
    });
  });

  describe('calculateMTBF', () => {
    it('calculates MTBF correctly', () => {
      expect(calculateMTBF(1000, 10)).toBe(100); // 1000 hours / 10 failures = 100 hours
      expect(calculateMTBF(500, 5)).toBe(100); // 500 hours / 5 failures = 100 hours
      expect(calculateMTBF(0, 0)).toBe(0); // 0 hours / 0 failures = 0 hours
    });

    it('handles edge cases correctly', () => {
      expect(calculateMTBF(1000, 0)).toBe(1000); // No failures means MTBF equals operating time
      expect(calculateMTBF(0, 10)).toBe(0); // 0 operating hours means 0 MTBF
    });

    it('throws TypeError for non-number inputs', () => {
      // @ts-expect-error Testing with invalid input
      expect(() => calculateMTBF('1000', 10)).toThrow(TypeError);
      // @ts-expect-error Testing with invalid input
      expect(() => calculateMTBF(1000, '10')).toThrow(TypeError);
    });

    it('throws RangeError for invalid inputs', () => {
      expect(() => calculateMTBF(-100, 10)).toThrow(RangeError);
      expect(() => calculateMTBF(1000, -5)).toThrow(RangeError);
      expect(() => calculateMTBF(1000, 1.5)).toThrow(RangeError);
    });
  });

  describe('calculateMTTR', () => {
    it('calculates MTTR correctly', () => {
      expect(calculateMTTR(50, 10)).toBe(5); // 50 hours / 10 repairs = 5 hours
      expect(calculateMTTR(15, 3)).toBe(5); // 15 hours / 3 repairs = 5 hours
      expect(calculateMTTR(0, 0)).toBe(0); // 0 hours / 0 repairs = 0 hours
    });

    it('handles edge cases correctly', () => {
      expect(calculateMTTR(0, 10)).toBe(0); // 0 repair hours means 0 MTTR
      expect(calculateMTTR(50, 0)).toBe(0); // No repairs means 0 MTTR
    });

    it('throws TypeError for non-number inputs', () => {
      // @ts-expect-error Testing with invalid input
      expect(() => calculateMTTR('50', 10)).toThrow(TypeError);
      // @ts-expect-error Testing with invalid input
      expect(() => calculateMTTR(50, '10')).toThrow(TypeError);
    });

    it('throws RangeError for invalid inputs', () => {
      expect(() => calculateMTTR(-50, 10)).toThrow(RangeError);
      expect(() => calculateMTTR(50, -5)).toThrow(RangeError);
      expect(() => calculateMTTR(50, 2.5)).toThrow(RangeError);
    });
  });
});