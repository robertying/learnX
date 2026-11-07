import { useState } from 'react';
import { Alert } from 'react-native';
import type {
  CalendarDate,
  RangeChange,
} from 'react-native-paper-dates/lib/typescript/Date/Calendar';
import dayjs from 'dayjs';
import { toast } from 'components/Toast';
import { useAssignments } from 'data/content';
import { setSetting, useSettings } from 'data/settings';
import { useUserData } from 'data/userData';
import {
  ToastMessage,
  deleteCalendars,
  exportCalendars,
  syncAssignments,
  syncCourseSchedule,
  upcomingAssignments,
} from 'helpers/calendarSync';
import { t } from 'helpers/i18n';
import useFilteredData from './useFilteredData';

const show = (message?: ToastMessage) => {
  if (message) {
    toast(message.text, message.type);
  }
};

/** Course schedule sync over a range picked in a date range picker */
export const useCourseScheduleSync = () => {
  const graduate = useSettings(settings => settings.graduate);

  const [syncing, setSyncing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startDate, setStartDate] = useState<CalendarDate>(dayjs().toDate());
  const [endDate, setEndDate] = useState<CalendarDate>(
    dayjs().add(28, 'day').toDate(),
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
    closePicker();
    sync(range.startDate, range.endDate);
  };

  return {
    syncing,
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
 * syncs the visible assignments that are still due.
 */
export const useAssignmentSync = () => {
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const favoriteIds = useUserData(data => data.favorites.assignment);
  const archivedIds = useUserData(data => data.archived.assignment);
  const { assignments } = useAssignments();

  const { all } = useFilteredData({
    data: assignments,
    fav: favoriteIds,
    archived: archivedIds,
    hidden: hiddenCourseIds,
  });

  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [reminderSyncing, setReminderSyncing] = useState(false);

  const setSyncEnabled = async (
    type: 'calendar' | 'reminder',
    enabled: boolean,
  ) => {
    const setSyncing =
      type === 'calendar' ? setCalendarSyncing : setReminderSyncing;

    if (enabled) {
      setSyncing(true);
      show(await syncAssignments(type, upcomingAssignments(all)));
      setSyncing(false);
    }

    setSetting(
      type === 'calendar' ? 'assignmentCalendarSync' : 'assignmentReminderSync',
      enabled,
    );
  };

  return { calendarSyncing, reminderSyncing, setSyncEnabled };
};

export const useCalendarExport = () => {
  const [exporting, setExporting] = useState(false);

  const exportToICS = async () => {
    setExporting(true);
    show(await exportCalendars());
    setExporting(false);
  };

  return { exporting, exportToICS };
};

/** Asks first, then deletes every learnX calendar and reminder list */
export const confirmDeleteCalendars = () => {
  Alert.alert(
    t('deleteSyncedCalendarsAndReminders'),
    t('deleteSyncedCalendarsAndRemindersConfirmation'),
    [
      {
        text: t('cancel'),
        style: 'cancel',
      },
      {
        text: t('ok'),
        onPress: async () => {
          show(await deleteCalendars());
        },
      },
    ],
    { cancelable: true },
  );
};
