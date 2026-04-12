/**
 * Utility functions
 */
import { randomBytes } from 'crypto';

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(6).toString('hex')}`;
}

export function generateJoinCode(): string {
  // 6-character uppercase code, avoiding confusing chars (0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(6))
    .map((b) => chars[b % chars.length])
    .join('');
}

export function createError(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

export function randomSample<T>(array: T[], size: number): T[] {
  // Fisher-Yates shuffle using crypto.randomBytes for unbiased sampling
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomBytes(4).readUInt32BE(0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, size);
}
