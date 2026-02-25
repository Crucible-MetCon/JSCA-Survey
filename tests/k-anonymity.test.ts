import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkKAnonymity, getThreshold } from '../src/lib/k-anonymity';

describe('K-Anonymity Suppression', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should suppress data when response count is below default threshold (5)', () => {
    const data = { gold: 2, silver: 1 };
    const result = checkKAnonymity(data, 3);

    expect(result.suppressed).toBe(true);
    expect(result.data).toBeNull();
    expect(result.message).toBe('Insufficient responses to preserve anonymity.');
    expect(result.responseCount).toBe(3);
  });

  it('should NOT suppress data when response count meets threshold', () => {
    const data = { gold: 3, silver: 2 };
    const result = checkKAnonymity(data, 5);

    expect(result.suppressed).toBe(false);
    expect(result.data).toEqual(data);
    expect(result.message).toBeNull();
    expect(result.responseCount).toBe(5);
  });

  it('should NOT suppress data when response count exceeds threshold', () => {
    const data = { gold: 10, silver: 15, platinum: 5 };
    const result = checkKAnonymity(data, 30);

    expect(result.suppressed).toBe(false);
    expect(result.data).toEqual(data);
    expect(result.responseCount).toBe(30);
  });

  it('should suppress when count = 0', () => {
    const data = {};
    const result = checkKAnonymity(data, 0);

    expect(result.suppressed).toBe(true);
    expect(result.data).toBeNull();
  });

  it('should suppress when count = 1', () => {
    const data = { only_one: 1 };
    const result = checkKAnonymity(data, 1);

    expect(result.suppressed).toBe(true);
    expect(result.data).toBeNull();
  });

  it('should suppress at threshold - 1', () => {
    const data = { a: 2, b: 2 };
    const result = checkKAnonymity(data, 4);

    expect(result.suppressed).toBe(true);
  });

  it('should use custom threshold from env variable', () => {
    process.env.K_ANONYMITY_THRESHOLD = '10';

    const data = { a: 5, b: 3 };
    // 8 responses, but threshold is 10
    const result = checkKAnonymity(data, 8);
    expect(result.suppressed).toBe(true);

    // 10 responses meets threshold
    const result2 = checkKAnonymity(data, 10);
    expect(result2.suppressed).toBe(false);
  });

  it('should fall back to default threshold if env is invalid', () => {
    process.env.K_ANONYMITY_THRESHOLD = 'invalid';

    const result = checkKAnonymity({ a: 1 }, 4);
    expect(result.suppressed).toBe(true);

    const result2 = checkKAnonymity({ a: 1 }, 5);
    expect(result2.suppressed).toBe(false);
  });

  it('should work with different data types (strings, nested objects)', () => {
    const result = checkKAnonymity('some string data', 10);
    expect(result.suppressed).toBe(false);
    expect(result.data).toBe('some string data');

    const result2 = checkKAnonymity({ nested: { value: 1 } }, 3);
    expect(result2.suppressed).toBe(true);
    expect(result2.data).toBeNull();
  });

  it('should return correct threshold from getThreshold()', () => {
    expect(getThreshold()).toBe(5);

    process.env.K_ANONYMITY_THRESHOLD = '15';
    expect(getThreshold()).toBe(15);
  });
});
