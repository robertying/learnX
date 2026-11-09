import { StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { Course } from 'data/types/state';
import { t } from 'helpers/i18n';
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
const Count: React.FC<{ icon: CountIcon; count: number; label: string }> = ({
  icon,
  count,
  label,
}) => {
  const theme = useTheme();
  if (!count) {
    return null;
  }
  return (
    <View style={styles.count} accessible accessibilityLabel={label}>
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

const CourseCard: React.FC<React.PropsWithChildren<CourseCardProps>> = ({
  data: {
    name,
    teacherName,
    unreadNoticeCount,
    unfinishedAssignmentCount,
    unreadFileCount,
  },
  ...restProps
}) => (
  <CardWrapper {...restProps}>
    <View style={styles.root}>
      <View style={styles.names}>
        <Headline>{name}</Headline>
        <Caption variant="subheadline" numberOfLines={1}>
          {teacherName}
        </Caption>
      </View>
      <View style={styles.counts}>
        <Count
          icon="bell-outline"
          count={unreadNoticeCount}
          label={`${t('notices')} ${unreadNoticeCount}`}
        />
        <Count
          icon="calendar-blank-outline"
          count={unfinishedAssignmentCount}
          label={`${t('assignments')} ${unfinishedAssignmentCount}`}
        />
        <Count
          icon="folder-outline"
          count={unreadFileCount}
          label={`${t('files')} ${unreadFileCount}`}
        />
      </View>
    </View>
  </CardWrapper>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
