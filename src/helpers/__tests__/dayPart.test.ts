import { dayPart } from 'helpers/dayPart';

// Jest runs in Asia/Shanghai, so these are the device's hours.
const at = (time: string) => Date.parse(`2026-03-15T${time}:00+08:00`);

it.each([
  ['00:00', 'night'],
  ['04:59', 'night'],
  ['05:00', 'morning'],
  ['10:59', 'morning'],
  ['11:00', 'afternoon'],
  ['16:59', 'afternoon'],
  ['17:00', 'evening'],
  ['19:59', 'evening'],
  ['20:00', 'night'],
  ['23:59', 'night'],
])('is %s %s', (time, part) => {
  expect(dayPart(at(time))).toBe(part);
});
