import { useState } from 'react';
import { Alert } from 'react-native';
import dayjs from 'dayjs';
import { toast } from 'components/Toast';
import { setSetting, useSettings } from 'data/settings';
import {
  ToastMessage,
  allowAssignmentSync,
  allowCourseCalendarSync,
  deleteCalendars,
  exportCalendars,
  syncCourseSchedule,
} from 'services/calendar/actions';
import { refreshSurfaces } from 'services/surfaces';
import { t } from 'helpers/i18n';
import { isApple } from 'helpers/platform';
import { defaultCalendarRange } from 'helpers/calendar/range';

const show = (message?: ToastMessage) => {
  if (message) {
    toast(message.text, message.type);
  }
};

export interface DateRange {
  startDate: Date | undefined;
  endDate: Date | undefined;
}
type RangeChange = (range: DateRange) => void;

/**
 * Course schedule sync: the switch that keeps the fetched timetable in the
 * calendar, and Sync over a range picked in a date range picker. Turning the
 * switch on asks for the calendar access and shows it working until the
 * surfaces (services/surfaces) have written the saved weeks; it stays on if
 * the access is denied, and starts working once it's allowed.
 */
export const useCourseScheduleSync = () => {
  const graduate = useSettings(settings => settings.graduate);

  const [syncing, setSyncing] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const setSyncEnabled = async (enabled: boolean) => {
    if (!enabled) {
      setSetting('courseCalendarSync', false);
      return;
    }
    setEnabling(true);
    show(await allowCourseCalendarSync());
    setSetting('courseCalendarSync', true);
    await refreshSurfaces();
    setEnabling(false);
  };
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(() =>
    defaultCalendarRange().start.toDate(),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(() =>
    defaultCalendarRange().end.toDate(),
  );

  const sync = async (start?: Date, end?: Date) => {
    if (!start || !end) {
      return;
    }

    setSyncing(true);
    show(await syncCourseSchedule(dayjs(start), dayjs(end), graduate));
    setSyncing(false);
  };

  const closePicker = () => {
    setPickerOpen(false);
  };

  const openPicker = () => {
    setPickerOpen(true);
  };

  const onRangeChange: RangeChange = range => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const onRangeConfirm: RangeChange = range => {
    onRangeChange(range);
    closePicker();
    void sync(range.startDate, range.endDate);
  };

  return {
    syncing,
    enabling,
    setSyncEnabled,
    picker: {
      open: pickerOpen,
      startDate,
      endDate,
      openPicker,
      closePicker,
      onRangeChange,
      onRangeConfirm,
    },
  };
};

/**
 * Turns assignment sync to the calendar or reminders on and off. Turning it on
 * asks for the access it needs and shows it working until the surfaces
 * (services/surfaces) have written the shown assignments that are still due;
 * a failed write shows its toast from there. It stays on if the access is
 * denied, and starts working once it's allowed.
 */
export const useAssignmentSync = () => {
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [reminderSyncing, setReminderSyncing] = useState(false);

  const setSyncEnabled = async (
    type: 'calendar' | 'reminder',
    enabled: boolean,
  ) => {
    const setting =
      type === 'calendar' ? 'assignmentCalendarSync' : 'assignmentReminderSync';
    if (!enabled) {
      setSetting(setting, false);
      return;
    }
    const setSyncing =
      type === 'calendar' ? setCalendarSyncing : setReminderSyncing;
    setSyncing(true);
    show(await allowAssignmentSync(type));
    setSetting(setting, true);
    await refreshSurfaces();
    setSyncing(false);
  };

  return { calendarSyncing, reminderSyncing, setSyncEnabled };
};

export const useCalendarExport = () => {
  const [exporting, setExporting] = useState(false);

  const exportToICS = async (range?: { startDate: Date; endDate: Date }) => {
    setExporting(true);
    show(
      await exportCalendars(
        range && { start: dayjs(range.startDate), end: dayjs(range.endDate) },
      ),
    );
    setExporting(false);
  };

  return { exporting, exportToICS };
};

/**
 * The Electron app's export: the dates to export are picked first, starting
 * from today and the next four weeks, as class sync on the phones.
 */
export const useCalendarExportRange = () => {
  const { exporting, exportToICS } = useCalendarExport();
  const [range, setRange] = useState<{ startDate: Date; endDate: Date }>();

  const openPicker = () => {
    const { start, end } = defaultCalendarRange();
    setRange({ startDate: start.toDate(), endDate: end.toDate() });
  };

  return {
    exporting,
    picker: {
      open: !!range,
      startDate: range?.startDate,
      endDate: range?.endDate,
      openPicker,
      closePicker: () => setRange(undefined),
      onRangeConfirm: (picked: { startDate: Date; endDate: Date }) => {
        setRange(undefined);
        void exportToICS(picked);
      },
    },
  };
};

/** Asks first, then deletes every learnX calendar and reminder list */
export const confirmDeleteCalendars = () => {
  Alert.alert(
    // Reminders sync is only on iOS, iPadOS and Mac.
    isApple()
      ? t('deleteSyncedCalendarsAndReminders')
      : t('deleteSyncedCalendars'),
    isApple()
      ? t('deleteSyncedCalendarsAndRemindersConfirmation')
      : t('deleteSyncedCalendarsConfirmation'),
    [
      {
        text: t('cancel'),
        style: 'cancel',
      },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          show(await deleteCalendars());
        },
      },
    ],
    { cancelable: true },
  );
};
