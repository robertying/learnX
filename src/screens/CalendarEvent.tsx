import React, {useState} from 'react';
import {Alert, Platform, ScrollView, StyleSheet} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {Caption} from 'react-native-paper';
import {useDispatch} from 'react-redux';
import dayjs from 'dayjs';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import {useTypedSelector} from 'data/store';
import {setSetting} from 'data/actions/settings';
import {dataSource} from 'data/source';
import {
  removeCalendars,
  saveAssignmentsToReminderOrCalendar,
  saveCoursesToCalendar,
} from 'helpers/event';
import useToast from 'hooks/useToast';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {ScreenParams} from './types';

const CalendarEvent: React.FC<
  StackScreenProps<ScreenParams, 'CalendarEvent'>
> = (props) => {
  const toast = useToast();

  const dispatch = useDispatch();
  const assignmentSync = useTypedSelector(
    (state) => state.settings.assignmentSync,
  );
  const syncAssignmentsToCalendar = useTypedSelector(
    (state) => state.settings.syncAssignmentsToCalendar,
  );
  const alarms = useTypedSelector((state) => state.settings.alarms);
  const graduate = useTypedSelector((state) => state.settings.graduate);
  const hiddenCourseIds = useTypedSelector((state) => state.courses.hidden);
  const assignments = useTypedSelector(
    (state) => state.assignments.items,
  ).filter((i) => !hiddenCourseIds.includes(i.courseId));

  const [courseSyncing, setCourseSyncing] = useState(false);
  const [assignmentSyncing, setAssignmentSyncing] = useState(false);

  const handleCourseSync = async () => {
    setCourseSyncing(true);

    const today = dayjs();
    const monthFromToday = today.add(1, 'month');

    try {
      const events = await dataSource.getCalendar(
        today.format('YYYYMMDD'),
        monthFromToday.format('YYYYMMDD'),
        graduate,
      );
      await saveCoursesToCalendar(events, today, monthFromToday);
      toast('课表同步成功', 'success');
    } catch (err) {
      if ((err as Error).message === 'Missing calendar permission') {
        toast('课表同步失败：请给予 App 日历访问权限', 'error');
      } else if ((err as Error).message === 'Missing reminder permission') {
        toast('课表同步失败：请给予 App 提醒事项访问权限', 'error');
      } else {
        toast(
          '课表同步失败：由于网络学堂日历 API 不稳定，请多次尝试，或明天再试；若三天内一直同步失败，请提交问题反馈',
          'error',
        );
      }
    } finally {
      setCourseSyncing(false);
    }
  };

  const handleAssignmentSync = async (enabled: boolean) => {
    if (enabled) {
      if (assignments) {
        setAssignmentSyncing(true);

        try {
          await saveAssignmentsToReminderOrCalendar(assignments);
        } catch (err) {
          if ((err as Error).message === 'Missing calendar permission') {
            toast('作业同步失败：请给予 App 日历访问权限', 'error');
          } else if ((err as Error).message === 'Missing reminder permission') {
            toast('作业同步失败：请给予 App 提醒事项访问权限', 'error');
          } else {
            toast('作业同步失败：' + (err as Error).message, 'error');
          }
        } finally {
          setAssignmentSyncing(false);
        }
      }
    }
    dispatch(setSetting('assignmentSync', enabled));
  };

  const handleCalendarDelete = () => {
    Alert.alert(
      '删除已同步的日历与提醒事项',
      '确定删除已同步的日历与提醒事项？该操作不可撤销。',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          onPress: async () => {
            try {
              await removeCalendars();
              toast('删除成功', 'success');
            } catch (err) {
              if ((err as Error).message === 'Missing calendar permission') {
                toast('删除失败：请给予 App 日历访问权限', 'error');
              } else if (
                (err as Error).message === 'Missing reminder permission'
              ) {
                toast('删除失败：请给予 App 提醒事项访问权限', 'error');
              } else {
                toast('删除失败：' + (err as Error).message, 'error');
              }
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  useNavigationAnimation(props);

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <TableCell
          iconName="people"
          primaryText="研究生"
          switchValue={graduate}
          onSwitchValueChange={(value) =>
            dispatch(setSetting('graduate', value))
          }
          type="switch"
        />
        <TableCell
          iconName="event"
          primaryText="同步课表"
          type="none"
          onPress={handleCourseSync}
          loading={courseSyncing}
        />
        <TableCell
          iconName="access-alarm"
          primaryText="上课提醒"
          switchValue={alarms.courseAlarm}
          onSwitchValueChange={(value) =>
            dispatch(setSetting('alarms', {...alarms, courseAlarm: value}))
          }
          type="switch"
        />
        {alarms.courseAlarm && (
          <TableCell
            primaryText="上课多久前提醒（分钟）"
            inputValue={(alarms.courseAlarmOffset ?? 15).toString()}
            onInputValueChange={(v) =>
              parseInt(v, 10) &&
              dispatch(
                setSetting('alarms', {
                  ...alarms,
                  courseAlarmOffset: parseInt(v, 10) || 15,
                }),
              )
            }
            type="input"
          />
        )}
        <Caption style={styles.caption}>
          手动同步 30 天内的{graduate ? '研究生' : '本科生'}
          课表到日历；请在更改提醒设置后重新同步以应用更改。
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="event-note"
          primaryText="作业自动同步"
          switchValue={assignmentSync}
          onSwitchValueChange={handleAssignmentSync}
          type="switch"
          loading={assignmentSyncing}
        />
        <TableCell
          iconName="access-alarm"
          primaryText="作业提醒"
          switchValue={alarms.assignmentAlarm}
          onSwitchValueChange={(value) =>
            dispatch(setSetting('alarms', {...alarms, assignmentAlarm: value}))
          }
          type="switch"
          switchDisabled={!assignmentSync}
        />
        {alarms.assignmentAlarm && (
          <TableCell
            primaryText="截止时间多久前提醒（分钟）"
            inputValue={(alarms.assignmentAlarmOffset ?? 24 * 60).toString()}
            onInputValueChange={(v) =>
              parseInt(v, 10) &&
              dispatch(
                setSetting('alarms', {
                  ...alarms,
                  assignmentAlarmOffset: parseInt(v, 10) || 24 * 60,
                }),
              )
            }
            type="input"
          />
        )}
        {Platform.OS === 'ios' ? (
          <TableCell
            iconName="event-available"
            primaryText="同步作业到日历"
            switchValue={syncAssignmentsToCalendar}
            onSwitchValueChange={(value) =>
              dispatch(setSetting('syncAssignmentsToCalendar', value))
            }
            type="switch"
          />
        ) : null}
        <Caption style={styles.caption}>
          {Platform.OS === 'ios' && !syncAssignmentsToCalendar
            ? '每次刷新后，作业会自动同步到“提醒事项”；'
            : '每次刷新后，作业会自动同步到“日历”；'}
          已屏蔽课程的作业或已过期的作业不会被同步；请在更改提醒或同步设置后刷新作业以应用更改。
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="event-busy"
          primaryText="删除已同步的日历与提醒事项"
          type="none"
          onPress={handleCalendarDelete}
        />
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 32,
  },
  scrollViewPaddings: {
    paddingVertical: 32,
  },
  caption: {
    marginTop: 8,
    marginHorizontal: 16,
  },
});

export default CalendarEvent;
