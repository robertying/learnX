import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import semverGt from 'semver/functions/gt';
import { getLatestRelease } from 'helpers/update';
import { setUpBackgroundFetch } from 'helpers/background';
import { configureNotifications } from 'helpers/notifications';
import useNotificationTaps from 'hooks/useNotificationTaps';
import { setSetting } from 'data/settings';
import { useLoggedIn } from 'data/auth';
import { latestSemesterQuery, useCourses } from 'data/queries';
import { applyLatestSemester } from 'data/userData';
import useDeadlineWidget from 'hooks/useDeadlineWidget';
import useDeadlineReminders from 'hooks/useDeadlineReminders';
import useSpotlight from 'hooks/useSpotlight';
import packageJson from '../../package.json';

/**
 * What the main UI starts once logged in: picks the semester, keeps its
 * courses fetched, schedules background fetch, keeps the deadline widget,
 * reminders and Spotlight current, sets up notifications and their taps, and checks
 * for an Android update.
 */
const useMainStartup = () => {
  const loggedIn = useLoggedIn();

  // Shows the school's current semester, and moves to the next one when a
  // new term starts, unless the user picked an earlier semester.
  const { data: latestSemester } = useQuery({
    ...latestSemesterQuery,
    enabled: loggedIn,
  });
  useEffect(() => {
    if (latestSemester) {
      applyLatestSemester(latestSemester);
    }
  }, [latestSemester]);

  // Keeps the semester's courses fetched for every tab.
  useCourses();

  useDeadlineWidget();
  useDeadlineReminders();
  useSpotlight();

  useEffect(() => {
    if (loggedIn) {
      setUpBackgroundFetch();
    }
  }, [loggedIn]);

  useEffect(() => {
    configureNotifications();
  }, []);
  useNotificationTaps();

  useEffect(() => {
    if (loggedIn && Platform.OS === 'android') {
      (async () => {
        const { version } = await getLatestRelease();
        if (semverGt(version, packageJson.version)) {
          setSetting('newUpdate', true);
        }
      })();
    }
  }, [loggedIn]);
};

export default useMainStartup;
