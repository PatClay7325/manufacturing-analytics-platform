import { describe, it, expect } from 'vitest';

describe('Basic Infrastructure Test', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });

  it('should handle basic math', () => {
    expect(2 + 2).toBe(4);
  });

  it('should work with strings', () => {
    expect('hello').toBe('hello');
  });
});
