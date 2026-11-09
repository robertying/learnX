import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import semverGt from 'semver/functions/gt';
import { getLatestRelease } from 'helpers/update';
import { setUpBackgroundFetch } from 'helpers/background';
import { migrateDownloads } from 'helpers/fs';
import { configureNotifications } from 'helpers/notifications';
import { subscribeSurfaceErrors } from 'helpers/surfaces';
import { toast } from 'components/Toast';
import useNotificationTaps from 'hooks/useNotificationTaps';
import useLinkTaps from 'hooks/useLinkTaps';
import { setSetting } from 'data/settings';
import { useLoggedIn } from 'data/auth';
import { latestSemesterQuery, useCourses } from 'data/queries';
import { applyLatestSemester } from 'data/userData';
import { flushServerActions } from 'data/serverActions';
import useSpotlight from 'hooks/useSpotlight';
import useUpNext from 'hooks/useUpNext';
import packageJson from '../../package.json';

/**
 * What the main UI starts once logged in: picks the semester, keeps its
 * courses fetched, schedules background fetch, keeps the deadline and Up
 * Next widgets, reminders and Spotlight current, sets up notifications and
 * opens their
 * taps and widget rows' links, moves downloads from the old folder layout,
 * and checks
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

  // The widgets, reminders and Spotlight follow the data by themselves
  // (helpers/surfaces); the app keeps the timetable they show fetched and
  // shows the calendar writes that failed.
  useUpNext();
  useSpotlight();
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
  // a notification) once logged in and whenever the app comes back.
  useEffect(() => {
    if (!loggedIn) {
      return;
    }
    void flushServerActions();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void flushServerActions();
      }
    });
    return () => subscription.remove();
  }, [loggedIn]);

  useEffect(() => {
    void configureNotifications();
    void migrateDownloads();
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
