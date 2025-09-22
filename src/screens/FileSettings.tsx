import { Alert, Linking, Platform, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Caption } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from 'data/store';
import { setSetting } from 'data/actions/settings';
import { getLearnXFilesDir, removeFileDir } from 'helpers/fs';
import { isLocaleChinese, t } from 'helpers/i18n';
import useToast from 'hooks/useToast';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import DeviceInfo from 'constants/DeviceInfo';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'FileSettings'>;

const FileSettings: React.FC<Props> = props => {
  const toast = useToast();

  const dispatch = useAppDispatch();
  const fileUseDocumentDir = useAppSelector(
    state => state.settings.fileUseDocumentDir,
  );
  const fileOmitCourseName = useAppSelector(
    state => state.settings.fileOmitCourseName,
  );
  const openFileAfterDownload = useAppSelector(
    state => state.settings.openFileAfterDownload,
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

  useNavigationAnimation(props);

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <TableCell
          iconName="cached"
          primaryText={t('fileUseDocumentDir')}
          switchValue={fileUseDocumentDir}
          onSwitchValueChange={value =>
            dispatch(setSetting('fileUseDocumentDir', value))
          }
          type="switch"
        />
        <Caption style={styles.caption}>
          {isLocaleChinese()
            ? fileUseDocumentDir
              ? '文件保存在 App 的“文档”中，只会随 App 卸载而被删除。'
              : '文件保存在 App 的“缓存”中，会在设备空间不足或其他系统预设情况下被自动清除以节约空间。'
            : fileUseDocumentDir
              ? 'Files are saved in App Document folder and will only be deleted along with the App.'
              : 'Files are saved in App Cache Folder and will be deleted by the system on demand.'}
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="drive-file-rename-outline"
          primaryText={t('fileOmitCourseName')}
          switchValue={fileOmitCourseName}
          onSwitchValueChange={value =>
            dispatch(setSetting('fileOmitCourseName', value))
          }
          type="switch"
        />
        <Caption style={styles.caption}>
          {isLocaleChinese()
            ? fileOmitCourseName
              ? '文件以“文件名”形式保存。'
              : '文件以“课程名-文件名”形式保存。'
            : fileOmitCourseName
              ? 'Files are saved as "filename".'
              : 'Files are saved as "coursename-filename".'}
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
            onPress={() => {
              Linking.openURL(getLearnXFilesDir());
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
              dispatch(setSetting('openFileAfterDownload', value))
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
