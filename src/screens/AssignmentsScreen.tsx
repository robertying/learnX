import * as Haptics from "expo-haptics";
import { FuseOptions } from "fuse.js";
import React, { useEffect } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  SafeAreaView
} from "react-native";
import { Navigation } from "react-native-navigation";
import { Provider as PaperProvider, Searchbar } from "react-native-paper";
import { connect } from "react-redux";
import AssignmentCard from "../components/AssignmentCard";
import EmptyList from "../components/EmptyList";
import Colors from "../constants/Colors";
import DeviceInfo from "../constants/DeviceInfo";
import dayjs from "../helpers/dayjs";
import { getTranslation } from "../helpers/i18n";
import { showToast } from "../helpers/toast";
import useSearchBar from "../hooks/useSearchBar";
import {
  getAllAssignmentsForCourses,
  pinAssignment,
  unpinAssignment
} from "../redux/actions/assignments";
import { login } from "../redux/actions/auth";
import { getCoursesForSemester } from "../redux/actions/courses";
import {
  IAssignment,
  ICourse,
  IPersistAppState,
  withCourseInfo
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";
import { IAssignmentDetailScreenProps } from "./AssignmentDetailScreen";

interface IAssignmentsScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly loggedIn: boolean;
  readonly username: string;
  readonly password: string;
  readonly semesterId: string;
  readonly courses: ReadonlyArray<ICourse>;
  readonly assignments: ReadonlyArray<IAssignment>;
  readonly isFetching: boolean;
  readonly pinnedAssignments: readonly string[];
  readonly hidden: readonly string[];
}

