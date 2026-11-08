import { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CourseDownloads,
  listDownloads,
  removeCourseDownloads,
  removeFileDir,
} from 'helpers/fs';
import { formatFileSize } from 'helpers/filename';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import { Caption } from 'components/Text';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'Downloads'>;

const fileCount = (count: number) =>
  count === 1 ? t('downloadsOneFile') : t('downloadsFileCount', { count });

const summary = ({ count, size }: { count: number; size: number }) =>
  `${fileCount(count)} · ${formatFileSize(size)}`;

/** Downloaded files by course, with their sizes, to delete per course. */
const Downloads: React.FC<Props> = () => {
  const [courses, setCourses] = useState<CourseDownloads[]>([]);

  const reload = useCallback(() => {
    setCourses(listDownloads());
  }, []);
  useFocusEffect(reload);

  const total = courses.reduce(
    (acc, course) => ({
      count: acc.count + course.count,
      size: acc.size + course.size,
    }),
    { count: 0, size: 0 },
  );

  const confirm = (
    title: string,
    message: string,
    action: () => void | Promise<void>,
  ) =>
    Alert.alert(
      title,
      message,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await action();
              toast(t('clearFileCacheSucceeded'), 'success');
            } catch (e) {
              toast(t('clearFileCacheFailed') + (e as Error).message, 'error');
            }
            reload();
          },
        },
      ],
      { cancelable: true },
    );

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <TableCell
          iconName="harddisk"
          primaryText={t('downloadsTotal')}
          secondaryText={summary(total)}
          type="none"
        />
        <Caption style={styles.caption}>{t('downloadsCaption')}</Caption>
        {courses.map(course => (
          <TableCell
            key={course.courseName}
            iconName="folder"
            primaryText={course.courseName}
            secondaryText={summary(course)}
            type="none"
            onPress={() =>
              confirm(
                t('downloadsDeleteCourse'),
                `${course.courseName}\n${summary(course)}`,
                () => removeCourseDownloads(course.courseName),
              )
            }
          />
        ))}
        <TableCell
          style={styles.marginTop}
          iconName="delete"
          primaryText={t('clearFileCache')}
          type="none"
          onPress={() =>
            confirm(
              t('clearFileCache'),
              t('clearFileCacheConfirmation'),
              removeFileDir,
            )
          }
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
    marginBottom: 24,
    marginHorizontal: 16,
  },
});

export default Downloads;
