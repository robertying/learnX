import { StyleSheet, View } from 'react-native';
import { Course } from 'data/types/state';
import { tCount, type TextKey } from 'helpers/i18n';
import { CardGutter } from './CardRow';
import SystemIcon from './SystemIcon';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import { Caption, Headline, useTextIconSize } from 'components/Text';
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
  const iconSize = useTextIconSize('subheadline');
  if (!count) {
    return null;
  }
  return (
    <View style={styles.count}>
      <SystemIcon name={icon} size={iconSize} color={theme.colors.primary} />
      <Caption
        variant="subheadline"
        style={[styles.countText, { color: theme.colors.primary }]}
      >
        {count}
      </Caption>
    </View>
  );
};

const countText = (count: number, one: TextKey, other: TextKey) =>
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
    paddingVertical: 2,
    gap: 4,
  },
  // Medium weight, as the other lists' titles (`CardRow`).
  name: {
    fontWeight: '500',
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
