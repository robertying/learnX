import { useEffect } from 'react';
import { useAssignments } from 'data/content';
import { useSettings } from 'data/settings';
import { useUserData } from 'data/userData';
import { recordError } from 'helpers/crashReporting';
import { syncDeadlineReminders } from 'helpers/deadlineReminders';

/**
 * Keeps the deadline reminders scheduled as assignments are refreshed,
 * submitted, archived or hidden, and as the reminder settings change.
 */
const useDeadlineReminders = () => {
  const { data: assignments } = useAssignments();
  const hiddenCourses = useUserData(data => data.hiddenCourses);
  const archived = useUserData(data => data.archived.assignment);
  const deadlineReminders = useSettings(
    settings => settings.notifications.deadlineReminders,
  );
  const deadlineReminderOffset = useSettings(
    settings => settings.notifications.deadlineReminderOffset,
  );

  useEffect(() => {
    if (assignments) {
      syncDeadlineReminders(assignments, {
        settings: { deadlineReminders, deadlineReminderOffset },
        hiddenCourses,
        archived,
      }).catch(error => recordError(error, 'Scheduling deadline reminders'));
    }
  }, [
    assignments,
    hiddenCourses,
    archived,
    deadlineReminders,
    deadlineReminderOffset,
  ]);
};

export default useDeadlineReminders;
