import { createHash } from 'crypto';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous: 0, O, 1, I

function randomBlock(length: number): string {
  let result = '';
  const array = new Uint8Array(length);
  require('crypto').randomFillSync(array);
  for (let i = 0; i < length; i++) {
    result += CHARSET[array[i] % CHARSET.length];
  }
  return result;
}

/**
 * Generate a receipt code in format: JCSA-YYYYQX-XXXX-XXXX
 */
export function generateReceiptCode(year: number, quarter: number): string {
  const block1 = randomBlock(4);
  const block2 = randomBlock(4);
  return `JCSA-${year}Q${quarter}-${block1}-${block2}`;
}

/**
 * Hash a receipt code using SHA-256.
 * Only the hash is stored in the database.
 */
export function hashReceiptCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a receipt code against a stored hash.
 */
export function verifyReceiptCode(code: string, storedHash: string): boolean {
  const inputHash = hashReceiptCode(code);
  // Constant-time comparison to prevent timing attacks
  if (inputHash.length !== storedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < inputHash.length; i++) {
    mismatch |= inputHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return mismatch === 0;
}
