import { useCallback, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setSetting, useSettings } from 'data/settings';
import {
  ensureLearnXFilesDir,
  listDownloads,
  moveDownloadsToCurrentDirectory,
} from 'helpers/fs';
import { formatFileSize } from 'helpers/filename';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import {
  Form,
  FormButton,
  FormLink,
  FormSection,
  FormToggle,
} from 'components/Form';
import SafeArea from 'components/SafeArea';
import DeviceInfo from 'constants/DeviceInfo';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'FileSettings'>;

const FileSettings: React.FC<Props> = ({ navigation }) => {
  const fileUseDocumentDir = useSettings(
    settings => settings.fileUseDocumentDir,
  );
  const fileOmitCourseName = useSettings(
    settings => settings.fileOmitCourseName,
  );
  const openFileAfterDownload = useSettings(
    settings => settings.openFileAfterDownload,
  );

  const [downloadsSize, setDownloadsSize] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      setDownloadsSize(
        listDownloads().reduce((total, course) => total + course.size, 0),
      );
    }, []),
  );

  const openDownloadDirectory = async () => {
    try {
      const dir = await ensureLearnXFilesDir();
      await Linking.openURL(dir);
    } catch (e) {
      toast(
        t('openFileDownloadDirectoryFailed') + (e as Error).message,
        'error',
      );
    }
  };

  return (
    <SafeArea>
      <Form>
        <FormSection
          footer={
            fileUseDocumentDir
              ? t('fileUseDocumentDirOnCaption')
              : t('fileUseDocumentDirOffCaption')
          }
        >
          <FormToggle
            icon={{ ios: 'internaldrive', android: 'cached', color: 'gray' }}
            title={t('fileUseDocumentDir')}
            value={fileUseDocumentDir}
            onValueChange={value => {
              setSetting('fileUseDocumentDir', value);
              moveDownloadsToCurrentDirectory();
            }}
          />
        </FormSection>
        <FormSection
          footer={
            fileOmitCourseName
              ? t('fileOmitCourseNameOnCaption')
              : t('fileOmitCourseNameOffCaption')
          }
        >
          <FormToggle
            icon={{
              ios: 'character.cursor.ibeam',
              android: 'rename-outline',
              color: 'gray',
            }}
            title={t('fileOmitCourseName')}
            value={fileOmitCourseName}
            onValueChange={value => setSetting('fileOmitCourseName', value)}
          />
        </FormSection>
        {Platform.OS === 'android' && (
          <FormSection>
            <FormToggle
              icon={{
                ios: 'arrow.up.forward.app',
                android: 'open-in-new',
                color: 'blue',
              }}
              title={t('openFileAfterDownload')}
              value={openFileAfterDownload}
              onValueChange={value =>
                setSetting('openFileAfterDownload', value)
              }
            />
          </FormSection>
        )}
        <FormSection>
          <FormLink
            icon={{
              ios: 'arrow.down.circle',
              android: 'download',
              color: 'green',
            }}
            title={t('downloads')}
            detail={
              downloadsSize === null ? undefined : formatFileSize(downloadsSize)
            }
            onPress={() => navigation.push('Downloads')}
          />
          {DeviceInfo.isMac() && (
            <FormButton
              icon={{ ios: 'folder', android: 'open-in-new', color: 'blue' }}
              title={t('openFileDownloadDirectory')}
              onPress={openDownloadDirectory}
            />
          )}
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default FileSettings;
