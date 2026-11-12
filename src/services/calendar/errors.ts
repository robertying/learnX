/** Why writing to the system calendar or Reminders failed, as far as we know. */
export type CalendarErrorCode =
  | 'calendarPermission'
  | 'reminderPermission'
  | 'noSource'
  | 'noEvents';

/** A calendar or Reminders failure the app can explain to the user. */
export class CalendarError extends Error {
  constructor(readonly code: CalendarErrorCode) {
    super(code);
    this.name = 'CalendarError';
  }
}

/**
 * The code of a calendar failure: ours, or expo-calendar's missing permission
 * (`E_MISSING_PERMISSIONS` on Android, `ERR_MISSING_PERMISSIONS` on iOS),
 * which it throws when the permission is revoked between our check and the
 * write. Undefined for anything else.
 */
export const calendarErrorCode = (
  error: unknown,
): CalendarErrorCode | undefined => {
  if (error instanceof CalendarError) {
    return error.code;
  }
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'E_MISSING_PERMISSIONS' || code === 'ERR_MISSING_PERMISSIONS'
    ? 'calendarPermission'
    : undefined;
};
