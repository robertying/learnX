import dayjs from 'dayjs';

/**
 * The dates a calendar date picker offers first: today and the next four
 * weeks. Class sync on the phones and Export in the Windows and Linux app
 * both start here.
 */
export const defaultCalendarRange = (now = dayjs()) => {
  const start = now.startOf('day');
  return { start, end: start.add(28, 'day') };
};
