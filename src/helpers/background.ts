import dataSource from '../redux/dataSource';
import {store} from '../redux/store';
import {ContentType, Homework} from 'thu-learn-lib-no-native/lib/types';
import {getAllAssignmentsForCoursesAction} from '../redux/actions/assignments';
import {saveAssignmentsToCalendar} from './calendar';
import BackgroundFetch from 'react-native-background-fetch';

export const runBackgroundTask = () => {
  updateAssignments().then(() =>
    BackgroundFetch.finish(BackgroundFetch.FETCH_RESULT_NEW_DATA),
  );
};

const updateAssignments = async () => {
  const state = store.getState();
  const courseIds = state.courses.items.map(i => i.id);

  if (courseIds.length === 0) {
    return;
  }

  const results = await dataSource.getAllContents(
    courseIds,
    ContentType.HOMEWORK,
  );

  if (results) {
    const assignments = Object.keys(results)
      .map(courseId => {
        const assignmentsForCourse = results[courseId] as Homework[];
        return assignmentsForCourse.map(assignment => ({
          ...assignment,
          courseId,
          description: assignment.description
            ? assignment.description.startsWith('\xC2\x9E\xC3\xA9\x65')
              ? assignment.description.substr(5)
              : assignment.description.startsWith('\x9E\xE9\x65')
              ? assignment.description.substr(3)
              : assignment.description
            : '',
        }));
      })
      .reduce((a, b) => a.concat(b));

    await store.dispatch(
      getAllAssignmentsForCoursesAction.success(assignments),
    );

    if (state.settings.calendarSync) {
      await saveAssignmentsToCalendar(assignments);
    }
  }
};
