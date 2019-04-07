import React from "react";
import NoticeBoard from "../components/NoticeBoard";
import { INavigationScreen } from "../types/NavigationScreen";

interface IAssignmentDetailScreenProps {
  readonly title: string;
  readonly author: string;
  readonly content: string;
}

const AssignmentDetailScreen: INavigationScreen<
  IAssignmentDetailScreenProps
> = props => {
  const { navigation } = props;
  const title = navigation.getParam("title");
  const content = navigation.getParam("content");
  const deadline = navigation.getParam("deadline");

  return <NoticeBoard title={title} content={content} author={deadline} />;
};

// tslint:disable-next-line: no-object-mutation
AssignmentDetailScreen.navigationOptions = {
  title: "详情"
};

export default AssignmentDetailScreen;
