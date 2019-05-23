import BackgroundFetch from "react-native-background-fetch";
import { getAllAssignmentsForCourses } from "../redux/actions/assignments";
import { getAllFilesForCourses } from "../redux/actions/files";
import { getAllNoticesForCourses } from "../redux/actions/notices";
import { store } from "../redux/store";

export const headlessTask = async () => {
  await updateAll();
  BackgroundFetch.finish();
};
BackgroundFetch.registerHeadlessTask(headlessTask);

export const updateAll = () => {
  return new Promise(async resolve => {
    const state = store.getState();
    const courses = state.courses.items;
    const courseIds = courses.map(course => course.id);

    await store.dispatch(getAllNoticesForCourses(courseIds));
    await store.dispatch(getAllFilesForCourses(courseIds));
    await store.dispatch(getAllAssignmentsForCourses(courseIds));

    resolve();
  });
};
