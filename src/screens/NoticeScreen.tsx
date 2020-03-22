import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {
  Platform,
  RefreshControl,
  SafeAreaView,
  FlatList,
  AppState,
  AppStateStatus,
  View,
  PushNotification as Notification,
  Dimensions,
  Text,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {
  Provider as PaperProvider,
  Searchbar,
  DefaultTheme,
  DarkTheme,
} from 'react-native-paper';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import {useDispatch} from 'react-redux';
import EmptyList from '../components/EmptyList';
import NoticeCard from '../components/NoticeCard';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import useSearchBar from '../hooks/useSearchBar';
import {login} from '../redux/actions/auth';
import {
  getAllNoticesForCourses,
  pinNotice,
  unpinNotice,
  favNotice,
  unfavNotice,
  readNotice,
  unreadNotice,
  getNoticesForCourseAction,
} from '../redux/actions/notices';
import {INotice} from '../redux/types/state';
import {INavigationScreen, WithCourseInfo} from '../types';
import {resetLoading} from '../redux/actions/root';
import {getFuseOptions} from '../helpers/search';
import {setDetailView, pushTo, getScreenOptions} from '../helpers/navigation';
import {INoticeDetailScreenProps} from './NoticeDetailScreen';
import {
  requestNotificationPermission,
  showNotificationPermissionAlert,
  scheduleNotification,
} from '../helpers/notification';
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from 'react-native-modal';
import Button from '../components/Button';
import {removeTags} from '../helpers/html';
import Snackbar from 'react-native-snackbar';
import {adaptToSystemTheme} from '../helpers/darkmode';
import SegmentedControl from '../components/SegmentedControl';
import PushNotification from 'react-native-push-notification';
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';
import {setSetting} from '../redux/actions/settings';

const NoticeScreen: INavigationScreen = props => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();
  const settings = useTypedSelector(state => state.settings);
  const loginError = useTypedSelector(state => state.auth.error);

  /**
   * App scope stuff
   */

  const pushNotificationListener = useCallback(
    (token: string) => {
      dispatch(
        setSetting('pushNotifications', {
          ...settings.pushNotifications,
          deviceToken: token,
        }),
      );
    },
    [dispatch, settings.pushNotifications],
  );

  const pushNotificationErrorListener = useCallback(() => {
    Snackbar.show({
      text: getTranslation('deviceTokenFailure'),
      duration: Snackbar.LENGTH_SHORT,
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      PushNotification.configure({
        requestPermissions: false,
      });
    } else {
      PushNotificationIOS.addEventListener(
        'register',
        pushNotificationListener,
      );
      PushNotificationIOS.addEventListener(
        'registrationError',
        pushNotificationErrorListener,
      );

      return () => {
        PushNotificationIOS.removeEventListener(
          'register',
          pushNotificationListener,
        );
        PushNotificationIOS.removeEventListener(
          'registrationError',
          pushNotificationErrorListener,
        );
      };
    }
  }, [pushNotificationErrorListener, pushNotificationListener]);

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme, true);
  }, [colorScheme, props.componentId]);

  useEffect(() => {
    (async () => {
      if (
        settings.hasUpdate &&
        (Platform.OS === 'android' || DeviceInfo.isMac())
      ) {
        Navigation.mergeOptions('SettingsScreen', {
          bottomTab: {
            dotIndicator: {
              visible: true,
            },
          },
        });
      }
    })();
  }, [settings.hasUpdate]);

  useEffect(() => {
    dispatch(login());
  }, [dispatch]);

  useEffect(() => {
    if (loginError) {
      Snackbar.show({
        text: getTranslation('loginFailure'),
        duration: Snackbar.LENGTH_INDEFINITE,
        action: {
          text: getTranslation('ok'),
          textColor: Colors.system('purple', colorScheme),
          onPress: () => Snackbar.dismiss(),
        },
      });
    }
  }, [colorScheme, loginError]);

  useEffect(() => {
    if (DeviceInfo.isIPad()) {
      const window = Dimensions.get('window');
      const screen = Dimensions.get('screen');
      if (
        window.width < screen.width &&
        !(
          screen.height < screen.width &&
          (DeviceInfo.isIPad12_9()
            ? window.width > screen.width * 0.4
            : window.width > screen.width / 2)
        )
      ) {
        dispatch(setSetting('isCompact', true));
      } else {
        dispatch(setSetting('isCompact', false));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (DeviceInfo.isIPad()) {
      const listener = ({window, screen}: any) => {
        if (
          window.width < screen.width &&
          !(
            screen.height < screen.width &&
            (DeviceInfo.isIPad12_9()
              ? window.width > screen.width * 0.4
              : window.width > screen.width / 2)
          )
        ) {
          dispatch(setSetting('isCompact', true));
        } else {
          dispatch(setSetting('isCompact', false));
        }
      };
      Dimensions.addEventListener('change', listener);

      return () => Dimensions.removeEventListener('change', listener);
    }
  }, [dispatch]);

  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const listener = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        resetLoading();
      }
      if (nextAppState.match(/inactive|background/) && appState === 'active') {
        if (Platform.OS === 'ios') {
          PushNotificationIOS.setApplicationIconBadgeNumber(0);
        }
      }
      setAppState(nextAppState);
    };
    AppState.addEventListener('change', listener);
    return () => AppState.removeEventListener('change', listener);
  });

  /**
   * Prepare data
   */

  const courses = useTypedSelector(state => state.courses.items);
  const notices = useTypedSelector(state => state.notices.items);
  const hiddenCourseIds = useTypedSelector(state => state.courses.hidden);
  const favNoticeIds = useTypedSelector(state => state.notices.favorites);
  const pinnedNoticeIds = useTypedSelector(state => state.notices.pinned);
  const unreadNoticeIds = useTypedSelector(state => state.notices.unread);

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

  const sortedNotices = useMemo(
    () =>
      notices
        .sort(
          (a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix(),
        )
        .map(notice => ({
          ...notice,
          ...courseNames[notice.courseId],
        })),
    [notices, courseNames],
  );

  const newNotices = useMemo(() => {
    const newNoticesOnly = sortedNotices.filter(
      i =>
        !favNoticeIds.includes(i.id) && !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...newNoticesOnly.filter(i => pinnedNoticeIds.includes(i.id)),
      ...newNoticesOnly.filter(i => !pinnedNoticeIds.includes(i.id)),
    ];
  }, [favNoticeIds, hiddenCourseIds, pinnedNoticeIds, sortedNotices]);

  const unreadNotices = useMemo(() => {
    const unreadNoticesOnly = sortedNotices.filter(
      i =>
        unreadNoticeIds.includes(i.id) && !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...unreadNoticesOnly.filter(i => pinnedNoticeIds.includes(i.id)),
      ...unreadNoticesOnly.filter(i => !pinnedNoticeIds.includes(i.id)),
    ];
  }, [hiddenCourseIds, pinnedNoticeIds, sortedNotices, unreadNoticeIds]);

  const favNotices = useMemo(() => {
    const favNoticesOnly = sortedNotices.filter(
      i => favNoticeIds.includes(i.id) && !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...favNoticesOnly.filter(i => pinnedNoticeIds.includes(i.id)),
      ...favNoticesOnly.filter(i => !pinnedNoticeIds.includes(i.id)),
    ];
  }, [favNoticeIds, hiddenCourseIds, pinnedNoticeIds, sortedNotices]);

  const hiddenNotices = useMemo(() => {
    const hiddenNoticesOnly = sortedNotices.filter(i =>
      hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...hiddenNoticesOnly.filter(i => pinnedNoticeIds.includes(i.id)),
      ...hiddenNoticesOnly.filter(i => !pinnedNoticeIds.includes(i.id)),
    ];
  }, [hiddenCourseIds, pinnedNoticeIds, sortedNotices]);

  const [currentDisplayNotices, setCurrentDisplayNotices] = useState(
    newNotices,
  );

  /**
   * Fetch and handle error
   */

  const loggedIn = useTypedSelector(state => state.auth.loggedIn);
  const noticeError = useTypedSelector(state => state.notices.error);
  const isFetching = useTypedSelector(state => state.notices.isFetching);

  const invalidateAll = useCallback(() => {
    if (loggedIn && courses.length !== 0) {
      dispatch(getAllNoticesForCourses(courses.map(i => i.id)));
    }
  }, [courses, loggedIn, dispatch]);

  useEffect(() => {
    if (notices.length === 0) {
      invalidateAll();
    }
  }, [invalidateAll, notices.length]);

  useEffect(() => {
    if (noticeError) {
      Snackbar.show({
        text: getTranslation('refreshFailure'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }
  }, [noticeError]);

  /**
   * Render cards
   */

  const isCompact = useTypedSelector(state => state.settings.isCompact);

  const onNoticeCardPress = useCallback(
    (notice: WithCourseInfo<INotice>) => {
      const name = 'notices.detail';
      const passProps = {
        title: notice.title,
        author: notice.publisher,
        content: notice.content,
        publishTime: notice.publishTime,
        attachmentName: notice.attachmentName,
        attachmentUrl: notice.attachmentUrl,
        courseName: notice.courseName,
      };
      const title = notice.courseName;

      if (DeviceInfo.isIPad() && !isCompact) {
        setDetailView<INoticeDetailScreenProps>(name, passProps, title);
      } else {
        pushTo<INoticeDetailScreenProps>(
          name,
          props.componentId,
          passProps,
          title,
          false,
          colorScheme === 'dark',
        );
      }

      dispatch(readNotice(notice.id));
      fetch(notice.url);
    },
    [isCompact, colorScheme, props.componentId, dispatch],
  );

  useEffect(() => {
    if (Platform.OS === 'ios') {
      (async () => {
        const notification = await PushNotificationIOS.getInitialNotification();
        if (notification) {
          const data = notification.getData();
          if ((data as INotice).publisher) {
            onNoticeCardPress(data as WithCourseInfo<INotice>);
          }
        }
      })();
    }
  }, [onNoticeCardPress]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const listener = (notification: Notification) => {
        const data = notification.getData();
        if ((data as INotice).publisher) {
          onNoticeCardPress(data as WithCourseInfo<INotice>);
        }
      };
      PushNotificationIOS.addEventListener('localNotification', listener);
      return () =>
        PushNotificationIOS.removeEventListener('localNotification', listener);
    }
  }, [onNoticeCardPress]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const listener = (notification: Notification) => {
        const data = notification.getData() as any;
        if (data.notice) {
          const notice = JSON.parse(data.notice) as WithCourseInfo<INotice>;
          dispatch(
            getNoticesForCourseAction.success({
              notices: [notice, ...notices],
              courseId: notice.courseId,
            }),
          );
          Navigation.mergeOptions(props.componentId, {
            bottomTabs: {
              currentTabIndex: 0,
            },
          });
          onNoticeCardPress(notice);
        }
      };
      PushNotificationIOS.addEventListener('notification', listener);
      return () =>
        PushNotificationIOS.removeEventListener('notification', listener);
    }
  }, [dispatch, notices, onNoticeCardPress, props.componentId]);

  const onPinned = (pin: boolean, noticeId: string) => {
    if (pin) {
      dispatch(pinNotice(noticeId));
    } else {
      dispatch(unpinNotice(noticeId));
    }
  };

  const onFav = (fav: boolean, noticeId: string) => {
    if (fav) {
      dispatch(favNotice(noticeId));
    } else {
      dispatch(unfavNotice(noticeId));
    }
  };

  const onRead = (read: boolean, noticeId: string) => {
    if (read) {
      dispatch(readNotice(noticeId));
    } else {
      dispatch(unreadNotice(noticeId));
    }
  };

  const renderListItem = ({item}: {item: WithCourseInfo<INotice>}) => (
    <NoticeCard
      title={item.title}
      author={item.publisher}
      date={item.publishTime}
      content={item.content}
      markedImportant={item.markedImportant}
      hasAttachment={item.attachmentName ? true : false}
      courseName={item.courseName}
      courseTeacherName={item.courseTeacherName}
      dragEnabled={item.courseName && item.courseTeacherName ? true : false}
      pinned={pinnedNoticeIds.includes(item.id)}
      onPinned={pin => onPinned(pin, item.id)}
      fav={favNoticeIds.includes(item.id)}
      onFav={fav => onFav(fav, item.id)}
      unread={unreadNoticeIds.includes(item.id)}
      onRead={read => onRead(read, item.id)}
      onPress={() => {
        onNoticeCardPress(item);
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
      e => {
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
    WithCourseInfo<INotice>
  >(currentDisplayNotices, fuseOptions);

  const [segment, setSegment] = useState('new');

  const handleSegmentChange = (value: string) => {
    if (value.startsWith(getTranslation('new'))) {
      setSegment('new');
    } else if (value.startsWith(getTranslation('unread'))) {
      setSegment('unread');
    } else if (value.startsWith(getTranslation('favorite'))) {
      setSegment('favorite');
    } else {
      setSegment('hidden');
    }
  };

  useEffect(() => {
    if (segment === 'new') {
      setCurrentDisplayNotices(newNotices);
    }
  }, [newNotices, segment]);

  useEffect(() => {
    if (segment === 'unread') {
      setCurrentDisplayNotices(unreadNotices);
    }
  }, [unreadNotices, segment]);

  useEffect(() => {
    if (segment === 'favorite') {
      setCurrentDisplayNotices(favNotices);
    }
  }, [favNotices, segment]);

  useEffect(() => {
    if (segment === 'hidden') {
      setCurrentDisplayNotices(hiddenNotices);
    }
  }, [hiddenNotices, segment]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [reminderInfo, setReminderInfo] = useState<WithCourseInfo<INotice>>();
  const [dateAndroid, setDateAndroid] = useState<Date | null>(null);
  const [timeAndroid, setTimeAndroid] = useState<Date | null>(null);

  const handleRemind = async (notice: WithCourseInfo<INotice>) => {
    if (!(await requestNotificationPermission())) {
      showNotificationPermissionAlert();
      return;
    }
    setDateAndroid(null);
    setTimeAndroid(null);
    setPickerVisible(true);
    setReminderInfo(notice);
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
        reminderInfo.content || getTranslation('noNoticeContent'),
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

  return (
    <PaperProvider theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView
        testID="NoticesScreen"
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
            placeholder={getTranslation('searchNotices')}
            onChangeText={setSearchBarText}
            value={searchBarText || ''}
          />
        )}
        <FlatList
          testID="FlatList"
          style={{backgroundColor: Colors.system('background', colorScheme)}}
          ListEmptyComponent={EmptyList}
          data={searchResults}
          renderItem={renderListItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <SegmentedControl
              values={[
                getTranslation('new') + ` (${newNotices.length})`,
                getTranslation('unread') + ` (${unreadNotices.length})`,
                getTranslation('favorite') + ` (${favNotices.length})`,
                getTranslation('hidden') + ` (${hiddenNotices.length})`,
              ]}
              selectedIndex={
                segment === 'new'
                  ? 0
                  : segment === 'unread'
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

const fuseOptions = getFuseOptions<INotice>([
  'title',
  'content',
  'courseName',
  'attachmentName',
]);

NoticeScreen.options = getScreenOptions(
  getTranslation('notices'),
  getTranslation('searchNotices'),
  true,
);

export default NoticeScreen;
