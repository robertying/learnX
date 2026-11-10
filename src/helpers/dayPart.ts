/** A part of the day, which the Today tab's icon follows. */
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * The part of the day at `time` on the device's clock: morning from 5:00,
 * afternoon from 11:00, evening from 17:00 and night from 20:00.
 */
export const dayPart = (time: number): DayPart => {
  const hour = new Date(time).getHours();
  if (hour >= 5 && hour < 11) {
    return 'morning';
  }
  if (hour >= 11 && hour < 17) {
    return 'afternoon';
  }
  if (hour >= 17 && hour < 20) {
    return 'evening';
  }
  return 'night';
};
