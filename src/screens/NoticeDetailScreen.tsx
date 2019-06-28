import React from "react";
import { connect } from "react-redux";
import NoticeBoard from "../components/NoticeBoard";
import { INavigationScreen } from "../types/NavigationScreen";

interface INoticeDetailScreenProps {
  readonly title: string;
  readonly author: string;
  readonly content: string;
  readonly publishTime: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
}

const NoticeDetailScreen: INavigationScreen<
  INoticeDetailScreenProps
> = props => {
  return <NoticeBoard {...props} />;
};

export default connect()(NoticeDetailScreen);
