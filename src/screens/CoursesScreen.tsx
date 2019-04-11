import React, { useEffect } from "react";
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView
} from "react-native";
import { connect } from "react-redux";
import CoursePreviewView from "../components/CourseCard";
import Divider from "../components/Divider";
import Colors from "../constants/Colors";
import { initialRouteName } from "../navigation/MainTabNavigator";
import { getAllAssignmentsForCourses } from "../redux/actions/assignments";
import { getCoursesForSemester } from "../redux/actions/courses";
import { getAllFilesForCourses } from "../redux/actions/files";
import { getAllNoticesForCourses } from "../redux/actions/notices";
import {
  IAssignment,
  ICourse,
  IFile,
  INotice,
  IPersistAppState,
  ISemester
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ICoursesScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly loggedIn: boolean;
  readonly semesterId: ISemester;
  readonly courses: ReadonlyArray<ICourse>;
  readonly notices: ReadonlyArray<INotice>;
  readonly isFetchingNotices: boolean;
  readonly files: ReadonlyArray<IFile>;
  readonly isFetchingFiles: boolean;
  readonly assignments: ReadonlyArray<IAssignment>;
  readonly isFetchingAssignments: boolean;
}

interface ICoursesScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllNoticesForCourses: (courseIds: string[]) => void;
  readonly getAllFilesForCourses: (courseIds: string[]) => void;
  readonly getAllAssignmentsForCourses: (courseIds: string[]) => void;
  // tslint:enable: readonly-array
}

type ICoursesScreenProps = ICoursesScreenStateProps &
  ICoursesScreenDispatchProps;

const CoursesScreen: INavigationScreen<ICoursesScreenProps> = props => {
  const {
    loggedIn,
    semesterId,
    courses,
    notices,
    isFetchingNotices,
    files,
    isFetchingFiles,
    assignments,
    isFetchingAssignments,
    getCoursesForSemester,
    getAllNoticesForCourses,
    getAllFilesForCourses,
    getAllAssignmentsForCourses,
    navigation,
    autoRefreshing
  } = props;

  const courseIds = courses.map(course => course.id);

  const isFetching =
    isFetchingNotices || isFetchingFiles || isFetchingAssignments;

  useEffect(() => {
    if (initialRouteName === "Courses" && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId]);

  useEffect(() => {
    if (initialRouteName === "Courses") {
      invalidateAll();
    }
  }, [courses.length]);

  useEffect(() => {
    if (initialRouteName !== "Courses" && autoRefreshing) {
      invalidateAll();
    }
  }, []);

  const invalidateAll = () => {
    if (loggedIn && courseIds.length !== 0) {
      getAllNoticesForCourses(courseIds);
      getAllFilesForCourses(courseIds);
      getAllAssignmentsForCourses(courseIds);
    }
  };

  const onCoursePreviewPress = (
    courseId: string,
    courseName: string,
    courseTeacherName: string
  ) => {
    navigation.navigate("CourseDetail", {
      courseId,
      courseName,
      courseTeacherName
    });
  };

  const renderListItem: ListRenderItem<ICourse> = ({ item }) => {
    return (
      <CoursePreviewView
        loading={isFetching}
        courseName={item.name}
        courseTeacherName={item.teacherName}
        semester={semesterId}
        noticesCount={
          notices.filter(
            notice => notice.courseId === item.id && notice.hasRead === false
          ).length
        }
        filesCount={
          files.filter(file => file.courseId === item.id && file.isNew === true)
            .length
        }
        assignmentsCount={
          assignments.filter(
            assignment =>
              assignment.courseId === item.id && assignment.submitted === false
          ).length
        }
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() =>
          onCoursePreviewPress(item.id, item.name, item.teacherName)
        }
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f0f0" }}>
      <FlatList
        ItemSeparatorComponent={Divider}
        data={courses}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={invalidateAll}
            colors={[Colors.tint]}
          />
        }
      />
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
CoursesScreen.navigationOptions = {
  title: "课程"
};

function mapStateToProps(state: IPersistAppState): ICoursesScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetchingNotices: state.notices.isFetching,
    notices: state.notices.items,
    isFetchingFiles: state.files.isFetching,
    files: state.files.items,
    isFetchingAssignments: state.assignments.isFetching,
    assignments: state.assignments.items
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: ICoursesScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllNoticesForCourses: (courseIds: string[]) =>
    getAllNoticesForCourses(courseIds),
  getAllFilesForCourses: (courseIds: string[]) =>
    getAllFilesForCourses(courseIds),
  getAllAssignmentsForCourses: (courseIds: string[]) =>
    getAllAssignmentsForCourses(courseIds)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CoursesScreen);
