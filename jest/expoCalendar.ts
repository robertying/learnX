// expo-calendar ships ESM and needs its native module, so tests get this
// stand-in. The enums carry the real values; every function is a jest.fn that
// tests set up per case.
export const EntityTypes = { EVENT: 'event', REMINDER: 'reminder' } as const;
export const SourceType = {
  LOCAL: 'local',
  EXCHANGE: 'exchange',
  CALDAV: 'caldav',
  MOBILEME: 'mobileme',
  SUBSCRIBED: 'subscribed',
  BIRTHDAYS: 'birthdays',
} as const;
export const CalendarAccessLevel = { OWNER: 'owner' } as const;
export const AlarmMethod = {
  ALARM: 'alarm',
  ALERT: 'alert',
  EMAIL: 'email',
  SMS: 'sms',
  DEFAULT: 'default',
} as const;

export const getCalendarPermissions = jest.fn();
export const requestCalendarPermissions = jest.fn();
export const getRemindersPermissions = jest.fn();
export const requestRemindersPermissions = jest.fn();
export const getCalendars = jest.fn();
export const createCalendar = jest.fn();

export const ExpoCalendar = { get: jest.fn() };
export const ExpoCalendarEvent = { get: jest.fn() };
export const ExpoCalendarReminder = { get: jest.fn() };
