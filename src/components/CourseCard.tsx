import { StyleSheet, View } from 'react-native';
import { Course } from 'data/types/state';
import { tCount, type TranslationKey } from 'helpers/i18n';
import { CardGutter } from './CardRow';
import SystemIcon from './SystemIcon';
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

type CountIcon = 'notices' | 'assignments' | 'files';

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
      <SystemIcon name={icon} size={15} color={theme.colors.primary} />
      <Caption
        variant="subheadline"
        style={[styles.countText, { color: theme.colors.primary }]}
      >
        {count}
      </Caption>
    </View>
  );
};

const countText = (count: number, one: TranslationKey, other: TranslationKey) =>
  count === 0 ? undefined : tCount(one, other, count);

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
    testID="course-card"
    accessibilityLabel={[
      name,
      teacherName,
      countText(
        unreadNoticeCount,
        'todayOneUnreadNotice',
        'todayUnreadNotices',
      ),
      countText(
        unfinishedAssignmentCount,
        'courseOneUnfinishedAssignment',
        'courseUnfinishedAssignments',
      ),
      countText(unreadFileCount, 'todayOneNewFile', 'todayNewFiles'),
    ]
      .filter(Boolean)
      .join(', ')}
  >
    <View style={styles.root}>
      <CardGutter />
      <View style={styles.names}>
        <Headline style={styles.name}>{name}</Headline>
        <Caption variant="subheadline" numberOfLines={1}>
          {teacherName}
        </Caption>
      </View>
      <View style={styles.counts}>
        <Count icon="notices" count={unreadNoticeCount} />
        <Count icon="assignments" count={unfinishedAssignmentCount} />
        <Count icon="files" count={unreadFileCount} />
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
  // Regular weight, as the other lists' titles (`CardRow`): a course has
  // nothing unread for weight to stand for.
  name: {
    fontWeight: '400',
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
