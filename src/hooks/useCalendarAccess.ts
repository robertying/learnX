import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { getAndRequestPermission } from 'services/calendar/calendars';

export type CalendarAccess = 'granted' | 'undetermined' | 'denied';

const toAccess = ({
  status,
  canAskAgain,
}: Calendar.PermissionResponse): CalendarAccess =>
  status === 'granted' ? 'granted' : canAskAgain ? 'undetermined' : 'denied';

/**
 * Whether learnX may use the calendars and (on Apple platforms) Reminders,
 * checked again when the app comes back from the system settings; null until
 * known. `request` asks for one, if the system still lets the app ask.
 */
const useCalendarAccess = () => {
  const [calendar, setCalendar] = useState<CalendarAccess | null>(null);
  const [reminders, setReminders] = useState<CalendarAccess | null>(null);

  const check = () => {
    Calendar.getCalendarPermissions()
      .then(response => setCalendar(toAccess(response)))
      .catch(() => {});
    if (Platform.OS === 'ios') {
      Calendar.getRemindersPermissions()
        .then(response => setReminders(toAccess(response)))
        .catch(() => {});
    }
  };

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        check();
      }
    });
    return () => sub.remove();
  }, []);

  const request = async (type: 'calendar' | 'reminder') => {
    await getAndRequestPermission(type).catch(() => false);
    check();
  };

  return { calendar, reminders, request };
};

export default useCalendarAccess;
