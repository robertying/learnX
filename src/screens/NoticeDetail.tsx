import { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import AutoHeightWebView from 'components/AutoHeightWebView';
import SafeArea from 'components/SafeArea';
import { NoticeDetailParamList } from 'screens/types';
import { getWebViewTemplate } from 'helpers/html';
import { t } from 'helpers/i18n';
import { stripExtension, getExtension } from 'helpers/fs';
import { Notice } from 'data/types/state';
import { markNoticeRead, useNotice } from 'data/content';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import {
  Form,
  FormFile,
  FormSection,
  FormTitle,
  FormView,
} from 'components/Form';
import { useTheme } from 'theme';

type Props = NativeStackScreenProps<NoticeDetailParamList, 'NoticeDetail'>;

const NoticeDetail: React.FC<Props> = ({ route, navigation }) => {
  const notice = useNotice(route.params.id);

  useHeaderTitle(navigation, notice?.courseName, notice?.courseTeacherName);

  if (!notice) {
    return <NotFound />;
  }

  return <NoticeDetailContent notice={notice} navigation={navigation} />;
};

const NoticeDetailContent: React.FC<{
  notice: Notice;
  navigation: Props['navigation'];
}> = ({ notice, navigation }) => {
  const theme = useTheme();

  const {
    id,
    url,
    courseName,
    title,
    publisher,
    publishTime,
    expireTime,
    content,
    attachment,
  } = notice;

  const html = getWebViewTemplate(content || `<p>${t('noNoticeContent')}</p>`, {
    dark: theme.dark,
    // The form row's own color shows through.
    backgroundColor: 'transparent',
    textColor: theme.colors.onSurfaceHigh,
    linkColor: theme.colors.primary,
  });

  const handleFileOpen = () => {
    if (attachment) {
      navigation.push('FileDetail', {
        attachment: {
          id,
          courseName,
          title: stripExtension(attachment.name),
          downloadUrl: attachment.downloadUrl,
          fileType: getExtension(attachment.name) ?? '',
        },
      });
    }
  };

  // Opening the notice's page marks it read on the server; the cached list
  // shows it right away instead of after the next refresh.
  useEffect(() => {
    fetch(url).catch(() => {});
    markNoticeRead(id);
  }, [url, id]);

  const subtitle = [
    [publisher, dayjs(publishTime).format(t('dateTimeFormat'))]
      .filter(Boolean)
      .join(' · '),
    expireTime ? dayjs(expireTime).format(t('noticeExpireTimeFormat')) : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <SafeArea testID="notice-detail" collapsable={false}>
      <Form>
        <FormSection>
          <FormTitle title={title} subtitle={subtitle} />
        </FormSection>
        {attachment ? (
          <FormSection title={t('attachment')}>
            <FormFile
              title={attachment.name}
              detail={attachment.size}
              icon={{ ios: 'doc', android: 'file-document-outline' }}
              onPress={handleFileOpen}
            />
          </FormSection>
        ) : null}
        <FormSection>
          <FormView>
            <AutoHeightWebView source={{ html }} />
          </FormView>
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default NoticeDetail;
