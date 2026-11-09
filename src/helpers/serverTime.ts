// Server times are Beijing time (UTC+8). thu-learn-lib gives them as ISO 8601
// strings with the offset (`2026-11-07T18:28:00+08:00`), so any time zone
// reads the right moment; the timetable works in Beijing days and times.

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Whether two server times are the same moment; missing and '' count as the same. */
export const sameServerTime = (a?: string, b?: string) =>
  a === b || (!a && !b) || (!!a && !!b && Date.parse(a) === Date.parse(b));

/** The date (YYYY-MM-DD) it is in Beijing at `time`: the server's days are Beijing days. */
export const beijingDate = (time: number | Date) =>
  new Date(+time + BEIJING_OFFSET_MS).toISOString().slice(0, 10);

/** The Beijing wall-clock time (HH:mm) at `time` (ms). */
export const beijingClock = (time: number) =>
  new Date(time + BEIJING_OFFSET_MS).toISOString().slice(11, 16);

/** `time` (H:mm or HH:mm) on the Beijing day `date` (YYYY-MM-DD), in ms since the epoch. */
export const beijingTime = (date: string, time: string) => {
  const [hour = '0', minute = '0'] = time.trim().split(':');
  return Date.parse(
    `${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00+08:00`,
  );
};
