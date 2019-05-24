import Fuse from "fuse.js";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  ListRenderItem,
  Platform,
  SafeAreaView,
  TextInput,
  View
} from "react-native";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import AssignmentsView from "../components/AssignmentsView";
import Divider from "../components/Divider";
import EmptyList from "../components/EmptyList";
import SearchBar from "../components/SearchBar";
import SettingsListItem from "../components/SettingsListItem";
import Layout from "../constants/Layout";
import dayjs from "../helpers/dayjs";
import { getLocale, getTranslation } from "../helpers/i18n";
import {
  getAllAssignmentsForCourses,
  pinAssignment,
  unpinAssignment
} from "../redux/actions/assignments";
import {
  getCoursesForSemester,
  setCoursesFilter
} from "../redux/actions/courses";
import {
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
  readonly hidden: readonly string[];
}

interface IAssignmentsScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllAssignmentsForCourses: (courseIds: string[]) => void;
  readonly pinAssignment: (assignmentId: string) => void;
  readonly unpinAssignment: (assignmentId: string) => void;
  readonly setCoursesFilter: (hidden: string[]) => void;
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
    hidden,
    setCoursesFilter
  } = props;

  const courseIds = courses.map(course => course.id);

  const assignments = [...rawAssignments]
    .filter(item => !hidden.includes(item.courseId))
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
        deadline: getLocale().startsWith("zh")
          ? dayjs(assignment.deadline).format("llll") + " 截止"
          : "Submission close on " + dayjs(assignment.deadline).format("llll"),
        description: assignment.description,
        attachmentName: assignment.attachmentName,
        attachmentUrl: assignment.attachmentUrl,
        submittedAttachmentName: assignment.submittedAttachmentName,
        submittedAttachmentUrl: assignment.submittedAttachmentUrl,
        submitTime: assignment.submitTime,
        grade: assignment.grade,
        gradeContent: assignment.gradeContent
      });
    }
  };

  const isSearching = navigation.getParam("isSearching", false);
  const searchBarRef = useRef<TextInput>();
  const [searchResult, setSearchResult] = useState(assignments);

  useEffect(() => {
    setSearchResult(assignments);
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

  const modalVisible = navigation.getParam("filterModalVisible");

  const renderListItem: ListRenderItem<ICourse> = ({ item }) => {
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

  const keyExtractor = (item: any) => item.id;

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
            data={courses}
            renderItem={renderListItem}
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
  keys: ["attachmentName", "description", "title"]
};

// tslint:disable-next-line: no-object-mutation
AssignmentsScreen.navigationOptions = ({ navigation }) => ({
  title: getTranslation("assignments"),
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
    hidden: state.courses.hidden || []
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: IAssignmentsScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllAssignmentsForCourses: (courseIds: string[]) =>
    getAllAssignmentsForCourses(courseIds),
  pinAssignment: (assignmentId: string) => pinAssignment(assignmentId),
  unpinAssignment: (assignmentId: string) => unpinAssignment(assignmentId),
  setCoursesFilter: (hidden: string[]) => setCoursesFilter(hidden)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssignmentsScreen);
