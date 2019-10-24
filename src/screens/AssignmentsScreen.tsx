import React, {useEffect, useMemo, useCallback, useState} from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  SegmentedControlIOS,
} from 'react-native';
import {
  Provider as PaperProvider,
  Searchbar,
  DefaultTheme,
  DarkTheme,
} from 'react-native-paper';
import {connect} from 'react-redux';
import AssignmentCard from '../components/AssignmentCard';
import EmptyList from '../components/EmptyList';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import useSearchBar from '../hooks/useSearchBar';
import {
  getAllAssignmentsForCourses,
  pinAssignment,
  unpinAssignment,
  favAssignment,
  unfavAssignment,
} from '../redux/actions/assignments';
import {IAssignment, ICourse, IPersistAppState} from '../redux/types/state';
import {INavigationScreen, WithCourseInfo} from '../types';
import {IAssignmentDetailScreenProps} from './AssignmentDetailScreen';
import {useDarkMode} from 'react-native-dark-mode';
import {setDetailView, pushTo, getScreenOptions} from '../helpers/navigation';
import {getFuseOptions} from '../helpers/search';

interface IAssignmentsScreenStateProps {
  loggedIn: boolean;
  courses: ICourse[];
  hiddenCourseIds: string[];
  isFetching: boolean;
  assignments: IAssignment[];
  pinnedAssignmentIds: string[];
  favAssignmentIds: string[];
  compactWidth: boolean;
}

interface IAssignmentsScreenDispatchProps {
  getAllAssignmentsForCourses: (courseIds: string[]) => void;
  pinAssignment: (assignmentId: string) => void;
  unpinAssignment: (assignmentId: string) => void;
  favAssignment: (assignmentId: string) => void;
  unfavAssignment: (assignmentId: string) => void;
}

type IAssignmentsScreenProps = IAssignmentsScreenStateProps &
  IAssignmentsScreenDispatchProps;

