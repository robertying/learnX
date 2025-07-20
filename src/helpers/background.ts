import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { ContentType } from 'thu-learn-lib';
import dayjs from 'dayjs';
import allSettled from 'promise.allsettled';
import { AppDispatch, store } from 'data/store';
import { dataSource, loginWithFingerPrint } from 'data/source';
import { Assignment, CoursesState, File, Notice } from 'data/types/state';
import { getAllNoticesForCoursesAction } from 'data/actions/notices';
import { getAllAssignmentsForCoursesAction } from 'data/actions/assignments';
import { getAllFilesForCoursesAction } from 'data/actions/files';

const getAllNotices = async (dispatch: AppDispatch, courses: CoursesState) => {
  const courseIds = courses.items.map(i => i.id);

  const results = await dataSource.getAllContents(
    courseIds,
    ContentType.NOTIFICATION,
  );
  const courseNames = courses.names;
  const notices = Object.keys(results)
    .map(courseId => {
      const noticesForCourse = results[courseId];
      const courseName = courseNames[courseId];
      return noticesForCourse.map<Notice>(notice => ({
        ...notice,
        courseId,
        courseName: courseName.name,
        courseTeacherName: courseName.teacherName,
      }));
    })
    .reduce((a, b) => a.concat(b), [])
    .sort(
      (a, b) =>
        dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix() ||
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
  const assignments = Object.keys(results)
    .map(courseId => {
      const assignmentsForCourse = results[courseId];
      const courseName = courseNames[courseId];
      return assignmentsForCourse.map<Assignment>(assignment => ({
        ...assignment,
        courseId,
        courseName: courseName.name,
        courseTeacherName: courseName.teacherName,
      }));
    })
    .reduce((a, b) => a.concat(b), [])
    .sort(
      (a, b) =>
        dayjs(b.deadline).unix() - dayjs(a.deadline).unix() ||
        b.id.localeCompare(a.id),
    );
  const sorted = [
    ...assignments.filter(a => dayjs(a.deadline).isAfter(dayjs())).reverse(),
    ...assignments.filter(a => !dayjs(a.deadline).isAfter(dayjs())),
  ];

  dispatch(getAllAssignmentsForCoursesAction.success(sorted));
};

const getAllFiles = async (dispatch: AppDispatch, courses: CoursesState) => {
  const courseIds = courses.items.map(i => i.id);

  const results = await dataSource.getAllContents(courseIds, ContentType.FILE);
  const courseNames = courses.names;
  const files = Object.keys(results)
    .map(courseId => {
      const filesForCourse = results[courseId];
      const courseName = courseNames[courseId];
      return filesForCourse.map<File>(file => ({
        ...file,
        courseId,
        courseName: courseName.name,
        courseTeacherName: courseName.teacherName,
      }));
    })
    .reduce((a, b) => a.concat(b), [])
    .sort(
      (a, b) =>
        dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix() ||
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

  const results = await allSettled([
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
