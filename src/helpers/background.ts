import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { ContentType } from 'thu-learn-lib';
import dayjs from 'dayjs';
import { AppDispatch, store } from 'data/store';
import { dataSource, loginWithFingerPrint } from 'data/source';
import { loadCredentials } from 'data/credentials';
import { File } from 'data/types/state';
import { coursesQuery, getCourseNames } from 'data/queries';
import { queryClient, restoreQueryCache } from 'data/queryClient';
import { getUserData } from 'data/userData';
import { assignmentsQuery, noticesQuery } from 'data/content';
import { getAllFilesForCoursesAction } from 'data/actions/files';

const getAllFiles = async (dispatch: AppDispatch, courseIds: string[]) => {
  const results = await dataSource.getAllContents(courseIds, ContentType.FILE);
  const files = Object.keys(results).flatMap(courseId => {
    const filesForCourse = results[courseId];
    return filesForCourse.map<File>(file => ({
      ...file,
      courseId,
      ...getCourseNames(courseId),
    }));
  });
  const fileTimestamps = new Map(
    files.map(f => [f.id, dayjs(f.uploadTime).unix()]),
  );
  files.sort(
    (a, b) =>
      fileTimestamps.get(b.id)! - fileTimestamps.get(a.id)! ||
      b.id.localeCompare(a.id),
  );

  dispatch(getAllFilesForCoursesAction.success(files));
};

const FETCH_ALL_CONTENT_TASK = 'FETCH_ALL_CONTENT_TASK';

TaskManager.defineTask(FETCH_ALL_CONTENT_TASK, async () => {
  const dispatch = store.dispatch;

  // The task can run before the app UI has loaded them.
  const [credentials] = await Promise.all([
    loadCredentials(),
    restoreQueryCache(),
  ]);
  const semesterId = getUserData().currentSemester;
  const courseIds = (
    (semesterId &&
      queryClient.getQueryData(coursesQuery(semesterId).queryKey)) ||
    []
  ).map(course => course.id);

  if (
    !credentials?.username ||
    !credentials.password ||
    !credentials.fingerPrint ||
    courseIds.length === 0
  ) {
    return BackgroundTask.BackgroundTaskResult.Success;
  }

  try {
    await loginWithFingerPrint(
      credentials.username,
      credentials.password,
      credentials.fingerPrint,
      credentials.fingerGenPrint,
      credentials.fingerGenPrint3,
    );
  } catch {
    return BackgroundTask.BackgroundTaskResult.Success;
  }

  const results = await Promise.allSettled([
    semesterId &&
      queryClient.fetchQuery({ ...noticesQuery(semesterId), staleTime: 0 }),
    semesterId &&
      queryClient.fetchQuery({ ...assignmentsQuery(semesterId), staleTime: 0 }),
    getAllFiles(dispatch, courseIds),
  ]);

  if (results.some(result => result.status === 'fulfilled')) {
    return BackgroundTask.BackgroundTaskResult.Success;
  } else {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const setUpBackgroundFetch = async () => {
  await BackgroundTask.registerTaskAsync(FETCH_ALL_CONTENT_TASK, {
    minimumInterval: 15,
  });
};
