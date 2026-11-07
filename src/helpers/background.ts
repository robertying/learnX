import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { ContentType } from 'thu-learn-lib';
import dayjs from 'dayjs';
import { AppDispatch, store } from 'data/store';
import { dataSource, loginWithFingerPrint } from 'data/source';
import { Assignment, CoursesState, File, Notice } from 'data/types/state';
import { getAllNoticesForCoursesAction } from 'data/actions/notices';
import { getAllAssignmentsForCoursesAction } from 'data/actions/assignments';
import { getAllFilesForCoursesAction } from 'data/actions/files';
import { sortAssignments } from 'helpers/assignments';

const getAllNotices = async (dispatch: AppDispatch, courses: CoursesState) => {
  const courseIds = courses.items.map(i => i.id);

  const results = await dataSource.getAllContents(
    courseIds,
    ContentType.NOTIFICATION,
  );
  const courseNames = courses.names;
  const notices = Object.keys(results).flatMap(courseId => {
    const noticesForCourse = results[courseId];
    const courseName = courseNames[courseId];
    return noticesForCourse.map<Notice>(notice => ({
      ...notice,
      courseId,
      courseName: courseName.name,
      courseTeacherName: courseName.teacherName,
    }));
  });
  const noticeTimestamps = new Map(
    notices.map(n => [n.id, dayjs(n.publishTime).unix()]),
  );
  notices.sort(
    (a, b) =>
      noticeTimestamps.get(b.id)! - noticeTimestamps.get(a.id)! ||
      b.id.localeCompare(a.id),
  );

  dispatch(getAllNoticesForCoursesAction.success(notices));
};

const getAllAssignments = async (
  dispatch: AppDispatch,
  courses: CoursesState,
) => {
  const courseIds = courses.items.map(i => i.id);

  const results = await dataSource.getAllContents(
    courseIds,
    ContentType.HOMEWORK,
  );
  const courseNames = courses.names;
  const assignments = Object.keys(results).flatMap(courseId => {
    const assignmentsForCourse = results[courseId];
    const courseName = courseNames[courseId];
    return assignmentsForCourse.map<Assignment>(assignment => ({
      ...assignment,
      courseId,
      courseName: courseName.name,
      courseTeacherName: courseName.teacherName,
    }));
  });

  dispatch(
    getAllAssignmentsForCoursesAction.success(sortAssignments(assignments)),
  );
};

const getAllFiles = async (dispatch: AppDispatch, courses: CoursesState) => {
  const courseIds = courses.items.map(i => i.id);

  const results = await dataSource.getAllContents(courseIds, ContentType.FILE);
  const courseNames = courses.names;
  const files = Object.keys(results).flatMap(courseId => {
    const filesForCourse = results[courseId];
    const courseName = courseNames[courseId];
    return filesForCourse.map<File>(file => ({
      ...file,
      courseId,
      courseName: courseName.name,
      courseTeacherName: courseName.teacherName,
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
  const state = store.getState();
  const dispatch = store.dispatch;

  const auth = state.auth;
  const courseIds = state.courses.items.map(i => i.id);

  if (
    !auth.username ||
    !auth.password ||
    !auth.fingerPrint ||
    courseIds.length === 0
  ) {
    return BackgroundTask.BackgroundTaskResult.Success;
  }

  try {
    await loginWithFingerPrint(
      auth.username,
      auth.password,
      auth.fingerPrint,
      auth.fingerGenPrint ?? '',
      auth.fingerGenPrint3 ?? '',
    );
  } catch {
    return BackgroundTask.BackgroundTaskResult.Success;
  }

  const results = await Promise.allSettled([
    getAllNotices(dispatch, state.courses),
    getAllAssignments(dispatch, state.courses),
    getAllFiles(dispatch, state.courses),
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
