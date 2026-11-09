import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import Icon from '@react-native-vector-icons/material-design-icons';
import TextButton from 'components/TextButton';
import AutoHeightWebView from 'components/AutoHeightWebView';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import Styles from 'constants/Styles';
import { NoticeDetailParamList } from 'screens/types';
import { getWebViewTemplate } from 'helpers/html';
import { t } from 'helpers/i18n';
import { stripExtension, getExtension } from 'helpers/fs';
import { Notice } from 'data/types/state';
import { markNoticeRead, useNotice } from 'data/content';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import { Caption, Title } from 'components/Text';
import Divider from 'components/Divider';
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
    backgroundColor: theme.colors.surface,
    textColor: theme.colors.onSurfaceHigh,
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

  return (
    <SafeArea testID="notice-detail" collapsable={false}>
      <ScrollView style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.section}>
          <Title>{title}</Title>
          <View style={Styles.metaRow}>
            <Caption>{publisher}</Caption>
            <Caption>{dayjs(publishTime).format(t('dateTimeFormat'))}</Caption>
          </View>
          {expireTime && (
            <Caption style={Styles.flexRowCenter}>
              {dayjs(expireTime).format(t('noticeExpireTimeFormat'))}
            </Caption>
          )}
        </View>
        <Divider />
        {attachment && (
          <View style={[styles.section, styles.iconButton]}>
            <Icon
              style={styles.icon}
              name="attachment"
              color={theme.colors.primary}
              size={17}
            />
            <TextButton
              fill
              style={[Styles.flex1, styles.buttonEnd]}
              onPress={handleFileOpen}
            >
              {attachment.name}
            </TextButton>
          </View>
        )}
        <Divider />
        <AutoHeightWebView
          source={{
            html,
          }}
        />
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonEnd: {
    marginEnd: 16,
  },
  icon: {
    marginRight: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default NoticeDetail;
