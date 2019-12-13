import React, {useEffect} from 'react';
import NoticeBoard from '../components/NoticeBoard';
import {INavigationScreen} from '../types';
import {useDarkMode} from 'react-native-dark-mode';
import {adaptToSystemTheme} from '../helpers/darkmode';

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
  const isDarkMode = useDarkMode();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, isDarkMode, true);
  }, [isDarkMode, props.componentId]);

  return <NoticeBoard {...props} />;
};

export default NoticeDetailScreen;
