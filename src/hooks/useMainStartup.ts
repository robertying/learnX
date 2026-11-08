import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import semverGt from 'semver/functions/gt';
import { getLatestRelease } from 'helpers/update';
import { setUpBackgroundFetch } from 'helpers/background';
import { configureNotifications } from 'helpers/notifications';
import useNotificationTaps from 'hooks/useNotificationTaps';
import useLinkTaps from 'hooks/useLinkTaps';
import { setSetting } from 'data/settings';
import { useLoggedIn } from 'data/auth';
import { latestSemesterQuery, useCourses } from 'data/queries';
import { applyLatestSemester } from 'data/userData';
import useDeadlineWidget from 'hooks/useDeadlineWidget';
import useDeadlineReminders from 'hooks/useDeadlineReminders';
import packageJson from '../../package.json';

/**
 * What the main UI starts once logged in: picks the semester, keeps its
 * courses fetched, schedules background fetch, keeps the deadline widget
 * and reminders current, sets up notifications and opens their taps and widget rows' links, and checks
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

  useEffect(() => {
    if (loggedIn) {
      setUpBackgroundFetch();
    }
  }, [loggedIn]);

  useEffect(() => {
    configureNotifications();
  }, []);
  useNotificationTaps();
  useLinkTaps();

  useEffect(() => {
    if (loggedIn && Platform.OS === 'android') {
      getLatestRelease().then(
        ({ version }) => {
          if (semverGt(version, packageJson.version)) {
            setSetting('newUpdate', true);
          }
        },
        // Offline or the mirror is down; checked again on the next launch.
        () => {},
      );
    }
  }, [loggedIn]);
};

export default useMainStartup;