interface IAssignmentsScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable-next-line: readonly-array
  readonly getAllAssignmentsForCourses: (courseIds: string[]) => void;
  readonly pinAssignment: (assignmentId: string) => void;
  readonly unpinAssignment: (assignmentId: string) => void;
  readonly login: (username: string, password: string) => void;
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
    autoRefreshing,
    pinnedAssignments,
    pinAssignment,
    unpinAssignment,
    hidden,
    username,
    password,
    login
  } = props;

  /**
   * Prepare data
   */

  const courseIds = courses.map(course => course.id);
  const courseNames = courses.reduce(
    (a, b) => ({
      ...a,
      ...{
        [b.id]: { courseName: b.name, courseTeacherName: b.teacherName }
      }
    }),
    {}
  ) as {
    readonly [id: string]: {
      readonly courseName: string;
      readonly courseTeacherName: string;
    };
  };

  const assignments = [
    ...rawAssignments
      .filter(item => dayjs(item.deadline).unix() > dayjs().unix())
      .sort((a, b) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix()),
    ...rawAssignments
      .filter(item => dayjs(item.deadline).unix() < dayjs().unix())
      .sort((a, b) => dayjs(b.deadline).unix() - dayjs(a.deadline).unix())
  ].map(assignment => ({
    ...assignment,
    ...courseNames[assignment.courseId]
  }));

  /**
   * Fetch and handle error
   */

  useEffect(() => {
    if (courses.length === 0 && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId, courses.length]);

  useEffect(() => {
    if (autoRefreshing || assignments.length === 0) {
      invalidateAll();
    }
  }, [courses.length, loggedIn]);

  const invalidateAll = () => {
    if (courseIds.length !== 0) {
      if (loggedIn) {
        getAllAssignmentsForCourses(courseIds);
      } else {
        showToast(getTranslation("refreshFailure"), 1500);
        login(username, password);
      }
    }
  };

  /**
   * Render cards
   */

  const onAssignmentCardPress = (assignmentId: string, reactTag?: number) => {
    const assignment = assignments.find(item => item.id === assignmentId);

    if (assignment) {
      if (DeviceInfo.isPad) {
        Navigation.setStackRoot("detail.root", [
          {
            component: {
              name: "assignments.detail",
              passProps: {
                title: assignment.title,
                deadline: assignment.deadline,
                description: assignment.description,
                attachmentName: assignment.attachmentName,
                attachmentUrl: assignment.attachmentUrl,
                submittedAttachmentName: assignment.submittedAttachmentName,
                submittedAttachmentUrl: assignment.submittedAttachmentUrl,
                submitTime: assignment.submitTime,
                grade: assignment.grade,
                gradeLevel: assignment.gradeLevel,
                gradeContent: assignment.gradeContent
              },
              options: {
                topBar: {
                  title: {
                    text: assignment.courseName
                  }
                },
                animations: {
                  setStackRoot: {
                    enabled: false
                  }
                } as any
              }
            }
          }
        ]);
      } else {
        Navigation.push<IAssignmentDetailScreenProps>(props.componentId, {
          component: {
            name: "assignments.detail",
            passProps: {
              title: assignment.title,
              deadline: assignment.deadline,
              description: assignment.description,
              attachmentName: assignment.attachmentName,
              attachmentUrl: assignment.attachmentUrl,
              submittedAttachmentName: assignment.submittedAttachmentName,
              submittedAttachmentUrl: assignment.submittedAttachmentUrl,
              submitTime: assignment.submitTime,
              grade: assignment.grade,
              gradeLevel: assignment.gradeLevel,
              gradeContent: assignment.gradeContent
            },
            options: {
              topBar: {
                title: {
                  text: assignment.courseName
                }
              },
              preview: {
                reactTag,
                commit: true
              }
            }
          }
        });
      }
    }
  };

  const onPinned = (pin: boolean, noticeId: string) => {
    if (pin) {
      pinAssignment(noticeId);
    } else {
      unpinAssignment(noticeId);
    }
  };

  const renderListItem = ({
    item
  }: {
    readonly item: withCourseInfo<IAssignment>;
  }) => (
    <AssignmentCard
      title={item.title}
      hasAttachment={item.attachmentName ? true : false}
      submitted={item.submitted}
      graded={item.gradeTime ? true : false}
      date={item.deadline}
      description={item.description}
      courseName={item.courseName}
      courseTeacherName={item.courseTeacherName}
      dragEnabled={item.courseName && item.courseTeacherName ? true : false}
      pinned={pinnedAssignments.includes(item.id)}
      // tslint:disable: jsx-no-lambda
      onPinned={pin => onPinned!(pin, item.id)}
      onPress={() => {
        onAssignmentCardPress(item.id, undefined);
      }}
      onPressIn={
        DeviceInfo.isPad
          ? undefined
          : (e: { readonly reactTag: number | null }) => {
              onAssignmentCardPress(item.id, e.reactTag!);
            }
      }
      // tslint:enable: jsx-no-lambda
    />
  );

  /**
   * iOS Refresh
   */

  const onScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    if (offsetY < -60 && !isFetching) {
      showToast(getTranslation("refreshing"), 3000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      invalidateAll();
    }
  };

  /**
   * Android Refresh
   */

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    invalidateAll();
  };

  /**
   * Search
   */

  const [searchResults, searchBarText, setSearchBarText] = useSearchBar<
    withCourseInfo<IAssignment>
  >(assignments, pinnedAssignments, hidden, fuseOptions);

  return (
    <PaperProvider>
      {Platform.OS === "android" && (
        <Searchbar
          style={{ elevation: 4 }}
          clearButtonMode="always"
          placeholder={getTranslation("searchAssignments")}
          onChangeText={setSearchBarText}
          value={searchBarText}
        />
      )}
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <FlatList
          ListEmptyComponent={EmptyList}
          data={searchResults}
          renderItem={renderListItem}
          // tslint:disable-next-line: jsx-no-lambda
          keyExtractor={item => item.id}
          onScrollEndDrag={Platform.OS === "ios" ? onScrollEndDrag : undefined}
          refreshControl={
            Platform.OS === "android" ? (
              <RefreshControl
                colors={[Colors.theme]}
                onRefresh={onRefresh}
                refreshing={isFetching}
              />
            ) : (
              undefined
            )
          }
        />
      </SafeAreaView>
    </PaperProvider>
  );
};

const fuseOptions: FuseOptions<withCourseInfo<IAssignment>> = {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ["attachmentName", "description", "title"]
};

// tslint:disable-next-line: no-object-mutation
AssignmentsScreen.options = {
  topBar: {
    title: {
      text: getTranslation("assignments")
    },
    largeTitle: {
      visible: true
    },
    searchBar: true,
    searchBarPlaceholder: getTranslation("searchAssignments"),
    hideNavBarOnFocusSearchBar: true,
    elevation: 0
  }
};

function mapStateToProps(
  state: IPersistAppState
): IAssignmentsScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    username: state.auth.username || "",
    password: state.auth.password || "",
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
  login: (username: string, password: string) => login(username, password)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssignmentsScreen);
