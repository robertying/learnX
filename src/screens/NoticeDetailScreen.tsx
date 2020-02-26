import React, {useEffect} from 'react';
import NoticeBoard from '../components/NoticeBoard';
import {INavigationScreen} from '../types';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';

export interface INoticeDetailScreenProps {
  title: string;
  author: string;
  content: string;
  publishTime: string;
  attachmentName?: string;
  attachmentUrl?: string;
  courseName?: string;
}

const NoticeDetailScreen: INavigationScreen<INoticeDetailScreenProps> = props => {
  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  return <NoticeBoard {...props} />;
};

export default NoticeDetailScreen;
