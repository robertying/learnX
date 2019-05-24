import Fuse from "fuse.js";
import React, { useEffect, useRef, useState } from "react";
import {
  LayoutAnimation,
  ListRenderItem,
  Platform,
  RefreshControl,
  SafeAreaView,
  TextInput,
  View
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import CourseCard from "../components/CourseCard";
import Divider from "../components/Divider";
import EmptyList from "../components/EmptyList";
import SearchBar from "../components/SearchBar";
import SettingsListItem from "../components/SettingsListItem";
import Colors from "../constants/Colors";
import Layout from "../constants/Layout";
import { getTranslation } from "../helpers/i18n";
import { getAllAssignmentsForCourses } from "../redux/actions/assignments";
import {
  getCoursesForSemester,
  pinCourse,
  setCoursesFilter,
  unpinCourse
} from "../redux/actions/courses";
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
  readonly pinnedCourses: readonly string[];
  readonly hidden: readonly string[];
}

interface ICoursesScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllNoticesForCourses: (courseIds: string[]) => void;
  readonly getAllFilesForCourses: (courseIds: string[]) => void;
  readonly getAllAssignmentsForCourses: (courseIds: string[]) => void;
  readonly pinCourse: (courseId: string) => void;
  readonly unpinCourse: (courseId: string) => void;
  readonly setCoursesFilter: (hidden: string[]) => void;
}

type ICoursesScreenProps = ICoursesScreenStateProps &
  ICoursesScreenDispatchProps;

const CoursesScreen: INavigationScreen<ICoursesScreenProps> = props => {
  const {
    loggedIn,
    semesterId,
    courses: rawCourses,
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
    autoRefreshing,
    pinCourse,
    pinnedCourses,
    unpinCourse,
    hidden,
    setCoursesFilter
  } = props;

  const courses: ReadonlyArray<ICourse> = [
    ...rawCourses.filter(item => pinnedCourses.includes(item.id)),
    ...rawCourses.filter(item => !pinnedCourses.includes(item.id))
  ].filter(item => !hidden.includes(item.id));

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
  }, [courses.length, pinnedCourses.length]);

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

  const onPinned = (pin: boolean, courseId: string) => {
    if (pin) {
      pinCourse(courseId);
    } else {
      unpinCourse(courseId);
    }
  };

  const modalVisible = navigation.getParam("filterModalVisible");

  const renderFilterListItem: ListRenderItem<ICourse> = ({ item }) => {
    return (
      <SettingsListItem
        variant="none"
        text={item.name}
        icon={hidden.includes(item.id) ? null : <Icon name="check" size={20} />}
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() =>
          hidden.includes(item.id)
            ? setCoursesFilter(hidden.filter(hid => hid !== item.id))
            : setCoursesFilter([...hidden, item.id])
        }
      />
    );
  };

  const renderListItem: ListRenderItem<ICourse> = ({ item }) => {
    return (
      <CourseCard
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
        pinned={pinnedCourses.includes(item.id)}
        // tslint:disable-next-line: jsx-no-lambda
        onPinned={pin => onPinned(pin, item.id)}
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
      <Modal
        style={{
          margin: 0,
          marginTop: Platform.OS === "android" ? 0 : Layout.statusBarHeight
        }}
        isVisible={modalVisible}
        backdropColor="transparent"
        swipeDirection="down"
        // tslint:disable-next-line: jsx-no-lambda
        onSwipeComplete={() =>
          navigation.setParams({ filterModalVisible: false })
        }
      >
        <View style={{ flex: 1, backgroundColor: "white" }}>
          <Icon.Button
            style={{ margin: 10 }}
            name="close"
            // tslint:disable-next-line: jsx-no-lambda
            onPress={() => {
              navigation.setParams({ filterModalVisible: false });
            }}
            color="black"
            size={24}
            backgroundColor="transparent"
            underlayColor="transparent"
            activeOpacity={0.6}
          />
          <FlatList
            ListEmptyComponent={EmptyList}
            ItemSeparatorComponent={Divider}
            data={rawCourses}
            renderItem={renderFilterListItem}
            keyExtractor={keyExtractor}
          />
        </View>
      </Modal>
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
  title: getTranslation("courses"),
  headerLeft: (
    <Icon.Button
      style={{ marginLeft: 10 }}
      name="filter-list"
      // tslint:disable-next-line: jsx-no-lambda
      onPress={() => {
        navigation.setParams({
          filterModalVisible: true
        });
      }}
      color="white"
      size={24}
      backgroundColor="transparent"
      underlayColor="transparent"
      activeOpacity={0.6}
    />
  ),
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
    assignments: state.assignments.items,
    pinnedCourses: state.courses.pinned || [],
    hidden: state.courses.hidden || []
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
    getAllAssignmentsForCourses(courseIds),
  pinCourse: (courseId: string) => pinCourse(courseId),
  unpinCourse: (courseId: string) => unpinCourse(courseId),
  setCoursesFilter: (hidden: string[]) => setCoursesFilter(hidden)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CoursesScreen);
