import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { setUpBackgroundFetch } from 'services/background';
import { removeLegacyDownloads } from 'services/files/downloads';
import { configureNotifications } from 'services/notifications';
import { subscribeSurfaceErrors } from 'services/surfaces';
import { toast } from 'components/Toast';
import { useLoggedIn } from 'data/auth';
import {
  schoolSemesterQuery,
  selectSemesterId,
  useCourses,
} from 'data/queries';
import { applyLatestSemester } from 'data/userData';
import { flushServerActions } from 'data/serverActions';
import useUpNext from 'hooks/useUpNext';
import useIncomingTargets from 'hooks/useIncomingTargets';

/**
 * What the main UI starts once logged in: picks the semester and keeps its
 * courses and timetable fetched, schedules the background sync, sends the
 * waiting server actions once logged in, opens what was tapped outside the app, sets up
 * notifications, and moves downloads from the old folder layout. The widgets,
 * reminders and Spotlight follow the data by themselves (services/surfaces).
 */
const useMainStartup = () => {
  const loggedIn = useLoggedIn();

  // Shows the school's current semester, and moves to the next one when a
  // new term starts, unless the user picked an earlier semester.
  const { data: latestSemester } = useQuery({
    ...schoolSemesterQuery,
    select: selectSemesterId,
    enabled: loggedIn,
  });
  useEffect(() => {
    if (latestSemester) {
      applyLatestSemester(latestSemester);
    }
  }, [latestSemester]);

  // Keeps the semester's courses fetched for every tab.
  useCourses();

  // Keeps this and next week's timetable fetched for Up Next, and shows the
  // calendar writes that failed.
  useUpNext();
  useEffect(
    () => subscribeSurfaceErrors(({ text, type }) => toast(text, type)),
    [],
  );

  useEffect(() => {
    if (loggedIn) {
      void setUpBackgroundFetch();
    }
  }, [loggedIn]);

  // Sends the favorites and notices read that are waiting (offline, or from
  // a notification) once logged in; coming back to the app sends them after
  // checking the session (hooks/useReLogin).
  useEffect(() => {
    if (loggedIn) {
      void flushServerActions();
    }
  }, [loggedIn]);

  useIncomingTargets();

  useEffect(() => {
    void configureNotifications();
    removeLegacyDownloads();
  }, []);
};

export default useMainStartup;
