import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CourseDownloads,
  listDownloads,
  removeCourseDownloads,
  removeFileDir,
} from 'services/files/downloads';
import { exportDownloads } from 'services/files/export';
import { formatFileSize } from 'helpers/filename';
import { t, tCount } from 'helpers/i18n';
import { toast } from 'components/Toast';
import {
  Form,
  FormButton,
  FormChoiceButton,
  FormScreen,
  FormSection,
  FormText,
  FormToggle,
} from 'components/Form';
import { setSetting, useSettings } from 'data/settings';
import { SettingsStackParams } from 'navigation/types';
import DeviceInfo from 'constants/DeviceInfo';
import { isAndroid, isElectron } from 'helpers/platform';
import { recordError } from 'services/crashReporting';

type Props = NativeStackScreenProps<SettingsStackParams, 'Downloads'>;

const fileCount = (count: number) =>
  tCount('downloadsOneFile', 'downloadsFileCount', count);

/**
 * How to reach a course's Export and Delete: its row brings up a menu, tapped
 * on iOS and Android, clicked on the Mac and in the Electron app.
 */
const caption = () =>
  isElectron()
    ? t('downloadsCaptionElectron')
    : DeviceInfo.isMac()
      ? t('downloadsCaptionMac')
      : t('downloadsCaption');

const summary = ({ count, size }: { count: number; size: number }) =>
  `${fileCount(count)} · ${formatFileSize(size)}`;

/**
 * Downloaded files by course, with their sizes, to export or delete per
 * course; on Android also whether a download opens when it's done.
 */
const Downloads: React.FC<Props> = () => {
  const [courses, setCourses] = useState<CourseDownloads[]>([]);
  const openFileAfterDownload = useSettings(
    settings => settings.openFileAfterDownload,
  );

  const [exporting, setExporting] = useState(false);

  const reload = useCallback(() => {
    setCourses(listDownloads());
  }, []);
  useFocusEffect(reload);

  const exportFiles = async (courseId?: string) => {
    setExporting(true);
    let result: Awaited<ReturnType<typeof exportDownloads>> = null;
    let error: unknown = null;
    try {
      result = await exportDownloads(courseId);
    } catch (e) {
      error = e;
    }
    setExporting(false);
    if (error) {
      // The error's text is often the system's English: report it instead.
      recordError(error);
      toast(t('downloadsExportFailed'), 'error');
    } else if (result) {
      const files = fileCount(result.exported);
      toast(
        result.failed > 0
          ? t('downloadsExportedPartly', { files, failed: result.failed })
          : t('downloadsExported', { files }),
        result.failed > 0 ? 'error' : 'success',
      );
    }
  };

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
              recordError(e);
              toast(t('deleteFailed'), 'error');
            }
            reload();
          },
        },
      ],
      { cancelable: true },
    );

  return (
    <FormScreen>
      <Form testID="downloads">
        {isAndroid() && (
          <FormSection>
            <FormToggle
              icon="open"
              title={t('openFileAfterDownload')}
              value={openFileAfterDownload}
              onValueChange={value =>
                setSetting('openFileAfterDownload', value)
              }
            />
          </FormSection>
        )}
        <FormSection footer={caption()}>
          <FormText
            icon="storage"
            title={t('downloadsTotal')}
            detail={summary(total)}
          />
        </FormSection>
        {courses.length > 0 && (
          <FormSection>
            {courses.map(course => (
              <FormChoiceButton
                key={course.courseId}
                testID={`downloads-course-${course.courseId}`}
                icon="folder"
                title={course.courseName}
                detail={summary(course)}
                disabled={exporting}
                sheet={{
                  title: course.courseName,
                  message: summary(course),
                  choices: [
                    {
                      label: t('downloadsExportCourse'),
                      onPress: () => {
                        void exportFiles(course.courseId);
                      },
                    },
                    {
                      label: t('deleteEllipsis'),
                      destructive: true,
                      onPress: () =>
                        confirm(
                          t('downloadsDeleteCourse'),
                          `${course.courseName}\n${summary(course)}\n\n${t('downloadsDeleteKeepsExported')}`,
                          () => removeCourseDownloads(course.courseId),
                          t('downloadsDeletedCourse', {
                            course: course.courseName,
                          }),
                        ),
                    },
                  ],
                }}
              />
            ))}
          </FormSection>
        )}
        <FormSection footer={t('downloadsExportCaption')}>
          <FormButton
            testID="downloads-export"
            icon="export"
            title={t('downloadsExport')}
            loading={exporting}
            disabled={exporting || courses.length === 0}
            onPress={() => exportFiles()}
          />
        </FormSection>
        <FormSection>
          <FormButton
            icon="delete"
            title={t('clearFileCacheEllipsis')}
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
    </FormScreen>
  );
};

export default Downloads;
