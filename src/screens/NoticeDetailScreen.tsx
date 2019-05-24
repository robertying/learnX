import React from "react";
import NoticeBoard from "../components/NoticeBoard";
import { getTranslation } from "../helpers/i18n";
import { INavigationScreen } from "../types/NavigationScreen";

interface INoticeDetailScreenProps {
  readonly title: string;
  readonly author: string;
  readonly content: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
}

const NoticeDetailScreen: INavigationScreen<
  INoticeDetailScreenProps
> = props => {
  const { navigation } = props;
  const title = navigation.getParam("title");
  const content = navigation.getParam("content");
  const author = navigation.getParam("author");
  const attachmentName = navigation.getParam("attachmentName");
  const attachmentUrl = navigation.getParam("attachmentUrl");

  return (
    <NoticeBoard
      title={title}
      content={content}
      author={author}
      attachmentName={attachmentName}
      attachmentUrl={attachmentUrl}
    />
  );
};

// tslint:disable-next-line: no-object-mutation
NoticeDetailScreen.navigationOptions = {
  title: getTranslation("detail")
};

export default NoticeDetailScreen;
