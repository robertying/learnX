// Server times are Beijing time (UTC+8). thu-learn-lib 5.x passes them on as
// the server sends them: millisecond timestamps (deadlines, submit times) or
// wall-clock strings without a zone (`2026-11-07 18:28`: notices, files, grade
// times), which `dayjs()` would read as the phone's local time. Newer versions
// give ISO 8601 strings with the offset. Everything the app keeps is an ISO
// string with an offset, so any time zone reads the right moment.

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * A server time as an ISO 8601 string with an offset, e.g.
 * `2026-11-07T18:28:00+08:00`. Accepts a Unix timestamp (number or digits;
 * milliseconds, or seconds for 10 digits), a Beijing wall-clock string without
 * a zone, or an ISO string with an offset (kept as it is). `undefined` for a
 * missing value; a string in any other shape is returned unchanged.
 */
export const serverTime = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d{10,}$/.test(value))
  ) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return undefined;
    }
    const ms = number < 1e11 ? number * 1000 : number;
    return new Date(ms + BEIJING_OFFSET_MS)
      .toISOString()
      .replace(/(\.\d{3})?Z$/, '+08:00');
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const wallClock =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?(?:\.\d+)?$/.exec(
      value.trim(),
    );
  return wallClock
    ? `${wallClock[1]}T${wallClock[2]}${wallClock[3] ?? ':00'}+08:00`
    : value;
};

/** Whether two server times (in any of `serverTime`'s shapes) are the same moment. */
export const sameServerTime = (a: unknown, b: unknown) => {
  const x = serverTime(a);
  const y = serverTime(b);
  return x === y || (!!x && !!y && Date.parse(x) === Date.parse(y));
};

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
