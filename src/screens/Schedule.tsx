import dayjs from 'dayjs';
import { classDetails, itemRow } from 'components/ClassRow';
import { Form, FormSection, FormText } from 'components/Form';
import SafeArea from 'components/SafeArea';
import { useWeekSchedule } from 'data/schedule';
import { t } from 'helpers/i18n';
import { beijingDate } from 'helpers/serverTime';
import { useMinute } from 'hooks/useClock';
import usePullToRefresh from 'hooks/usePullToRefresh';
import { MainStackScreenProps, ScheduleParamList } from './types';

type Props = MainStackScreenProps<ScheduleParamList, 'Schedule'>;

const DAYS = 7;

/**
 * The classes of the next seven days, a section for each day that has any,
 * as Calendar's list does; today's is always there. Opens from Today, beside
 * it in a split view.
 */
const Schedule: React.FC<Props> = ({ navigation }) => {
  const now = useMinute();

  // Beijing days, as the timetable follows the school's days. Seven days from
  // today reach into next week.
  const today = dayjs(beijingDate(now));
  const thisWeek = useWeekSchedule(today);
  const nextWeek = useWeekSchedule(today.add(7, 'day'));
  const sessions = [...thisWeek.sessions, ...nextWeek.sessions];

  const days = Array.from({ length: DAYS }, (_, i) => {
    const day = today.add(i, 'day');
    const date = day.format('YYYY-MM-DD');
    return {
      date,
      title: [
        i === 0
          ? t('scheduleToday')
          : i === 1
            ? t('scheduleTomorrow')
            : undefined,
        day.format(t('todayDate')),
      ]
        .filter(Boolean)
        .join(' · '),
      classes: sessions.filter(s => beijingDate(s.start) === date),
    };
  }).filter((day, i) => i === 0 || day.classes.length > 0);

  const handleRefresh = async () => {
    const results = await Promise.all([thisWeek.refetch(), nextWeek.refetch()]);
    return { isError: results.some(r => r.isError) };
  };
  const pullToRefresh = usePullToRefresh(handleRefresh);

  const note =
    thisWeek.source === 'courses' || nextWeek.source === 'courses'
      ? t('todayFromCourses')
      : undefined;

  return (
    <SafeArea>
      <Form testID="schedule" onRefresh={pullToRefresh.onRefresh}>
        {days.map((day, i) => (
          <FormSection
            key={day.date}
            title={day.title}
            footer={i === days.length - 1 ? note : undefined}
          >
            {day.classes.length === 0 ? (
              <FormText
                title={
                  days.length === 1
                    ? t('scheduleNothingAhead')
                    : t('todayNoClasses')
                }
              />
            ) : (
              day.classes.map(session =>
                itemRow({
                  key: session.key,
                  title: session.courseName,
                  subtitle: classDetails(session),
                  done: session.end <= now,
                  onPress: session.courseId
                    ? () =>
                        navigation.push('CourseDetail', {
                          id: session.courseId!,
                        })
                    : undefined,
                }),
              )
            )}
          </FormSection>
        ))}
      </Form>
    </SafeArea>
  );
};

export default Schedule;
