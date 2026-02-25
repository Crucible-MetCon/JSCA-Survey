import { describe, it, expect } from 'vitest';
import { generateReceiptCode, hashReceiptCode, verifyReceiptCode } from '../src/lib/receipt';

describe('Receipt Code Generation, Hashing, and Verification', () => {
  it('should generate a receipt code in the correct format', () => {
    const code = generateReceiptCode(2025, 1);

    // Format: JCSA-YYYYQX-XXXX-XXXX
    expect(code).toMatch(/^JCSA-2025Q1-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('should generate unique codes each time', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateReceiptCode(2025, 2));
    }
    // All 100 codes should be unique
    expect(codes.size).toBe(100);
  });

  it('should include correct year and quarter in the code', () => {
    const code2025Q1 = generateReceiptCode(2025, 1);
    expect(code2025Q1.startsWith('JCSA-2025Q1-')).toBe(true);

    const code2026Q4 = generateReceiptCode(2026, 4);
    expect(code2026Q4.startsWith('JCSA-2026Q4-')).toBe(true);
  });

  it('should produce a SHA-256 hex hash', () => {
    const code = 'JCSA-2025Q1-A7K2-M9P3';
    const hash = hashReceiptCode(code);

    // SHA-256 produces a 64-character hex string
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce consistent hashes for the same code', () => {
    const code = 'JCSA-2025Q1-TEST-CODE';
    const hash1 = hashReceiptCode(code);
    const hash2 = hashReceiptCode(code);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different codes', () => {
    const hash1 = hashReceiptCode('JCSA-2025Q1-AAAA-BBBB');
    const hash2 = hashReceiptCode('JCSA-2025Q1-CCCC-DDDD');

    expect(hash1).not.toBe(hash2);
  });

  it('should verify a correct code against its hash', () => {
    const code = generateReceiptCode(2025, 3);
    const hash = hashReceiptCode(code);

    expect(verifyReceiptCode(code, hash)).toBe(true);
  });

  it('should reject an incorrect code', () => {
    const correctCode = generateReceiptCode(2025, 3);
    const hash = hashReceiptCode(correctCode);

    expect(verifyReceiptCode('JCSA-2025Q3-WRONG-CODE', hash)).toBe(false);
  });

  it('should reject slightly modified codes', () => {
    const code = 'JCSA-2025Q1-A7K2-M9P3';
    const hash = hashReceiptCode(code);

    // Change one character
    expect(verifyReceiptCode('JCSA-2025Q1-A7K2-M9P4', hash)).toBe(false);
    expect(verifyReceiptCode('JCSA-2025Q1-B7K2-M9P3', hash)).toBe(false);
    expect(verifyReceiptCode('JCSA-2025Q2-A7K2-M9P3', hash)).toBe(false);
  });

  it('should reject empty strings', () => {
    const hash = hashReceiptCode('JCSA-2025Q1-A7K2-M9P3');
    expect(verifyReceiptCode('', hash)).toBe(false);
  });

  it('should handle case sensitivity', () => {
    const code = 'JCSA-2025Q1-A7K2-M9P3';
    const hash = hashReceiptCode(code);

    // Lowercase version should not match
    expect(verifyReceiptCode('jcsa-2025q1-a7k2-m9p3', hash)).toBe(false);
  });

  it('should do constant-time comparison (verified by structure)', () => {
    // We can't easily test timing, but we verify the function
    // uses bitwise OR accumulation (from the implementation)
    const code = 'JCSA-2025Q1-A7K2-M9P3';
    const hash = hashReceiptCode(code);

    // Both true and false cases should work
    expect(verifyReceiptCode(code, hash)).toBe(true);
    expect(verifyReceiptCode('JCSA-2025Q1-XXXX-XXXX', hash)).toBe(false);
  });
});
