/**
 * Time utility functions for simulation scheduling
 */

/**
 * Calculate the offset for a specific simulation set
 * @param contactSeq - The sequence number of the contact set (1-based)
 * @param setCount - Total number of sets
 * @param durationDays - Duration of the simulation in days (0.5 = 12 hours, 1 = 24 hours, etc.)
 * @returns Offset in milliseconds from the start time
 */
export function calculateSetOffset(contactSeq: number, setCount: number, durationDays: number): number {
  const targetCycleHours = durationDays * 24;
  const setSpacingHours = targetCycleHours / setCount;
  const offsetHours = (contactSeq - 1) * setSpacingHours;
  return offsetHours * 60 * 60 * 1000;
}