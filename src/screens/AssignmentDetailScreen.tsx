import React from "react";
import AssignmentBoard from "../components/AssignmentBoard";
import { getTranslation } from "../helpers/i18n";
import { NavigationScreen } from "../types/NavigationScreen";

interface IAssignmentDetailScreenProps {
  readonly title: string;
  readonly description: string;
  readonly deadline: string;
}

const AssignmentDetailScreen: NavigationScreen<
  IAssignmentDetailScreenProps
> = props => {
  return <AssignmentBoard {...props} />;
};

// tslint:disable-next-line: no-object-mutation
AssignmentDetailScreen.options = {
  topBar: {
    title: {
      text: getTranslation("Detail")
    },
    largeTitle: {
      visible: true
    }
  }
};

export default AssignmentDetailScreen;
