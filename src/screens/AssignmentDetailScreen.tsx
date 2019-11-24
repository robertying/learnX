import React, {useEffect} from 'react';
import AssignmentBoard from '../components/AssignmentBoard';
import {INavigationScreen} from '../types';
import {useDarkMode} from 'react-native-dark-mode';
import {androidAdaptToSystemTheme} from '../helpers/darkmode';

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

const AssignmentDetailScreen: INavigationScreen<IAssignmentDetailScreenProps> = props => {
  const isDarkMode = useDarkMode();

  useEffect(() => {
    androidAdaptToSystemTheme(props.componentId, isDarkMode, true);
  }, [isDarkMode, props.componentId]);

  return <AssignmentBoard {...props} />;
};

export default AssignmentDetailScreen;
