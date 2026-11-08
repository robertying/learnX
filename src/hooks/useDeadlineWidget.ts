import { useEffect } from 'react';
import { useAssignments } from 'data/content';
import { useUserData } from 'data/userData';
import { updateDeadlineWidget } from 'widgets';

/**
 * Keeps the home screen widget showing the current semester's open
 * assignments as they're refreshed, archived or hidden. Until the assignments
 * are loaded, the widget keeps what it had.
 */
const useDeadlineWidget = () => {
  const { data: assignments } = useAssignments();
  const hiddenCourses = useUserData(data => data.hiddenCourses);
  const archived = useUserData(data => data.archived.assignment);

  useEffect(() => {
    if (assignments) {
      updateDeadlineWidget(assignments, { hiddenCourses, archived });
    }
  }, [assignments, hiddenCourses, archived]);
};

export default useDeadlineWidget;
