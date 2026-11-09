import { fromPickerDay, toPickerDay } from 'helpers/pickerDay';

// Jest runs in Asia/Shanghai (UTC+8), where local midnight is the day before
// in UTC: the case the conversion exists for.
describe('picker days', () => {
  it('sends a local day as the UTC midnight of the same date', () => {
    expect(toPickerDay(new Date(2026, 2, 1, 0, 30))).toBe(
      '2026-03-01T00:00:00.000Z',
    );
    expect(toPickerDay(new Date(2026, 2, 1, 23, 59))).toBe(
      '2026-03-01T00:00:00.000Z',
    );
    expect(toPickerDay(undefined)).toBeUndefined();
  });

  it('reads a picked day back as the local midnight of the same date', () => {
    expect(fromPickerDay(new Date('2026-03-01T00:00:00Z'))).toEqual(
      new Date(2026, 2, 1),
    );
  });

  it('round-trips every day of a year', () => {
    for (let day = 0; day < 366; day++) {
      const date = new Date(2026, 0, 1 + day);
      expect(fromPickerDay(new Date(toPickerDay(date)!))).toEqual(date);
    }
  });
});
