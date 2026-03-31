/**
 * Unit tests for suggestion sampling filter logic (Fix #2).
 *
 * We test the filtering rule directly (pure logic extraction)
 * rather than mounting the full hook, keeping tests fast and focused.
 */
import { describe, it, expect } from 'vitest';

/**
 * Replicates the filter logic from useParty.ts handleSuggestionTesting:
 *   if (!Array.isArray(data.sampleUserIds) || !data.sampleUserIds.includes(userId)) return;
 */
function shouldShowSuggestion(
  userId: string | null,
  sampleUserIds: unknown
): boolean {
  if (!Array.isArray(sampleUserIds)) return false;
  if (!userId) return false;
  return (sampleUserIds as string[]).includes(userId);
}

describe('suggestion sampling filter (Fix #2)', () => {
  it('shows card when userId is in sampleUserIds', () => {
    expect(shouldShowSuggestion('user-1', ['user-1', 'user-2'])).toBe(true);
  });

  it('hides card when userId is NOT in sampleUserIds', () => {
    expect(shouldShowSuggestion('user-3', ['user-1', 'user-2'])).toBe(false);
  });

  it('hides card when sampleUserIds is missing (malformed event)', () => {
    expect(shouldShowSuggestion('user-1', undefined)).toBe(false);
  });

  it('hides card when sampleUserIds is not an array', () => {
    expect(shouldShowSuggestion('user-1', 'user-1')).toBe(false);
  });

  it('hides card when userId is null', () => {
    expect(shouldShowSuggestion(null, ['user-1'])).toBe(false);
  });

  it('hides card when sampleUserIds is empty', () => {
    expect(shouldShowSuggestion('user-1', [])).toBe(false);
  });
});
