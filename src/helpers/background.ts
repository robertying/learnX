import { diff } from "deep-diff";
import hash from "object-hash";
import BackgroundFetch from "react-native-background-fetch";
import { getAllAssignmentsForCourses } from "../redux/actions/assignments";
import { getAllFilesForCourses } from "../redux/actions/files";
import { getAllNoticesForCourses } from "../redux/actions/notices";
import { store } from "../redux/store";
import { NotificationType } from "../redux/types/state";
import dayjs from "./dayjs";
import { sendLocalNotification } from "./notification";

export const headlessTask = async () => {
  await updateAll();
  BackgroundFetch.finish();
};
BackgroundFetch.registerHeadlessTask(headlessTask);

export const updateAll = () => {
  return new Promise(resolve => {
    // tslint:disable-next-line: no-let
    const state = store.getState();
    const courses = state.courses.items;
    const courseIds = courses.map(course => course.id);

    if (!state.settings.notificationTypes) {
      // tslint:disable-next-line: no-object-mutation
      (state.settings.notificationTypes as any) = [
        NotificationType.Notices,
        NotificationType.Files,
        NotificationType.Assignments,
        NotificationType.Deadlines,
        NotificationType.Grades
      ];
    }

    if (state.settings.notifications) {
      // tslint:disable: no-let
      let notices = [...state.notices.items].sort((a, b) =>
        hash(a).localeCompare(hash(b))
      );
      let files = [...state.files.items].sort((a, b) =>
        hash(a).localeCompare(hash(b))
      );
      let assignments = [...state.assignments.items].sort((a, b) =>
        hash(a).localeCompare(hash(b))
      );
      // tslint:enable: no-let

      if (
        state.settings.notificationTypes.includes(NotificationType.Deadlines) &&
        assignments.length > 0
      ) {
        const dueAssignments = assignments.filter(
          item =>
            !item.submitted &&
            dayjs(item.deadline).unix() > dayjs().unix() &&
            dayjs(item.deadline).diff(dayjs(), "hour", true) <= 48 &&
            dayjs(item.deadline).diff(dayjs(), "hour", true) > 47
        );
        if (dueAssignments.length === 1) {
          sendLocalNotification(
            dueAssignments[0].title,
            "作业将在 2 天后截止提交"
          );
        } else if (dueAssignments.length > 1) {
          sendLocalNotification(
            undefined,
            `你有 ${dueAssignments.length} 个作业将在 2 天后截止提交`
          );
        }
      }

      const removeSubscription = store.subscribe(() => {
        const newState = store.getState();
        const newNotices = [...newState.notices.items].sort((a, b) =>
          hash(a).localeCompare(hash(b))
        );
        const newFiles = [...newState.files.items].sort((a, b) =>
          hash(a).localeCompare(hash(b))
        );
        const newAssignments = [...newState.assignments.items].sort((a, b) =>
          hash(a).localeCompare(hash(b))
        );

        if (
          state.settings.notificationTypes.includes(NotificationType.Notices) &&
          newNotices.length > notices.length &&
          notices.length > 0
        ) {
          const diffs = diff(notices, newNotices)!;
          const newArrayElements = diffs.filter(
            item => item.kind === "A"
          ) as any;
          const newCount = newArrayElements.length;
          if (newCount === 1) {
            sendLocalNotification(
              courses.find(
                item => item.id === newArrayElements[0].item.rhs.courseId
              )!.name,
              `发布了新通知：${newArrayElements[0].item.rhs.title}`
            );
          } else {
            sendLocalNotification(undefined, `你有 ${newCount} 个新通知`);
          }
        }

        if (
          state.settings.notificationTypes.includes(NotificationType.Files) &&
          newFiles.length > files.length &&
          files.length > 0
        ) {
          const diffs = diff(files, newFiles)!;
          const newArrayElements = diffs.filter(
            item => item.kind === "A"
          ) as any;
          const newCount = newArrayElements.length;
          if (newCount === 1) {
            sendLocalNotification(
              courses.find(
                item => item.id === newArrayElements[0].item.rhs.courseId
              )!.name,
              `上传了新文件：${newArrayElements[0].item.rhs.title}`
            );
          } else {
            sendLocalNotification(undefined, `你有 ${newCount} 个新文件`);
          }
        }

        if (newAssignments.length > assignments.length) {
          const diffs = diff(assignments, newAssignments)! as readonly any[];

          if (
            state.settings.notificationTypes.includes(
              NotificationType.Assignments
            ) &&
            assignments.length > 0
          ) {
            const newArrayElements = diffs.filter(item => item.kind === "A");
            const newCount = newArrayElements.length;
            if (newCount === 1) {
              sendLocalNotification(
                courses.find(
                  item => item.id === newArrayElements[0].item.rhs.courseId
                )!.name,
                `布置了新作业：${newArrayElements[0].item.rhs.title}`
              );
            } else {
              sendLocalNotification(undefined, `你有 ${newCount} 个新作业`);
            }
          }

          if (
            state.settings.notificationTypes.includes(
              NotificationType.Grades
            ) &&
            assignments.length > 0
          ) {
            const newGrades = diffs.filter(
              item => item.rhs && item.kind === "N" && item.path[1] === "grade"
            );
            const editedGrades = diffs.filter(
              item => item.rhs && item.kind === "E" && item.path[1] === "grade"
            );
            newGrades.forEach(grade => {
              sendLocalNotification(
                courses.find(
                  item => item.id === newAssignments[grade.path[0]].courseId
                )!.name,
                `发布了作业成绩：${newAssignments[grade.path[0]].title}`
              );
            });
            editedGrades.forEach(grade => {
              sendLocalNotification(
                courses.find(
                  item => item.id === newAssignments[grade.path[0]].courseId
                )!.name,
                `更新了作业成绩：${newAssignments[grade.path[0]].title}`
              );
            });
          }
        } else if (newAssignments.length === assignments.length) {
          if (
            state.settings.notificationTypes.includes(
              NotificationType.Grades
            ) &&
            assignments.length > 0
          ) {
            const diffs = diff(assignments, newAssignments)! as readonly any[];
            if (!diffs) {
              return;
            }
            const newGrades = diffs.filter(
              item => item.rhs && item.kind === "N" && item.path[1] === "grade"
            );
            const editedGrades = diffs.filter(
              item => item.rhs && item.kind === "E" && item.path[1] === "grade"
            );
            newGrades.forEach(grade => {
              sendLocalNotification(
                courses.find(
                  item => item.id === newAssignments[grade.path[0]].courseId
                )!.name,
                `发布了作业成绩：${newAssignments[grade.path[0]].title}`
              );
            });
            editedGrades.forEach(grade => {
              sendLocalNotification(
                courses.find(
                  item => item.id === newAssignments[grade.path[0]].courseId
                )!.name,
                `更新了作业成绩：${newAssignments[grade.path[0]].title}`
              );
            });
          }
        }

        notices = newNotices;
        files = newFiles;
        assignments = newAssignments;

        if (
          !newState.notices.isFetching &&
          !newState.files.isFetching &&
          !newState.assignments.isFetching
        ) {
          removeSubscription();
          resolve();
        }
      });
    }

    store.dispatch(getAllNoticesForCourses(courseIds));
    store.dispatch(getAllFilesForCourses(courseIds));
    store.dispatch(getAllAssignmentsForCourses(courseIds));
  });
};
