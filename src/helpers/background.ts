import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import {
  ContentType,
  File as IFile,
  Homework,
  Notification,
} from 'thu-learn-lib-no-native/lib/types';
import dayjs from 'dayjs';
import allSettled from 'promise.allsettled';
import {AppDispatch, store} from 'data/store';
import {dataSource} from 'data/source';
import {Assignment, CoursesState, File, Notice} from 'data/types/state';
import {getAllNoticesForCoursesAction} from 'data/actions/notices';
import {getAllAssignmentsForCoursesAction} from 'data/actions/assignments';
import {getAllFilesForCoursesAction} from 'data/actions/files';

const getAllNotices = async (dispatch: AppDispatch, courses: CoursesState) => {
  const courseIds = courses.items.map(i => i.id);

  const results = await dataSource.getAllContents(
    courseIds,
    ContentType.NOTIFICATION,
  );
  const courseNames = courses.names;
  const notices = Object.keys(results)
    .map(courseId => {
      const noticesForCourse = results[courseId] as Notification[];
      const courseName = courseNames[courseId];
      return noticesForCourse.map<Notice>(notice => ({
        ...notice,
        courseId,
        courseName: courseName.name,
        courseTeacherName: courseName.teacherName,
      }));
    })
    .reduce((a, b) => a.concat(b), [])
    .sort((a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix());

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
      const assignmentsForCourse = results[courseId] as Homework[];
      const courseName = courseNames[courseId];
      return assignmentsForCourse.map<Assignment>(assignment => ({
        ...assignment,
        courseId,
        courseName: courseName.name,
        courseTeacherName: courseName.teacherName,
      }));
    })
    .reduce((a, b) => a.concat(b), [])
    .sort((a, b) => dayjs(b.deadline).unix() - dayjs(a.deadline).unix());
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
      const filesForCourse = results[courseId] as IFile[];
      const courseName = courseNames[courseId];
      return filesForCourse.map<File>(file => ({
        ...file,
        courseId,
        courseName: courseName.name,
        courseTeacherName: courseName.teacherName,
      }));
    })
    .reduce((a, b) => a.concat(b), [])
    .sort((a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix());

  dispatch(getAllFilesForCoursesAction.success(files));
};

const FETCH_ALL_CONTENT_TASK = 'FETCH_ALL_CONTENT_TASK';

TaskManager.defineTask(FETCH_ALL_CONTENT_TASK, async () => {
  const state = store.getState();
  const dispatch = store.dispatch;

  const auth = state.auth;
  const courseIds = state.courses.items.map(i => i.id);

  if (!auth.username || !auth.password || courseIds.length === 0) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  if (!auth.loggedIn) {
    try {
      await dataSource.login(auth.username, auth.password);
    } catch {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  }

  const results = await allSettled([
    getAllNotices(dispatch, state.courses),
    getAllAssignments(dispatch, state.courses),
    getAllFiles(dispatch, state.courses),
  ]);

  if (results.some(result => result.status === 'fulfilled')) {
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } else {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

BackgroundFetch.registerTaskAsync(FETCH_ALL_CONTENT_TASK);
