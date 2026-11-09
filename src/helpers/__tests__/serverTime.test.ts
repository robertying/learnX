import {
  beijingClock,
  beijingDate,
  beijingTime,
  sameServerTime,
} from 'helpers/serverTime';

// jest runs in Asia/Shanghai (jest.config.js), where Beijing time and local
// time agree, so these compare absolute instants (UTC) instead.

describe('sameServerTime', () => {
  it('compares moments, not strings', () => {
    expect(
      sameServerTime('2026-11-07T18:28:00+08:00', '2026-11-07T10:28:00.000Z'),
    ).toBe(true);
    expect(
      sameServerTime('2026-11-07T18:28:00+08:00', '2026-11-07T18:29:00+08:00'),
    ).toBe(false);
  });

  it('treats a missing time and an empty one alike', () => {
    expect(sameServerTime(undefined, '')).toBe(true);
    expect(sameServerTime(undefined, '2026-11-07T18:28:00+08:00')).toBe(false);
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
