import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Caption, Subheading, Title, useTheme } from 'react-native-paper';
import Icon from '@react-native-vector-icons/material-icons';
import { Course } from 'data/types/state';
import CardWrapper, { CardWrapperProps } from './CardWrapper';

export interface CourseCardProps extends CardWrapperProps {
  data: Course & {
    unreadNoticeCount: number;
    unfinishedAssignmentCount: number;
    unreadFileCount: number;
  };
}

const CourseCard: React.FC<React.PropsWithChildren<CourseCardProps>> = ({
  data: {
    name,
    teacherName,
    unreadNoticeCount,
    unfinishedAssignmentCount,
    unreadFileCount,
  },
  ...restProps
}) => {
  const theme = useTheme();

  return (
    <CardWrapper {...restProps}>
      <View style={styles.root}>
        <View style={styles.contentSections}>
          <Subheading numberOfLines={1}>{teacherName}</Subheading>
          <Title>{name}</Title>
        </View>
        <View style={styles.countSections}>
          <View style={styles.section}>
            <Icon name="notifications" color={theme.colors.outline} />
            <Caption style={styles.sectionText}>{unreadNoticeCount}</Caption>
          </View>
          <View style={styles.section}>
            <Icon name="event" color={theme.colors.outline} />
            <Caption style={styles.sectionText}>
              {unfinishedAssignmentCount}
            </Caption>
          </View>
          <View style={styles.section}>
            <Icon name="folder" color={theme.colors.outline} />
            <Caption style={styles.sectionText}>{unreadFileCount}</Caption>
          </View>
        </View>
      </View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  contentSections: {
    flex: 2,
  },
  countSections: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  section: {
    flex: 1,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionText: {
    marginLeft: 2,
  },
});

export default memo(CourseCard);
