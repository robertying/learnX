import { Alert, Linking, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setSetting, useSettings } from 'data/settings';
import { ensureLearnXFilesDir, removeFileDir } from 'helpers/fs';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import { Form, FormButton, FormSection, FormToggle } from 'components/Form';
import SafeArea from 'components/SafeArea';
import DeviceInfo from 'constants/DeviceInfo';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'FileSettings'>;

const FileSettings: React.FC<Props> = () => {
  const fileUseDocumentDir = useSettings(
    settings => settings.fileUseDocumentDir,
  );
  const fileOmitCourseName = useSettings(
    settings => settings.fileOmitCourseName,
  );
  const openFileAfterDownload = useSettings(
    settings => settings.openFileAfterDownload,
  );

  const handleClearCache = () => {
    Alert.alert(
      t('clearFileCache'),
      t('clearFileCacheConfirmation'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('ok'),
          onPress: async () => {
            try {
              await removeFileDir();
              toast(t('clearFileCacheSucceeded'), 'success');
            } catch (e) {
              toast(t('clearFileCacheFailed') + (e as Error).message, 'error');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

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
            icon={{ ios: 'internaldrive', android: 'cached' }}
            title={t('fileUseDocumentDir')}
            value={fileUseDocumentDir}
            onValueChange={value => setSetting('fileUseDocumentDir', value)}
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
            icon={{ ios: 'character.cursor.ibeam', android: 'rename-outline' }}
            title={t('fileOmitCourseName')}
            value={fileOmitCourseName}
            onValueChange={value => setSetting('fileOmitCourseName', value)}
          />
        </FormSection>
        {Platform.OS === 'android' && (
          <FormSection>
            <FormToggle
              icon={{ ios: 'arrow.up.forward.app', android: 'open-in-new' }}
              title={t('openFileAfterDownload')}
              value={openFileAfterDownload}
              onValueChange={value =>
                setSetting('openFileAfterDownload', value)
              }
            />
          </FormSection>
        )}
        <FormSection>
          {DeviceInfo.isMac() && (
            <FormButton
              icon={{ ios: 'folder', android: 'open-in-new' }}
              title={t('openFileDownloadDirectory')}
              onPress={openDownloadDirectory}
            />
          )}
          <FormButton
            icon={{ ios: 'trash', android: 'delete' }}
            title={t('clearFileCache')}
            destructive
            onPress={handleClearCache}
          />
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default FileSettings;
