import React from "react";
import NoticeBoard from "../components/NoticeBoard";
import { INavigationScreen } from "../types/NavigationScreen";

interface INoticeDetailScreenProps {
  readonly title: string;
  readonly author: string;
  readonly content: string;
}

const NoticeDetailScreen: INavigationScreen<
  INoticeDetailScreenProps
> = props => {
  const { navigation } = props;
  const title = navigation.getParam("title");
  const content = navigation.getParam("content");
  const author = navigation.getParam("author");

  return <NoticeBoard title={title} content={content} author={author} />;
};

// tslint:disable-next-line: no-object-mutation
NoticeDetailScreen.navigationOptions = {
  title: "详情"
};

export default NoticeDetailScreen;