const AssignmentsScreen: INavigationScreen<IAssignmentsScreenProps> = props => {
  const {
    courses,
    assignments,
    isFetching,
    getAllAssignmentsForCourses,
    pinAssignment,
    pinnedAssignmentIds,
    unpinAssignment,
    hiddenCourseIds,
    favAssignmentIds,
    favAssignment,
    unfavAssignment,
    compactWidth,
    loggedIn,
  } = props;

  /**
   * Prepare data
   */

  const courseNames = useMemo(
    () =>
      courses.reduce(
        (a, b) => ({
          ...a,
          ...{
            [b.id]: {courseName: b.name, courseTeacherName: b.teacherName},
          },
        }),
        {},
      ) as {
        [id: string]: {
          courseName: string;
          courseTeacherName: string;
        };
      },
    [courses],
  );

  const sortedAssignments = useMemo(
    () =>
      [
        ...assignments
          .filter(item => dayjs(item.deadline).unix() > dayjs().unix())
          .sort((a, b) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix()),
        ...assignments
          .filter(item => dayjs(item.deadline).unix() < dayjs().unix())
          .sort((a, b) => dayjs(b.deadline).unix() - dayjs(a.deadline).unix()),
      ].map(assignment => ({
        ...assignment,
        ...courseNames[assignment.courseId],
      })),
    [assignments, courseNames],
  );

  const newAssignments = useMemo(() => {
    const newAssignmentsOnly = sortedAssignments.filter(
      i =>
        !favAssignmentIds.includes(i.id) &&
        !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...newAssignmentsOnly.filter(i => pinnedAssignmentIds.includes(i.id)),
      ...newAssignmentsOnly.filter(i => !pinnedAssignmentIds.includes(i.id)),
    ];
  }, [
    favAssignmentIds,
    hiddenCourseIds,
    pinnedAssignmentIds,
    sortedAssignments,
  ]);

  const favAssignments = useMemo(() => {
    const favAssignmentsOnly = sortedAssignments.filter(
      i =>
        favAssignmentIds.includes(i.id) &&
        !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...favAssignmentsOnly.filter(i => pinnedAssignmentIds.includes(i.id)),
      ...favAssignmentsOnly.filter(i => !pinnedAssignmentIds.includes(i.id)),
    ];
  }, [
    favAssignmentIds,
    hiddenCourseIds,
    pinnedAssignmentIds,
    sortedAssignments,
  ]);

  const hiddenAssignments = useMemo(() => {
    const hiddenAssignmentsOnly = sortedAssignments.filter(i =>
      hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...hiddenAssignmentsOnly.filter(i => pinnedAssignmentIds.includes(i.id)),
      ...hiddenAssignmentsOnly.filter(i => !pinnedAssignmentIds.includes(i.id)),
    ];
  }, [hiddenCourseIds, pinnedAssignmentIds, sortedAssignments]);

  const [currentDisplayAssignments, setCurrentDisplayAssignments] = useState(
    newAssignments,
  );

  /**
   * Fetch and handle error
   */

  const invalidateAll = useCallback(() => {
    if (loggedIn && courses.length !== 0) {
      getAllAssignmentsForCourses(courses.map(i => i.id));
    }
  }, [courses, getAllAssignmentsForCourses, loggedIn]);

  useEffect(() => {
    if (assignments.length === 0) {
      invalidateAll();
    }
  }, [invalidateAll, assignments.length]);

  /**
   * Render cards
   */

  const onAssignmentCardPress = (assignment: WithCourseInfo<IAssignment>) => {
    const name = 'assignments.detail';
    const passProps = {
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
      gradeContent: assignment.gradeContent,
      courseName: assignment.courseName,
    };
    const title = assignment.courseName;

    if (DeviceInfo.isIPad() && !compactWidth) {
      setDetailView<IAssignmentDetailScreenProps>(name, passProps, title);
    } else {
      pushTo<IAssignmentDetailScreenProps>(
        name,
        props.componentId,
        passProps,
        title,
      );
    }
  };

  const onPinned = (pin: boolean, assignmentId: string) => {
    if (pin) {
      pinAssignment(assignmentId);
    } else {
      unpinAssignment(assignmentId);
    }
  };

  const onFav = (fav: boolean, assignmentId: string) => {
    if (fav) {
      favAssignment(assignmentId);
    } else {
      unfavAssignment(assignmentId);
    }
  };

  const renderListItem = ({item}: {item: WithCourseInfo<IAssignment>}) => (
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
      pinned={pinnedAssignmentIds.includes(item.id)}
      onPinned={pin => onPinned(pin, item.id)}
      fav={favAssignmentIds.includes(item.id)}
      onFav={fav => onFav(fav, item.id)}
      onPress={() => {
        onAssignmentCardPress(item);
      }}
    />
  );

  /**
   * Refresh
   */

  const onRefresh = () => {
    invalidateAll();
  };

  /**
   * Search
   */

  const [searchResults, searchBarText, setSearchBarText] = useSearchBar<
    WithCourseInfo<IAssignment>
  >(currentDisplayAssignments, fuseOptions);

  const [segment, setSegment] = useState('new');

  const handleSegmentChange = (value: string) => {
    if (value === getTranslation('new')) {
      setSegment('new');
      setCurrentDisplayAssignments(newAssignments);
    } else if (value === getTranslation('favorite')) {
      setSegment('favorite');
      setCurrentDisplayAssignments(favAssignments);
    } else {
      setSegment('hidden');
      setCurrentDisplayAssignments(hiddenAssignments);
    }
  };

  useEffect(() => {
    if (segment === 'new') {
      setCurrentDisplayAssignments(newAssignments);
    }
  }, [newAssignments, segment]);

  useEffect(() => {
    if (segment === 'favorite') {
      setCurrentDisplayAssignments(favAssignments);
    }
  }, [favAssignments, segment]);

  useEffect(() => {
    if (segment === 'hidden') {
      setCurrentDisplayAssignments(hiddenAssignments);
    }
  }, [hiddenAssignments, segment]);

  const isDarkMode = useDarkMode();

  return (
    <PaperProvider theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <SafeAreaView
        testID="AssignmentsScreen"
        style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
        {Platform.OS === 'android' && (
          <Searchbar
            style={{
              elevation: 4,
              backgroundColor: isDarkMode ? 'black' : 'white',
            }}
            clearButtonMode="always"
            placeholder={getTranslation('searchAssignments')}
            onChangeText={setSearchBarText}
            value={searchBarText || ''}
          />
        )}
        <FlatList
          style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
          ListEmptyComponent={EmptyList}
          data={searchResults}
          renderItem={renderListItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            Platform.OS === 'ios' ? (
              <SegmentedControlIOS
                style={{margin: 20, marginTop: 10, marginBottom: 10}}
                values={[
                  getTranslation('new'),
                  getTranslation('favorite'),
                  getTranslation('hidden'),
                ]}
                selectedIndex={0}
                onValueChange={handleSegmentChange}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              colors={[isDarkMode ? Colors.purpleDark : Colors.purpleLight]}
              onRefresh={onRefresh}
              refreshing={isFetching}
            />
          }
        />
      </SafeAreaView>
    </PaperProvider>
  );
};

const fuseOptions = getFuseOptions<IAssignment>([
  'attachmentName',
  'description',
  'title',
  'courseName',
]);

AssignmentsScreen.options = getScreenOptions(
  getTranslation('assignments'),
  getTranslation('searchAssignments'),
);

function mapStateToProps(
  state: IPersistAppState,
): IAssignmentsScreenStateProps {
  return {
    loggedIn: state.auth.loggedIn,
    courses: state.courses.items || [],
    isFetching: state.assignments.isFetching,
    assignments: state.assignments.items || [],
    favAssignmentIds: state.assignments.favorites || [],
    pinnedAssignmentIds: state.assignments.pinned || [],
    hiddenCourseIds: state.courses.hidden || [],
    compactWidth: state.settings.compactWidth,
  };
}

const mapDispatchToProps: IAssignmentsScreenDispatchProps = {
  getAllAssignmentsForCourses,
  pinAssignment,
  unpinAssignment,
  favAssignment,
  unfavAssignment,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AssignmentsScreen);
