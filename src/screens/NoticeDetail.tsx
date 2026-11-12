import { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import FormWebView from 'components/FormWebView';
import { NoticeDetailParamList } from 'navigation/types';
import { getWebViewTemplate } from 'helpers/html';
import { t } from 'helpers/i18n';
import { attachmentFile } from 'helpers/attachments';
import { Notice } from 'data/types/state';
import { useNotice } from 'data/content';
import { openNotice } from 'data/serverActions';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import { useMinute } from 'hooks/useClock';
import {
  Form,
  FormFile,
  FormScreen,
  FormSection,
  FormParagraph,
  FormTitle,
} from 'components/Form';
import { useTheme, webContentColors } from 'theme';

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
  const now = useMinute();

  const {
    id,
    url,
    title,
    publisher,
    publishTime,
    expireTime,
    content,
    attachment,
  } = notice;

  const html = getWebViewTemplate(content ?? '', {
    dark: theme.dark,
    // The form row's own color shows through.
    backgroundColor: 'transparent',
    ...webContentColors(theme.dark),
  });

  const handleFileOpen = () => {
    if (attachment) {
      navigation.push('FileDetail', {
        attachment: attachmentFile(notice, attachment),
      });
    }
  };

  // Opening the notice's page marks it read on the server (now, or once the
  // app is back online); the cached list shows it right away.
  useEffect(() => {
    openNotice(id, url);
  }, [url, id]);

  const subtitle = [
    [publisher, dayjs(publishTime).format(t('dateTimeFormat'))]
      .filter(Boolean)
      .join(' · '),
    expireTime
      ? dayjs(expireTime).format(
          dayjs(expireTime).isAfter(now)
            ? t('noticeExpireTimeFormat')
            : t('noticeExpiredTimeFormat'),
        )
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <FormScreen testID="notice-detail" collapsable={false}>
      <Form>
        <FormSection>
          <FormTitle title={title} subtitle={subtitle} />
        </FormSection>
        {attachment ? (
          <FormSection title={t('attachment')}>
            <FormFile
              title={attachment.name}
              detail={attachment.size}
              icon="file"
              onPress={handleFileOpen}
            />
          </FormSection>
        ) : null}
        <FormSection>
          {content?.trim() ? (
            <FormWebView html={html} />
          ) : (
            <FormParagraph text={t('noNoticeContent')} />
          )}
        </FormSection>
      </Form>
    </FormScreen>
  );
};

export default NoticeDetail;
