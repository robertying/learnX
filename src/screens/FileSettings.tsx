import { Alert, Linking, Platform, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setSetting, useSettings } from 'data/settings';
import { ensureLearnXFilesDir, removeFileDir } from 'helpers/fs';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import DeviceInfo from 'constants/DeviceInfo';
import { SettingsStackParams } from './types';
import { Caption } from 'components/Text';

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

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <TableCell
          iconName="cached"
          primaryText={t('fileUseDocumentDir')}
          switchValue={fileUseDocumentDir}
          onSwitchValueChange={value => setSetting('fileUseDocumentDir', value)}
          type="switch"
        />
        <Caption style={styles.caption}>
          {fileUseDocumentDir
            ? t('fileUseDocumentDirOnCaption')
            : t('fileUseDocumentDirOffCaption')}
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="rename-outline"
          primaryText={t('fileOmitCourseName')}
          switchValue={fileOmitCourseName}
          onSwitchValueChange={value => setSetting('fileOmitCourseName', value)}
          type="switch"
        />
        <Caption style={styles.caption}>
          {fileOmitCourseName
            ? t('fileOmitCourseNameOnCaption')
            : t('fileOmitCourseNameOffCaption')}
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="delete"
          primaryText={t('clearFileCache')}
          type="none"
          onPress={handleClearCache}
        />
        {DeviceInfo.isMac() && (
          <TableCell
            style={styles.marginTop}
            iconName="open-in-new"
            primaryText={t('openFileDownloadDirectory')}
            type="none"
            onPress={async () => {
              try {
                const dir = await ensureLearnXFilesDir();
                await Linking.openURL(dir);
              } catch (e) {
                toast(
                  t('openFileDownloadDirectoryFailed') + (e as Error).message,
                  'error',
                );
              }
            }}
          />
        )}
        {Platform.OS === 'android' && (
          <TableCell
            style={styles.marginTop}
            iconName="open-in-new"
            primaryText={t('openFileAfterDownload')}
            switchValue={openFileAfterDownload}
            onSwitchValueChange={value =>
              setSetting('openFileAfterDownload', value)
            }
            type="switch"
          />
        )}
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
    marginHorizontal: 16,
  },
});

export default FileSettings;
