import Fuse from "fuse.js";
import React, { useEffect, useRef, useState } from "react";
import {
  LayoutAnimation,
  ListRenderItem,
  RefreshControl,
  SafeAreaView,
  TextInput
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import CoursePreviewView from "../components/CourseCard";
import Divider from "../components/Divider";
import SearchBar from "../components/SearchBar";
import Colors from "../constants/Colors";
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
    if (courses.length === 0 && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId, courses.length]);

  useEffect(() => {
    if (
      autoRefreshing ||
      notices.length === 0 ||
      files.length === 0 ||
      assignments.length === 0
    ) {
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

  const isSearching = navigation.getParam("isSearching", false);
  const searchBarRef = useRef<TextInput>();
  const [searchResult, setSearchResult] = useState(courses);

  useEffect(() => {
    if (courses.length) {
      setSearchResult(courses);
    }
  }, [courses.length]);

  useEffect(() => {
    if (isSearching) {
      if (searchBarRef.current) {
        searchBarRef.current.focus();
      }
    } else {
      setSearchResult(courses);
    }
  }, [isSearching]);

  const onSearchChange = (text: string) => {
    if (text) {
      const fuse = new Fuse(courses, fuseOptions);
      setSearchResult(fuse.search(text));
    }
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
      <FlatList
        ItemSeparatorComponent={Divider}
        data={searchResult}
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

const fuseOptions = {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ["name", "teacherName"]
};

// tslint:disable-next-line: no-object-mutation
CoursesScreen.navigationOptions = ({ navigation }) => ({
  title: "课程",
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
