import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
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
import { Form, FormButton, FormSection, FormText } from 'components/Form';
import SafeArea from 'components/SafeArea';
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
    succeeded: string,
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
              toast(succeeded, 'success');
            } catch (e) {
              toast(t('deleteFailed') + (e as Error).message, 'error');
            }
            reload();
          },
        },
      ],
      { cancelable: true },
    );

  return (
    <SafeArea>
      <Form>
        <FormSection footer={t('downloadsCaption')}>
          <FormText
            icon={{ ios: 'internaldrive', android: 'harddisk', color: 'gray' }}
            title={t('downloadsTotal')}
            detail={summary(total)}
          />
        </FormSection>
        {courses.length > 0 && (
          <FormSection>
            {courses.map(course => (
              <FormButton
                key={course.courseName}
                icon={{ ios: 'folder', android: 'folder', color: 'blue' }}
                title={course.courseName}
                detail={summary(course)}
                onPress={() =>
                  confirm(
                    t('downloadsDeleteCourse'),
                    `${course.courseName}\n${summary(course)}`,
                    () => removeCourseDownloads(course.courseName),
                    t('downloadsDeletedCourse', { course: course.courseName }),
                  )
                }
              />
            ))}
          </FormSection>
        )}
        <FormSection>
          <FormButton
            icon={{ ios: 'trash', android: 'delete', color: 'red' }}
            title={t('clearFileCache')}
            destructive
            onPress={() =>
              confirm(
                t('clearFileCache'),
                t('clearFileCacheConfirmation'),
                removeFileDir,
                t('clearFileCacheSucceeded'),
              )
            }
          />
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default Downloads;
