import { useEffect, useLayoutEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Caption, Divider, Title, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TextButton from 'components/TextButton';
import AutoHeightWebView from 'components/AutoHeightWebView';
import SafeArea from 'components/SafeArea';
import Styles from 'constants/Styles';
import { NoticeStackParams } from 'screens/types';
import { getWebViewTemplate } from 'helpers/html';
import { isLocaleChinese, t } from 'helpers/i18n';
import { stripExtension, getExtension } from 'helpers/fs';
import { File } from 'data/types/state';

type Props = NativeStackScreenProps<NoticeStackParams, 'NoticeDetail'>;

const NoticeDetail: React.FC<Props> = ({ route, navigation }) => {
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
    disableAnimation,
  } = route.params;

  const html = useMemo(
    () =>
      getWebViewTemplate(
        content || `<p>${t('noNoticeContent')}</p>`,
        theme.dark,
        theme.colors.surface,
      ),
    [content, theme],
  );

  const handleFileOpen = () => {
    if (attachment) {
      const data = {
        id,
        courseName,
        title: stripExtension(attachment.name),
        downloadUrl: attachment.downloadUrl,
        fileType: getExtension(attachment.name) ?? '',
      } as File;

      navigation.push('FileDetail', data);
    }
  };

  useLayoutEffect(() => {
    if (disableAnimation) {
      navigation.setOptions({
        animation: 'none',
      });
    }
  }, [navigation, disableAnimation]);

  useEffect(() => {
    fetch(url);
  }, [url]);

  return (
    <SafeArea>
      <ScrollView style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.section}>
          <Title>{title}</Title>
          <View style={Styles.flexRowCenter}>
            <Caption>{publisher}</Caption>
            <Caption>
              {dayjs(publishTime).format(
                isLocaleChinese()
                  ? 'YYYY 年 M 月 D 日 dddd HH:mm'
                  : 'MMM D, YYYY HH:mm',
              )}
            </Caption>
          </View>
          {expireTime && (
            <Caption style={Styles.flexRowCenter}>
              {dayjs(expireTime).format(
                isLocaleChinese()
                  ? 'YYYY 年 M 月 D 日 dddd HH:mm 过期'
                  : '[expire at] MMM D, YYYY HH:mm',
              )}
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
              style={styles.textPaddingRight}
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
  textPaddingRight: {
    paddingRight: 16,
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
