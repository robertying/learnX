import React, {useEffect, useLayoutEffect, useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {Caption, Divider, Title, useTheme} from 'react-native-paper';
import {StackScreenProps} from '@react-navigation/stack';
import {StackActions} from '@react-navigation/native';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TextButton from 'components/TextButton';
import AutoHeightWebView from 'components/AutoHeightWebView';
import SafeArea from 'components/SafeArea';
import Styles from 'constants/Styles';
import {ScreenParams} from 'screens/types';
import {getWebViewTemplate} from 'helpers/html';
import {stripExtension, getExtension} from 'helpers/fs';
import {File} from 'data/types/state';
import useDetailNavigator from 'hooks/useDetailNavigator';

const NoticeDetail: React.FC<
  StackScreenProps<ScreenParams, 'NoticeDetail'>
> = ({route, navigation}) => {
  const theme = useTheme();

  const detailNavigator = useDetailNavigator();

  const {
    id,
    url,
    courseName,
    title,
    publisher,
    publishTime,
    content,
    attachmentName,
    attachmentUrl,
    disableAnimation,
  } = route.params;

  const html = useMemo(
    () =>
      getWebViewTemplate(
        content || '无通知内容',
        theme.dark,
        theme.colors.surface,
      ),
    [content, theme],
  );

  const handleFileOpen = () => {
    if (attachmentName && attachmentUrl) {
      const data = {
        id,
        courseName,
        title: stripExtension(attachmentName),
        downloadUrl: attachmentUrl,
        fileType: getExtension(attachmentName) ?? '',
      } as File;

      navigation.push('FileDetail', data);
    }
  };

  useLayoutEffect(() => {
    if (disableAnimation) {
      navigation.setOptions({
        animationEnabled: false,
      });
    }
  }, [navigation, disableAnimation]);

  useEffect(() => {
    fetch(url);
  }, [url]);

  return (
    <SafeArea>
      <ScrollView style={{backgroundColor: theme.colors.surface}}>
        <View style={styles.section}>
          <Title>{title}</Title>
          <View style={Styles.flexRowCenter}>
            <Caption>{publisher}</Caption>
            <Caption>
              {dayjs(publishTime).format('YYYY 年 M 月 D 日 dddd HH:mm')}
            </Caption>
          </View>
        </View>
        <Divider />
        {attachmentName && (
          <View style={[styles.section, styles.iconButton]}>
            <Icon
              style={styles.icon}
              name="attachment"
              color={theme.colors.primary}
              size={17}
            />
            <TextButton onPress={handleFileOpen}>{attachmentName}</TextButton>
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
  icon: {
    marginRight: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default NoticeDetail;
