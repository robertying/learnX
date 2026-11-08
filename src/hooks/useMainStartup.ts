import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import semverGt from 'semver/functions/gt';
import { getLatestRelease } from 'helpers/update';
import { setUpBackgroundFetch } from 'helpers/background';
import { setSetting } from 'data/settings';
import { useLoggedIn } from 'data/auth';
import { latestSemesterQuery, useCourses } from 'data/queries';
import { setCurrentSemester, useCurrentSemester } from 'data/userData';
import useDeadlineWidget from 'hooks/useDeadlineWidget';
import packageJson from '../../package.json';

/**
 * What the main UI starts once logged in: picks the semester, keeps its
 * courses fetched, schedules background fetch, keeps the deadline widget
 * current and checks for an Android update.
 */
const useMainStartup = () => {
  const loggedIn = useLoggedIn();
  const currentSemester = useCurrentSemester();

  // Shows the school's current semester until the user picks another.
  const { data: latestSemester } = useQuery({
    ...latestSemesterQuery,
    enabled: loggedIn && !currentSemester,
  });
  useEffect(() => {
    if (!currentSemester && latestSemester) {
      setCurrentSemester(latestSemester);
    }
  }, [currentSemester, latestSemester]);

  // Keeps the semester's courses fetched for every tab.
  useCourses();

  useDeadlineWidget();

  useEffect(() => {
    if (loggedIn) {
      setUpBackgroundFetch();
    }
  }, [loggedIn]);

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
