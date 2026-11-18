import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { setUpBackgroundFetch } from 'services/background';
import { removeLegacyDownloads } from 'services/files/downloads';
import { configureNotifications } from 'services/notifications';
import { takeLaunchNotification } from 'services/launchOptions';
import { postLaunchNotification } from 'services/notificationSamples';
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
import useLinkTaps from 'hooks/useLinkTaps';
import useNotificationTaps from 'hooks/useNotificationTaps';
import useSpotlightTaps from 'hooks/useSpotlightTaps';
import useJumpListTaps from 'hooks/useJumpListTaps';

/**
 * What the main UI starts once logged in. The widgets, reminders and
 * Spotlight aren't started here: they follow the data by themselves
 * (services/surfaces).
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
    () =>
      subscribeSurfaceErrors(({ text, type }) =>
        toast(text, type, { haptic: false }),
      ),
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

  // Debug and E2E builds: the notification the launch arguments ask for,
  // once its items have loaded.
  useEffect(() => {
    const spec = loggedIn ? takeLaunchNotification() : undefined;
    if (spec) {
      void postLaunchNotification(spec);
    }
  }, [loggedIn]);

  // What the user tapped outside the app (a notification, a widget row or
  // another learnx:// link, a Spotlight result, or the Electron app's Jump
  // List), including the one that launched it. Each goes through `useOpenTarget`, which shows the item's
  // list and leaves the item to it (`usePendingTarget`).
  useNotificationTaps();
  useLinkTaps();
  useSpotlightTaps();
  useJumpListTaps();

  useEffect(() => {
    void configureNotifications();
    removeLegacyDownloads();
  }, []);
};

export default useMainStartup;
