import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import {useDispatch} from 'react-redux';
import * as Calendar from 'expo-calendar';
import {iOSUIKit} from 'react-native-typography';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import {getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';
import SettingListItem from '../components/SettingListItem';
import {setSetting} from '../redux/actions/settings';
import Snackbar from 'react-native-snackbar';
import {
  saveAssignmentsToCalendar,
  saveCoursesToCalendar,
  removeCalendars,
} from '../helpers/calendar';
import dayjs from '../helpers/dayjs';
import {dataSource} from '../redux/dataSource';

const styles = StyleSheet.create({
  note: {
    margin: 6,
    marginHorizontal: 24,
  },
});

const CalendarScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();

  const settings = useTypedSelector((state) => state.settings);
  const hiddenCourseIds = useTypedSelector((state) => state.courses.hidden);
  const assignments = useTypedSelector(
    (state) => state.assignments.items,
  ).filter((i) => !hiddenCourseIds.includes(i.courseId));

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const [assignmentSyncing, setAssignmentSyncing] = useState(false);
  const [courseSyncing, setCourseSyncing] = useState(false);

  const onAssignmentCalendarSyncSwitchChange = async (enabled: boolean) => {
    if (enabled) {
      if (Platform.OS === 'ios') {
        const {status} = await Calendar.requestRemindersPermissionsAsync();
        if (status !== 'granted') {
          Snackbar.show({
            text: getTranslation('accessReminderFailure'),
            duration: Snackbar.LENGTH_LONG,
          });
          return;
        }
      } else {
        const {status} = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') {
          Snackbar.show({
            text: getTranslation('accessCalendarFailure'),
            duration: Snackbar.LENGTH_LONG,
          });
          return;
        }
      }

      if (assignments) {
        setAssignmentSyncing(true);
        await saveAssignmentsToCalendar(assignments);
        setAssignmentSyncing(false);
      }
    }
    dispatch(setSetting('calendarSync', enabled));
  };

  const handleCourseSync = async () => {
    const {status} = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Snackbar.show({
        text: getTranslation('accessCalendarFailure'),
        duration: Snackbar.LENGTH_LONG,
      });
      return;
    }

    setCourseSyncing(true);

    const today = dayjs();
    const monthFromToday = today.add(1, 'month');

    try {
      const events = await dataSource.getCalendar(
        today.format('YYYYMMDD'),
        monthFromToday.format('YYYYMMDD'),
        settings.graduate,
      );
      await saveCoursesToCalendar(events, today, monthFromToday);
      setCourseSyncing(false);
      Snackbar.show({
        text: getTranslation('courseSyncSuccess'),
        duration: Snackbar.LENGTH_LONG,
      });
    } catch {
      setCourseSyncing(false);
      Snackbar.show({
        text: getTranslation('courseSyncFailure'),
        duration: Snackbar.LENGTH_LONG,
      });
    }
  };

  const onDeleteCalendarsPress = () => {
    Alert.alert(
      getTranslation('deleteCalendars'),
      getTranslation('deleteCalendarsConfirmation'),
      [
        {
          text: getTranslation('cancel'),
          style: 'cancel',
        },
        {
          text: getTranslation('ok'),
          onPress: async () => {
            await removeCalendars();
          },
        },
      ],
      {cancelable: true},
    );
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <ScrollView>
        <SettingListItem
          containerStyle={{marginTop: 8}}
          variant="none"
          icon={
            <MaterialCommunityIcons
              name="calendar-month"
              size={20}
              color={
                colorScheme === 'dark'
                  ? Colors.system('gray', 'dark')
                  : undefined
              }
            />
          }
          text={getTranslation('courseSync')}
          onPress={handleCourseSync}
          loading={courseSyncing}
        />
        <SettingListItem
          variant="switch"
          icon={
            <MaterialCommunityIcons
              name="alarm"
              size={20}
              color={
                colorScheme === 'dark'
                  ? Colors.system('gray', 'dark')
                  : undefined
              }
            />
          }
          text={getTranslation('courseAlarm')}
          onSwitchValueChange={(enabled) =>
            dispatch(
              setSetting('alarms', {...settings.alarms, courseAlarm: enabled}),
            )
          }
          switchValue={settings.alarms.courseAlarm}
        />
        {settings.alarms.courseAlarm && (
          <SettingListItem
            variant="input"
            text={getTranslation('courseAlarmOffset')}
            keyboardType="number-pad"
            inputValue={(settings.alarms.courseAlarmOffset ?? 15).toString()}
            onInputValueChange={(text) =>
              dispatch(
                setSetting('alarms', {
                  ...settings.alarms,
                  courseAlarmOffset: parseInt(text, 10) || 15,
                }),
              )
            }
          />
        )}
        <Text
          style={[
            colorScheme === 'dark' ? iOSUIKit.footnoteWhite : iOSUIKit.footnote,
            styles.note,
            {color: Colors.system('gray', colorScheme)},
          ]}>
          {getTranslation('courseSyncNotes')}
        </Text>
        <SettingListItem
          containerStyle={{marginTop: 16}}
          variant="switch"
          icon={
            <MaterialCommunityIcons
              name="calendar-check"
              size={20}
              color={
                colorScheme === 'dark'
                  ? Colors.system('gray', 'dark')
                  : undefined
              }
            />
          }
          text={getTranslation('assignmentSync')}
          switchValue={settings.calendarSync}
          onSwitchValueChange={onAssignmentCalendarSyncSwitchChange}
          loading={assignmentSyncing}
        />
        <SettingListItem
          variant="switch"
          icon={
            <MaterialCommunityIcons
              name="alarm-check"
              size={20}
              color={
                colorScheme === 'dark'
                  ? Colors.system('gray', 'dark')
                  : undefined
              }
            />
          }
          text={getTranslation('assignmentAlarm')}
          onSwitchValueChange={(enabled) =>
            dispatch(
              setSetting('alarms', {
                ...settings.alarms,
                assignmentAlarm: enabled,
              }),
            )
          }
          switchValue={settings.alarms.assignmentAlarm}
        />
        {settings.alarms.assignmentAlarm && (
          <SettingListItem
            variant="input"
            text={getTranslation('assignmentAlarmOffset')}
            keyboardType="number-pad"
            inputValue={(
              settings.alarms.assignmentAlarmOffset ?? 24 * 60
            ).toString()}
            onInputValueChange={(text) =>
              dispatch(
                setSetting('alarms', {
                  ...settings.alarms,
                  assignmentAlarmOffset: parseInt(text, 10) || 24 * 60,
                }),
              )
            }
          />
        )}
        <Text
          style={[
            colorScheme === 'dark' ? iOSUIKit.footnoteWhite : iOSUIKit.footnote,
            styles.note,
            {color: Colors.system('gray', colorScheme)},
          ]}>
          {getTranslation('assignmentSyncNotes')}
        </Text>
        <SettingListItem
          containerStyle={{marginTop: 16}}
          variant="none"
          icon={
            <MaterialCommunityIcons
              name="calendar-remove"
              size={20}
              color={
                colorScheme === 'dark'
                  ? Colors.system('gray', 'dark')
                  : undefined
              }
            />
          }
          text={getTranslation('deleteCalendars')}
          onPress={onDeleteCalendarsPress}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

CalendarScreen.options = getScreenOptions(getTranslation('calendarReminders'));

export default CalendarScreen;
