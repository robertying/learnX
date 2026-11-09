import { useEffect } from 'react';
import { useAssignments } from 'data/content';
import { useWeekSchedule } from 'data/schedule';
import { useUserData } from 'data/userData';
import { startOfWeek } from 'helpers/schedule';
import { saveUpcomingClasses } from 'helpers/spotlight';
import { useBeijingDay } from 'hooks/useMinute';
import { UpcomingClass, upcomingClasses } from 'helpers/upNext';
import { updateUpNextWidget } from 'widgets';

/**
 * Keeps the Up Next widget and the "Next class" App Intent showing this
 * week's and next week's classes still ahead, with the open assignments'
 * deadlines. Until this week's classes and the assignments are loaded, they
 * keep what they had.
 */
const useUpNext = () => {
  const thisWeek = startOfWeek(useBeijingDay());
  const thisWeekSchedule = useWeekSchedule(thisWeek);
  // Classes after the weekend are next week's.
  const nextWeekSchedule = useWeekSchedule(thisWeek.add(7, 'day'));
  const { data: assignments } = useAssignments();
  const hiddenCourses = useUserData(data => data.hiddenCourses);
  const archived = useUserData(data => data.archived.assignment);

  const loaded = thisWeekSchedule.source !== 'none';
  // The schedule's lists are new on every render; their contents aren't.
  const classesKey = loaded
    ? JSON.stringify(
        upcomingClasses([
          ...thisWeekSchedule.sessions,
          ...nextWeekSchedule.sessions,
        ]),
      )
    : '';

  useEffect(() => {
    if (!classesKey) {
      return;
    }
    const classes = JSON.parse(classesKey) as UpcomingClass[];
    saveUpcomingClasses(classes);
    if (assignments) {
      updateUpNextWidget(classes, assignments, { hiddenCourses, archived });
    }
  }, [classesKey, assignments, hiddenCourses, archived]);
};

export default useUpNext;
