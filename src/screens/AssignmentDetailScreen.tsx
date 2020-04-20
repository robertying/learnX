import React, {useEffect} from 'react';
import {useColorScheme} from 'react-native';
import AssignmentBoard from '../components/AssignmentBoard';
import {INavigationScreen} from '../types';
import {adaptToSystemTheme} from '../helpers/darkmode';

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
  courseName: string;
  studentHomeworkId: string;
  submittedContent?: string;
}

const AssignmentDetailScreen: INavigationScreen<IAssignmentDetailScreenProps> = (
  props,
) => {
  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  return <AssignmentBoard {...props} />;
};

export default AssignmentDetailScreen;
