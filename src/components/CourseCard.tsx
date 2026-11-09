import { StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { Course } from 'data/types/state';
import { t } from 'helpers/i18n';
import { CardGutter } from './CardRow';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import { Caption, Headline } from 'components/Text';
import { useTheme } from 'theme';

export interface CourseCardProps extends CardWrapperProps {
  data: Course & {
    unreadNoticeCount: number;
    unfinishedAssignmentCount: number;
    unreadFileCount: number;
  };
}

type CountIcon = 'bell-outline' | 'calendar-blank-outline' | 'folder-outline';

/** A count with its icon, left out when there is nothing new. */
const Count: React.FC<{ icon: CountIcon; count: number }> = ({
  icon,
  count,
}) => {
  const theme = useTheme();
  if (!count) {
    return null;
  }
  return (
    <View style={styles.count}>
      <Icon name={icon} size={15} color={theme.colors.primary} />
      <Caption
        variant="subheadline"
        style={[styles.countText, { color: theme.colors.primary }]}
      >
        {count}
      </Caption>
    </View>
  );
};

const countText = (count: number, one: string, many: string) =>
  count === 0 ? undefined : count === 1 ? one : many;

const CourseCard: React.FC<CourseCardProps> = ({
  data: {
    name,
    teacherName,
    unreadNoticeCount,
    unfinishedAssignmentCount,
    unreadFileCount,
  },
  ...restProps
}) => (
  <CardWrapper
    {...restProps}
    accessibilityLabel={[
      name,
      teacherName,
      countText(
        unreadNoticeCount,
        t('todayOneUnreadNotice'),
        t('todayUnreadNotices', { count: unreadNoticeCount }),
      ),
      countText(
        unfinishedAssignmentCount,
        t('courseOneUnfinishedAssignment'),
        t('courseUnfinishedAssignments', { count: unfinishedAssignmentCount }),
      ),
      countText(
        unreadFileCount,
        t('todayOneNewFile'),
        t('todayNewFiles', { count: unreadFileCount }),
      ),
    ]
      .filter(Boolean)
      .join(', ')}
  >
    <View style={styles.root}>
      <CardGutter />
      <View style={styles.names}>
        <Headline>{name}</Headline>
        <Caption variant="subheadline" numberOfLines={1}>
          {teacherName}
        </Caption>
      </View>
      <View style={styles.counts}>
        <Count icon="bell-outline" count={unreadNoticeCount} />
        <Count
          icon="calendar-blank-outline"
          count={unfinishedAssignmentCount}
        />
        <Count icon="folder-outline" count={unreadFileCount} />
      </View>
    </View>
  </CardWrapper>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  names: {
    flex: 1,
  },
  counts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  countText: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

export default CourseCard;
