import React from 'react';
import AssignmentBoard from '../components/AssignmentBoard';
import {INavigationScreen} from '../types';

export interface IAssignmentDetailScreenProps {
  title: string;
  deadline: string;
  description?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  submittedAttachmentName?: string;
  submittedAttachmentUrl?: string;
  submitTime?: string;
  grade?: number;
  gradeLevel?: string;
  gradeContent?: string;
  courseName?: string;
}

const AssignmentDetailScreen: INavigationScreen<
  IAssignmentDetailScreenProps
> = props => {
  return <AssignmentBoard {...props} />;
};

export default AssignmentDetailScreen;
