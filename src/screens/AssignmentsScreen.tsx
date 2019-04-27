import Fuse from "fuse.js";
import React, { useEffect, useRef, useState } from "react";
import { LayoutAnimation, SafeAreaView, TextInput } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import AssignmentsView from "../components/AssignmentsView";
import SearchBar from "../components/SearchBar";
import dayjs from "../helpers/dayjs";
import {
  getAllAssignmentsForCourses,
  pinAssignment,
  unpinAssignment
} from "../redux/actions/assignments";
  IAssignment,
  ICourse,
  IPersistAppState,
  ISemester
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface IAssignmentsScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly loggedIn: boolean;
  readonly semesterId: ISemester;
  readonly courses: ReadonlyArray<ICourse>;
  readonly assignments: ReadonlyArray<IAssignment>;
  readonly isFetching: boolean;
  readonly pinnedAssignments: readonly string[];
}

interface IAssignmentsScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllAssignmentsForCourses: (courseIds: string[]) => void;
  readonly pinAssignment: (assignmentId: string) => void;
  readonly unpinAssignment: (assignmentId: string) => void;
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
    navigation,
    autoRefreshing,
    pinnedAssignments,
    pinAssignment,
    unpinAssignment,
  } = props;

  const courseIds = courses.map(course => course.id);

  const assignments = [...rawAssignments]
    .filter(item => dayjs(item.deadline).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix());

  useEffect(() => {
    if (courses.length === 0 && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId, courses.length]);

  useEffect(() => {
    if (autoRefreshing || assignments.length === 0) {
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

  const isSearching = navigation.getParam("isSearching", false);
  const searchBarRef = useRef<TextInput>();
  const [searchResult, setSearchResult] = useState(assignments);

  useEffect(() => {
    if (assignments.length) {
      setSearchResult(assignments);
    }
  }, [assignments.length]);

  useEffect(() => {
    if (isSearching) {
      if (searchBarRef.current) {
        searchBarRef.current.focus();
      }
    } else {
      setSearchResult(assignments);
    }
  }, [isSearching]);

  const onSearchChange = (text: string) => {
    if (text) {
      const fuse = new Fuse(assignments, fuseOptions);
      setSearchResult(fuse.search(text));
    }
  };

  const onPinned = (pin: boolean, assignmentId: string) => {
    if (pin) {
      pinAssignment(assignmentId);
    } else {
      unpinAssignment(assignmentId);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {isSearching && (
        <SearchBar
          ref={searchBarRef as any}
          // tslint:disable-next-line: jsx-no-lambda
          onCancel={() => {
            LayoutAnimation.easeInEaseOut();
            navigation.setParams({ isSearching: false });
          }}
          onChangeText={onSearchChange}
        />
      )}
      <AssignmentsView
        isFetching={isFetching}
        onRefresh={invalidateAll}
        courses={courses}
        assignments={searchResult}
        onAssignmentCardPress={onAssignmentCardPress}
        pinnedAssignments={pinnedAssignments || []}
        onPinned={onPinned}
      />
    </SafeAreaView>
  );
};

const fuseOptions = {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ["attachmentName", "description", "title"]
};

// tslint:disable-next-line: no-object-mutation
AssignmentsScreen.navigationOptions = ({ navigation }) => ({
  title: "作业",
  headerRight: (
    <Icon.Button
      name="search"
      // tslint:disable-next-line: jsx-no-lambda
      onPress={() => {
        LayoutAnimation.easeInEaseOut();
        navigation.setParams({
          isSearching: !navigation.getParam("isSearching", false)
        });
      }}
      color="white"
      size={24}
      backgroundColor="transparent"
      underlayColor="transparent"
      activeOpacity={0.6}
    />
  )
});

function mapStateToProps(
  state: IPersistAppState
): IAssignmentsScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetching: state.assignments.isFetching,
    assignments: state.assignments.items,
    pinnedAssignments: state.assignments.pinned,
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
