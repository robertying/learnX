import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import {store} from '../redux/store';
import {getAllNoticesForCourses} from '../redux/actions/notices';
import {getAllFilesForCourses} from '../redux/actions/files';
import {getAllAssignmentsForCourses} from '../redux/actions/assignments';
import {saveAssignmentsToCalendar} from './calendar';
import {Platform} from 'react-native';

const TASK_NAME = 'LEARNX_FETCH';

export const registerBackgroundTasks = () => {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await backgroundFetch();
      return BackgroundFetch.Result.NewData;
    } catch {
      return BackgroundFetch.Result.Failed;
    }
  });

  BackgroundFetch.registerTaskAsync(TASK_NAME);
};

const backgroundFetch = () => {
  return new Promise((resolve, reject) => {
    const state = store.getState();

    if (!state.auth.loggedIn) {
      return;
    }

    const courses = state.courses.items;
    const courseIds = courses.map((i) => i.id);

    store.dispatch<any>(getAllNoticesForCourses(courseIds));
    store.dispatch<any>(getAllFilesForCourses(courseIds));

    let finishedTasks = false;
    let wasFetching = false;
    const sub = store.subscribe(async () => {
      const state = store.getState();
      const isFetching = state.assignments.isFetching;
      if (wasFetching && !isFetching) {
        if (
          Platform.OS === 'android' &&
          state.settings.calendarSync &&
          state.assignments.items
        ) {
          await saveAssignmentsToCalendar(state.assignments.items);
        }
        finishedTasks = true;
        sub();
        resolve();
      }
      wasFetching = isFetching;
    });

    setTimeout(() => {
      if (!finishedTasks) {
        sub?.();
        reject();
      }
    }, 20 * 1000);

    store.dispatch<any>(getAllAssignmentsForCourses(courseIds));
  });
};
