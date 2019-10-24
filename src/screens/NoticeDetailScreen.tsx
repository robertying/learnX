import React from 'react';
import NoticeBoard from '../components/NoticeBoard';
import {INavigationScreen} from '../types';

export interface INoticeDetailScreenProps {
  title: string;
  author: string;
  content: string;
  publishTime: string;
  attachmentName?: string;
  attachmentUrl?: string;
  courseName?: string;
}

const NoticeDetailScreen: INavigationScreen<
  INoticeDetailScreenProps
> = props => {
  return <NoticeBoard {...props} />;
};

export default NoticeDetailScreen;
