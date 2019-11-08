import React, {useEffect, useMemo, useCallback, useState} from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  SegmentedControlIOS,
  PushNotificationIOS,
  PushNotification,
  View,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from 'react-native-modal';
import Layout from '../constants/Layout';
import Button from '../components/Button';
import {removeTags} from '../helpers/html';
import Text from '../components/Text';
import Snackbar from 'react-native-snackbar';
import {
  requestNotificationPermission,
  showNotificationPermissionAlert,
  scheduleNotification,
} from '../helpers/notification';
import {androidAdaptToSystemTheme} from '../helpers/darkmode';

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

  const isDarkMode = useDarkMode();

  useEffect(() => {
    androidAdaptToSystemTheme(props.componentId, isDarkMode);
  }, [isDarkMode, props.componentId]);

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

  const onAssignmentCardPress = useCallback(
    (assignment: WithCourseInfo<IAssignment>) => {
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
          false,
          isDarkMode,
        );
      }
    },
    [compactWidth, isDarkMode, props.componentId],
  );

  useEffect(() => {
    if (Platform.OS === 'ios') {
      (async () => {
        const notification = await PushNotificationIOS.getInitialNotification();
        if (notification) {
          const data = notification.getData();
          if ((data as IAssignment).deadline) {
            onAssignmentCardPress(data as WithCourseInfo<IAssignment>);
          }
        }
      })();
    }
  }, [onAssignmentCardPress]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const listener = (notification: PushNotification) => {
        const data = notification.getData();
        if ((data as IAssignment).deadline) {
          onAssignmentCardPress(data as WithCourseInfo<IAssignment>);
        }
      };
      PushNotificationIOS.addEventListener('localNotification', listener);
      return () =>
        PushNotificationIOS.removeEventListener('localNotification', listener);
    }
  }, [onAssignmentCardPress]);

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
      onRemind={() => handleRemind(item)}
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
    if (value.startsWith(getTranslation('new'))) {
      setSegment('new');
      setCurrentDisplayAssignments(newAssignments);
    } else if (value.startsWith(getTranslation('favorite'))) {
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

  const [pickerVisible, setPickerVisible] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [reminderInfo, setReminderInfo] = useState<
    WithCourseInfo<IAssignment>
  >();

  const handleRemind = async (notice: WithCourseInfo<IAssignment>) => {
    if (!(await requestNotificationPermission())) {
      showNotificationPermissionAlert();
      return;
    }
    setPickerVisible(true);
    setReminderInfo(notice);
  };

  const handleReminderSet = () => {
    if (!reminderInfo) {
      return;
    }

    scheduleNotification(
      `${getTranslation('reminder')}：${reminderInfo.courseName}`,
      `${reminderInfo.title}\n${removeTags(
        reminderInfo.description || getTranslation('noAssignmentDescription'),
      )}`,
      reminderDate.toISOString(),
      reminderInfo,
    );
    setPickerVisible(false);
    setReminderInfo(undefined);
    Snackbar.show({
      title: getTranslation('reminderSet'),
      duration: Snackbar.LENGTH_SHORT,
    });
  };

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
                  getTranslation('new') + ` (${newAssignments.length})`,
                  getTranslation('favorite') + ` (${favAssignments.length})`,
                  getTranslation('hidden') + ` (${hiddenAssignments.length})`,
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
        <Modal
          isVisible={pickerVisible}
          onBackdropPress={() => setPickerVisible(false)}
          backdropColor={isDarkMode ? 'rgba(255,255,255,0.25)' : undefined}
          animationIn="bounceIn"
          animationOut="zoomOut"
          useNativeDriver={true}
          deviceWidth={Layout.initialWindow.width}
          deviceHeight={Layout.initialWindow.height}>
          <DateTimePicker
            style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
            mode="datetime"
            minimumDate={new Date()}
            value={reminderDate}
            onChange={(_, date) => date && setReminderDate(date)}
          />
          <View
            style={{
              backgroundColor: isDarkMode ? 'black' : 'white',
              width: '100%',
              height: 50,
              paddingHorizontal: 15,
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}>
            <Button
              style={{marginHorizontal: 20}}
              onPress={() => setPickerVisible(false)}>
              <Text
                style={{
                  fontSize: 18,
                  color: isDarkMode ? Colors.purpleDark : Colors.purpleLight,
                }}>
                {getTranslation('cancel')}
              </Text>
            </Button>
            <Button style={{marginHorizontal: 20}} onPress={handleReminderSet}>
              <Text
                style={{
                  fontSize: 18,
                  color: isDarkMode ? Colors.purpleDark : Colors.purpleLight,
                }}>
                {getTranslation('ok')}
              </Text>
            </Button>
          </View>
        </Modal>
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
