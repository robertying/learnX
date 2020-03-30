import React, {useEffect, useMemo, useCallback, useState} from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  PushNotification,
  View,
  Text,
} from 'react-native';
import {
  Provider as PaperProvider,
  Searchbar,
  DefaultTheme,
  DarkTheme,
} from 'react-native-paper';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import {messaging} from '../helpers/notification';
import {useDispatch} from 'react-redux';
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
  readAssignment,
  unreadAssignment,
  getAssignmentsForCourseAction,
} from '../redux/actions/assignments';
import {IAssignment} from '../redux/types/state';
import {INavigationScreen, WithCourseInfo} from '../types';
import {IAssignmentDetailScreenProps} from './AssignmentDetailScreen';
import {setDetailView, pushTo, getScreenOptions} from '../helpers/navigation';
import {getFuseOptions} from '../helpers/search';
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from 'react-native-modal';
import Button from '../components/Button';
import {removeTags} from '../helpers/html';
import Snackbar from 'react-native-snackbar';
import {
  requestNotificationPermission,
  showNotificationPermissionAlert,
  scheduleNotification,
} from '../helpers/notification';
import {adaptToSystemTheme} from '../helpers/darkmode';
import SegmentedControl from '../components/SegmentedControl';
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';
import {saveAssignmentsToCalendar} from '../helpers/calendar';
import {Navigation} from 'react-native-navigation';
import {useWindow} from '../hooks/useWindow';

const AssignmentScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme, true);
  }, [colorScheme, props.componentId]);

  /**
   * Prepare data
   */

  const courses = useTypedSelector((state) => state.courses.items);
  const assignments = useTypedSelector((state) => state.assignments.items);
  const hiddenCourseIds = useTypedSelector((state) => state.courses.hidden);
  const favAssignmentIds = useTypedSelector(
    (state) => state.assignments.favorites,
  );
  const pinnedAssignmentIds = useTypedSelector(
    (state) => state.assignments.pinned,
  );
  const unreadAssignmentIds = useTypedSelector(
    (state) => state.assignments.unread,
  );

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
          .filter((item) => dayjs(item.deadline).unix() > dayjs().unix())
          .sort((a, b) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix()),
        ...assignments
          .filter((item) => dayjs(item.deadline).unix() < dayjs().unix())
          .sort((a, b) => dayjs(b.deadline).unix() - dayjs(a.deadline).unix()),
      ].map((assignment) => ({
        ...assignment,
        ...courseNames[assignment.courseId],
      })),
    [assignments, courseNames],
  );

  const finishedAssignments = useMemo(() => {
    const finishedAssignmentsOnly = sortedAssignments.filter(
      (i) =>
        i.submitted &&
        !favAssignmentIds.includes(i.id) &&
        !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...finishedAssignmentsOnly.filter((i) =>
        pinnedAssignmentIds.includes(i.id),
      ),
      ...finishedAssignmentsOnly.filter(
        (i) => !pinnedAssignmentIds.includes(i.id),
      ),
    ];
  }, [
    favAssignmentIds,
    hiddenCourseIds,
    pinnedAssignmentIds,
    sortedAssignments,
  ]);

  const unfinishedAssignments = useMemo(() => {
    const unfinishedAssignmentsOnly = sortedAssignments.filter(
      (i) =>
        !i.submitted &&
        !favAssignmentIds.includes(i.id) &&
        !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...unfinishedAssignmentsOnly.filter((i) =>
        pinnedAssignmentIds.includes(i.id),
      ),
      ...unfinishedAssignmentsOnly.filter(
        (i) => !pinnedAssignmentIds.includes(i.id),
      ),
    ];
  }, [
    favAssignmentIds,
    hiddenCourseIds,
    pinnedAssignmentIds,
    sortedAssignments,
  ]);

  const favAssignments = useMemo(() => {
    const favAssignmentsOnly = sortedAssignments.filter(
      (i) =>
        favAssignmentIds.includes(i.id) &&
        !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...favAssignmentsOnly.filter((i) => pinnedAssignmentIds.includes(i.id)),
      ...favAssignmentsOnly.filter((i) => !pinnedAssignmentIds.includes(i.id)),
    ];
  }, [
    favAssignmentIds,
    hiddenCourseIds,
    pinnedAssignmentIds,
    sortedAssignments,
  ]);

  const hiddenAssignments = useMemo(() => {
    const hiddenAssignmentsOnly = sortedAssignments.filter((i) =>
      hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...hiddenAssignmentsOnly.filter((i) =>
        pinnedAssignmentIds.includes(i.id),
      ),
      ...hiddenAssignmentsOnly.filter(
        (i) => !pinnedAssignmentIds.includes(i.id),
      ),
    ];
  }, [hiddenCourseIds, pinnedAssignmentIds, sortedAssignments]);

  const [currentDisplayAssignments, setCurrentDisplayAssignments] = useState(
    unfinishedAssignments,
  );

  /**
   * Fetch and handle error
   */

  const loggedIn = useTypedSelector((state) => state.auth.loggedIn);
  const assignmentError = useTypedSelector((state) => state.assignments.error);
  const isFetching = useTypedSelector((state) => state.assignments.isFetching);
  const calendarSync = useTypedSelector((state) => state.settings.calendarSync);

  const invalidateAll = useCallback(() => {
    if (loggedIn && courses.length !== 0) {
      dispatch(getAllAssignmentsForCourses(courses.map((i) => i.id)));
    }
  }, [courses, loggedIn, dispatch]);

  useEffect(() => {
    if (assignments.length === 0) {
      invalidateAll();
    }
  }, [invalidateAll, assignments.length]);

  useEffect(() => {
    if (calendarSync && assignments) {
      saveAssignmentsToCalendar(assignments);
    }
  }, [assignments, calendarSync]);

  useEffect(() => {
    if (assignmentError) {
      Snackbar.show({
        text: getTranslation('refreshFailure'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }
  }, [assignmentError]);

  /**
   * Render cards
   */

  const isCompact = useTypedSelector((state) => state.settings.isCompact);

  const onAssignmentCardPress = useCallback(
    (assignment: WithCourseInfo<IAssignment>) => {
      const name = 'assignments.detail';
      const passProps: IAssignmentDetailScreenProps = assignment;
      const title = assignment.courseName;

      if (DeviceInfo.isIPad() && !isCompact) {
        setDetailView<IAssignmentDetailScreenProps>(name, passProps, title);
      } else {
        pushTo<IAssignmentDetailScreenProps>(
          name,
          props.componentId,
          passProps,
          title,
          false,
          colorScheme === 'dark',
        );
      }

      dispatch(readAssignment(assignment.id));
    },
    [isCompact, colorScheme, props.componentId, dispatch],
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

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const listener = (notification: PushNotification) => {
        const data = notification.getData() as any;
        if (data.assignment) {
          const assignment = JSON.parse(data.assignment) as WithCourseInfo<
            IAssignment
          >;
          if (!assignments.find((n) => n.id === assignment.id)) {
            dispatch(
              getAssignmentsForCourseAction.success({
                assignments: [assignment, ...assignments],
                courseId: assignment.courseId,
              }),
            );
          }
          Navigation.mergeOptions(props.componentId, {
            bottomTabs: {
              currentTabIndex: 2,
            },
          });
          onAssignmentCardPress(assignment);
        }
      };
      PushNotificationIOS.addEventListener('notification', listener);
      return () =>
        PushNotificationIOS.removeEventListener('notification', listener);
    }
  }, [assignments, dispatch, onAssignmentCardPress, props.componentId]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const unsubscribe = messaging().onMessage(async (remoteMessage) => {
        const data = remoteMessage.data;
        if (data?.assignment) {
          const assignment = JSON.parse(data.assignment) as WithCourseInfo<
            IAssignment
          >;
          if (!assignments.find((n) => n.id === assignment.id)) {
            dispatch(
              getAssignmentsForCourseAction.success({
                assignments: [assignment, ...assignments],
                courseId: assignment.courseId,
              }),
            );
          }

          scheduleNotification(
            `${assignment.courseName}`,
            `${assignment.title}\n${removeTags(
              assignment.description ||
                getTranslation('noAssignmentDescription'),
            )}`,
            new Date(),
            assignment,
          );
        }
      });

      return () => unsubscribe();
    }
  }, [dispatch, assignments]);

  const onPinned = (pin: boolean, assignmentId: string) => {
    if (pin) {
      dispatch(pinAssignment(assignmentId));
    } else {
      dispatch(unpinAssignment(assignmentId));
    }
  };

  const onFav = (fav: boolean, assignmentId: string) => {
    if (fav) {
      dispatch(favAssignment(assignmentId));
    } else {
      dispatch(unfavAssignment(assignmentId));
    }
  };

  const onRead = (read: boolean, assignmentId: string) => {
    if (read) {
      dispatch(readAssignment(assignmentId));
    } else {
      dispatch(unreadAssignment(assignmentId));
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
      onPinned={(pin) => onPinned(pin, item.id)}
      fav={favAssignmentIds.includes(item.id)}
      onFav={(fav) => onFav(fav, item.id)}
      unread={unreadAssignmentIds.includes(item.id)}
      onRead={(read) => onRead(read, item.id)}
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

  useEffect(() => {
    const handler = Navigation.events().registerNavigationButtonPressedListener(
      (e) => {
        if (e.buttonId === 'refresh') {
          invalidateAll();
        }
      },
    );
    return () => handler.remove();
  }, [invalidateAll]);

  /**
   * Search
   */

  const [searchResults, searchBarText, setSearchBarText] = useSearchBar<
    WithCourseInfo<IAssignment>
  >(currentDisplayAssignments, fuseOptions);

  const [segment, setSegment] = useState('unfinished');

  const handleSegmentChange = (value: string) => {
    if (value.startsWith(getTranslation('unfinished'))) {
      setSegment('unfinished');
    } else if (value.startsWith(getTranslation('finished'))) {
      setSegment('finished');
    } else if (value.startsWith(getTranslation('favorite'))) {
      setSegment('favorite');
    } else {
      setSegment('hidden');
    }
  };

  useEffect(() => {
    if (segment === 'unfinished') {
      setCurrentDisplayAssignments(unfinishedAssignments);
    }
  }, [unfinishedAssignments, segment]);

  useEffect(() => {
    if (segment === 'finished') {
      setCurrentDisplayAssignments(finishedAssignments);
    }
  }, [finishedAssignments, segment]);

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
  const [dateAndroid, setDateAndroid] = useState<Date | null>(null);
  const [timeAndroid, setTimeAndroid] = useState<Date | null>(null);

  const handleRemind = async (assignment: WithCourseInfo<IAssignment>) => {
    if (!(await requestNotificationPermission())) {
      showNotificationPermissionAlert();
      return;
    }
    setDateAndroid(null);
    setTimeAndroid(null);
    setPickerVisible(true);
    setReminderInfo(assignment);
  };

  const handleReminderSet = useCallback(() => {
    if (!reminderInfo) {
      return;
    }

    let date = reminderDate;
    if (Platform.OS === 'android') {
      dateAndroid!.setHours(
        timeAndroid!.getHours(),
        timeAndroid!.getMinutes(),
        0,
        0,
      );
      date = dateAndroid!;
    }

    scheduleNotification(
      `${getTranslation('reminder')}：${reminderInfo.courseName}`,
      `${reminderInfo.title}\n${removeTags(
        reminderInfo.description || getTranslation('noAssignmentDescription'),
      )}`,
      date,
      reminderInfo,
    );
    setPickerVisible(false);
    setReminderInfo(undefined);
    Snackbar.show({
      text: getTranslation('reminderSet'),
      duration: Snackbar.LENGTH_SHORT,
    });
  }, [dateAndroid, reminderDate, reminderInfo, timeAndroid]);

  const handleDateChange = (_: any, date?: Date) => {
    if (date) {
      if (Platform.OS === 'ios') {
        setReminderDate(date);
      } else {
        if (!dateAndroid) {
          setDateAndroid(date);
        } else {
          setTimeAndroid(date);
          setPickerVisible(false);
        }
      }
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android' && dateAndroid && timeAndroid) {
      handleReminderSet();
      setDateAndroid(null);
      setTimeAndroid(null);
    }
  }, [dateAndroid, handleReminderSet, timeAndroid]);

  const window = useWindow();

  return (
    <PaperProvider theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView
        testID="AssignmentsScreen"
        style={{
          flex: 1,
          backgroundColor: Colors.system('background', colorScheme),
        }}>
        {Platform.OS === 'android' && (
          <Searchbar
            style={{
              elevation: 2,
              borderRadius: 0,
              backgroundColor: Colors.system('background', colorScheme),
            }}
            clearButtonMode="always"
            placeholder={getTranslation('searchAssignments')}
            onChangeText={setSearchBarText}
            value={searchBarText || ''}
          />
        )}
        <FlatList
          style={{backgroundColor: Colors.system('background', colorScheme)}}
          ListEmptyComponent={EmptyList}
          data={searchResults}
          renderItem={renderListItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <SegmentedControl
              values={[
                getTranslation('unfinished') +
                  ` (${unfinishedAssignments.length})`,
                getTranslation('finished') + ` (${finishedAssignments.length})`,
                getTranslation('favorite') + ` (${favAssignments.length})`,
                getTranslation('hidden') + ` (${hiddenAssignments.length})`,
              ]}
              selectedIndex={
                segment === 'unfinished'
                  ? 0
                  : segment === 'finished'
                  ? 1
                  : segment === 'favorite'
                  ? 2
                  : 3
              }
              onValueChange={handleSegmentChange}
            />
          }
          refreshControl={
            <RefreshControl
              colors={[Colors.system('purple', colorScheme)]}
              progressBackgroundColor={
                colorScheme === 'dark' ? '#424242' : 'white'
              }
              onRefresh={onRefresh}
              refreshing={isFetching}
            />
          }
        />
        {Platform.OS === 'android' ? (
          pickerVisible &&
          (!dateAndroid || !timeAndroid) && (
            <DateTimePicker
              mode={dateAndroid ? 'time' : 'date'}
              minimumDate={new Date()}
              value={reminderDate}
              onChange={handleDateChange}
            />
          )
        ) : (
          <Modal
            isVisible={pickerVisible}
            onBackdropPress={() => setPickerVisible(false)}
            backdropColor={
              colorScheme === 'dark' ? 'rgba(255,255,255,0.25)' : undefined
            }
            animationIn="bounceIn"
            animationOut="zoomOut"
            deviceHeight={window.height}
            deviceWidth={window.width}
            useNativeDriver={true}
            hideModalContentWhileAnimating={true}>
            <DateTimePicker
              style={{
                backgroundColor: Colors.system('background', colorScheme),
              }}
              mode="datetime"
              minimumDate={new Date()}
              value={reminderDate}
              onChange={handleDateChange}
            />
            {Platform.OS === 'ios' && (
              <View
                style={{
                  backgroundColor: Colors.system('background', colorScheme),
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
                      color: Colors.system('purple', colorScheme),
                    }}>
                    {getTranslation('cancel')}
                  </Text>
                </Button>
                <Button
                  style={{marginHorizontal: 20}}
                  onPress={handleReminderSet}>
                  <Text
                    style={{
                      fontSize: 18,
                      color: Colors.system('purple', colorScheme),
                    }}>
                    {getTranslation('ok')}
                  </Text>
                </Button>
              </View>
            )}
          </Modal>
        )}
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

AssignmentScreen.options = getScreenOptions(
  getTranslation('assignments'),
  getTranslation('searchAssignments'),
  true,
);

export default AssignmentScreen;
