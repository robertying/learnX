import React from "react";
import AssignmentBoard from "../components/AssignmentBoard";
import { getTranslation } from "../helpers/i18n";
import { INavigationScreen } from "../types/NavigationScreen";

interface IAssignmentDetailScreenProps {
  readonly title: string;
  readonly description: string;
  readonly deadline: string;
}

const AssignmentDetailScreen: INavigationScreen<
  IAssignmentDetailScreenProps
> = props => {
  const { navigation } = props;
  const title = navigation.getParam("title");
  const deadline = navigation.getParam("deadline");
  const description = navigation.getParam("description");
  const attachmentName = navigation.getParam("attachmentName");
  const attachmentUrl = navigation.getParam("attachmentUrl");
  const submittedAttachmentName = navigation.getParam(
    "submittedAttachmentName"
  );
  const submittedAttachmentUrl = navigation.getParam("submittedAttachmentUrl");
  const submitTime = navigation.getParam("submitTime");
  const grade = navigation.getParam("grade");
  const gradeContent = navigation.getParam("gradeContent");

  return (
    <AssignmentBoard
      title={title}
      description={description}
      deadline={deadline}
      attachmentName={attachmentName}
      attachmentUrl={attachmentUrl}
      submittedAttachmentName={submittedAttachmentName}
      submittedAttachmentUrl={submittedAttachmentUrl}
      submitTime={submitTime}
      grade={grade}
      gradeContent={gradeContent}
    />
  );
};

// tslint:disable-next-line: no-object-mutation
AssignmentDetailScreen.navigationOptions = {
  title: getTranslation("detail")
};

export default AssignmentDetailScreen;
