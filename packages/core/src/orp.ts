/**
 * Heuristic used by Spritz-like RSVP readers: the optimal recognition
 * point shifts right as the word gets longer, capping out around the
 * 5th character for long words.
 */
export function computeOrpIndex(word: string): number {
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 4) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}
