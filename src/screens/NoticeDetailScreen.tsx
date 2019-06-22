import React from "react";
import NoticeBoard from "../components/NoticeBoard";
import { getTranslation } from "../helpers/i18n";
import { NavigationScreen } from "../types/NavigationScreen";

interface INoticeDetailScreenProps {
  readonly title: string;
  readonly author: string;
  readonly content: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
}

const NoticeDetailScreen: NavigationScreen<
  INoticeDetailScreenProps
> = props => {
  return <NoticeBoard {...props} />;
};

// tslint:disable-next-line: no-object-mutation
NoticeDetailScreen.options = {
  topBar: {
    title: {
      text: getTranslation("languages")
    },
    largeTitle: {
      visible: true
    }
  }
};

export default NoticeDetailScreen;
