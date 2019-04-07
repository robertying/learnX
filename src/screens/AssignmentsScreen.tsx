import React, { useEffect } from "react";
import { connect } from "react-redux";
import AssignmentsView from "../components/AssignmentsView";
import dayjs from "../helpers/dayjs";
import { initialRouteName } from "../navigation/MainTabNavigator";
import { getAllAssignmentsForCourses } from "../redux/actions/assignments";
import { getCoursesForSemester } from "../redux/actions/courses";
import {
  IAssignment,
  ICourse,
  IPersistAppState,
  ISemester
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface IAssignmentsScreenStateProps {
  readonly loggedIn: boolean;
  readonly semesterId: ISemester;
  readonly courses: ReadonlyArray<ICourse>;
  readonly assignments: ReadonlyArray<IAssignment>;
  readonly isFetching: boolean;
}

interface IAssignmentsScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllAssignmentsForCourses: (courseIds: string[]) => void;
}

type IAssignmentsScreenProps = IAssignmentsScreenStateProps &
  IAssignmentsScreenDispatchProps;

const AssignmentsScreen: INavigationScreen<IAssignmentsScreenProps> = props => {
  const {
    loggedIn,
    semesterId,
    courses,
    assignments: rawAssignments,
    isFetching,
    getCoursesForSemester,
    getAllAssignmentsForCourses,
    navigation
  } = props;

  const courseIds = courses.map(course => course.id);

  const assignments = [...rawAssignments]
    .filter(item => dayjs(item.deadline).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix());

  useEffect(() => {
    if (initialRouteName === "Assignments" && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId]);

  useEffect(() => {
    if (initialRouteName === "Assignments") {
      invalidateAll();
    }
  }, [courses.length]);

  useEffect(() => {
    if (initialRouteName !== "Assignments") {
      invalidateAll();
    }
  }, []);

  const invalidateAll = () => {
    if (loggedIn && courseIds.length !== 0) {
      getAllAssignmentsForCourses(courseIds);
    }
  };

  const onAssignmentCardPress = (assignmentId: string) => {
    const assignment = assignments.find(item => item.id === assignmentId);

    if (assignment) {
      navigation.navigate("AssignmentDetail", {
        title: assignment.title,
        deadline: dayjs(assignment.deadline).format("llll") + " 截止",
        content: assignment.description
      });
    }
  };

  return (
    <AssignmentsView
      isFetching={isFetching}
      onRefresh={invalidateAll}
      courses={courses}
      assignments={assignments}
      onAssignmentCardPress={onAssignmentCardPress}
    />
  );
};

// tslint:disable-next-line: no-object-mutation
AssignmentsScreen.navigationOptions = {
  title: "作业"
};

function mapStateToProps(
  state: IPersistAppState
): IAssignmentsScreenStateProps {
  return {
    loggedIn: state.auth.loggedIn,
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetching: state.assignments.isFetching,
    assignments: state.assignments.items
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: IAssignmentsScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllAssignmentsForCourses: (courseIds: string[]) =>
    getAllAssignmentsForCourses(courseIds)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssignmentsScreen);
