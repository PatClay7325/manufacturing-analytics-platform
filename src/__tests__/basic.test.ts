import { describe, it, expect } from 'vitest';

/**
 * Basic test suite to verify testing infrastructure works correctly
 */
describe('Basic test suite', () => {
  it('should pass basic arithmetic test', () => {
    expect(1 + 1).toBe(2);
    expect(2 * 3).toBe(6);
    expect(10 - 5).toBe(5);
    expect(8 / 2).toBe(4);
  });

  it('should handle string operations', () => {
    expect('hello ' + 'world').toBe('hello world');
    expect('Manufacturing'.toLowerCase()).toBe('manufacturing');
    expect('  trimmed  '.trim()).toBe('trimmed');
    expect('analytics'.toUpperCase()).toBe('ANALYTICS');
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr.map(x => x * 2)).toEqual([2, 4, 6, 8, 10]);
    expect(arr.filter(x => x % 2 === 0)).toEqual([2, 4]);
    expect(arr.reduce((acc, val) => acc + val, 0)).toBe(15);
  });

  it('should handle object operations', () => {
    const obj = { name: 'Equipment', status: 'operational' };
    expect(obj.name).toBe('Equipment');
    expect(obj.status).toBe('operational');
    expect(Object.keys(obj)).toEqual(['name', 'status']);
    expect({ ...obj, type: 'CNC' }).toEqual({
      name: 'Equipment',
      status: 'operational',
      type: 'CNC'
    });
  });
});