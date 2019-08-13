import React from 'react';
import {connect} from 'react-redux';
import AssignmentBoard from '../components/AssignmentBoard';
import {INavigationScreen} from '../types/NavigationScreen';

export interface IAssignmentDetailScreenProps {
  readonly title: string;
  readonly deadline: string;
  readonly description?: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
  readonly submittedAttachmentName?: string;
  readonly submittedAttachmentUrl?: string;
  readonly submitTime?: string;
  readonly grade?: number;
  readonly gradeLevel?: string;
  readonly gradeContent?: string;
}

const AssignmentDetailScreen: INavigationScreen<
  IAssignmentDetailScreenProps
> = props => {
  return <AssignmentBoard {...props} />;
};

export default connect()(AssignmentDetailScreen);
