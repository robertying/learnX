import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setSetting, useSettings } from 'data/settings';
import { listDownloads } from 'helpers/files/downloads';
import { formatFileSize } from 'helpers/filename';
import { t } from 'helpers/i18n';
import { Form, FormLink, FormSection, FormToggle } from 'components/Form';
import SafeArea from 'components/SafeArea';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'FileSettings'>;

const FileSettings: React.FC<Props> = ({ navigation }) => {
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

  return (
    <SafeArea>
      <Form>
        {Platform.OS === 'android' && (
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
        <FormSection>
          <FormLink
            icon="download"
            title={t('downloads')}
            detail={
              downloadsSize === null ? undefined : formatFileSize(downloadsSize)
            }
            onPress={() => navigation.push('Downloads')}
          />
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default FileSettings;
