// Jest test - using global test functions
/**
 * Basic Test - Verify test infrastructure is working
 */

describe('Basic Test Infrastructure', () => {
  test('should pass basic assertion', () => {
    expect(2 + 2).toBe(4);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  test('should handle object equality', () => {
    const obj1 = { name: 'test', value: 42 };
    const obj2 = { name: 'test', value: 42 };
    expect(obj1).toEqual(obj2);
  });
});
