import dayjs from 'dayjs';
import {
  beijingClock,
  beijingDate,
  beijingTime,
  serverTime,
} from 'helpers/serverTime';

// jest runs in Asia/Shanghai (jest.config.js), where Beijing time and local
// time agree, so these compare absolute instants (UTC) instead.

describe('serverTime', () => {
  it('reads zone-less wall-clock times as Beijing time', () => {
    expect(serverTime('2026-11-07 18:28')).toBe('2026-11-07T18:28:00+08:00');
    expect(serverTime('2026-11-07 18:28:05')).toBe('2026-11-07T18:28:05+08:00');
    expect(dayjs(serverTime('2026-11-07 18:28')).toISOString()).toBe(
      '2026-11-07T10:28:00.000Z',
    );
  });

  it('reads millisecond timestamps, as numbers or digit strings', () => {
    expect(serverTime(1740000000000)).toBe('2025-02-20T05:20:00+08:00');
    expect(serverTime('1740000000000')).toBe('2025-02-20T05:20:00+08:00');
    expect(dayjs(serverTime(1740000000000)).valueOf()).toBe(1740000000000);
  });

  it('keeps ISO times with an offset, as newer thu-learn-lib gives them', () => {
    expect(serverTime('2026-11-07T18:28:00+08:00')).toBe(
      '2026-11-07T18:28:00+08:00',
    );
    expect(serverTime('2026-11-07T10:28:00.000Z')).toBe(
      '2026-11-07T10:28:00.000Z',
    );
  });

  it('gives undefined for a missing time', () => {
    expect(serverTime(undefined)).toBeUndefined();
    expect(serverTime(null)).toBeUndefined();
    expect(serverTime('')).toBeUndefined();
  });
});

describe('Beijing days and times', () => {
  it('gives the Beijing date and clock of an instant', () => {
    // Sunday 21:30 in Los Angeles is Monday 12:30 in Beijing
    const time = Date.parse('2026-09-14T04:30:00Z');
    expect(beijingDate(time)).toBe('2026-09-14');
    expect(beijingClock(time)).toBe('12:30');
  });

  it('gives the instant of a Beijing date and time', () => {
    expect(new Date(beijingTime('2026-09-14', '8:00')).toISOString()).toBe(
      '2026-09-14T00:00:00.000Z',
    );
  });
});
