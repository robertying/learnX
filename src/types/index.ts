import {LayoutComponent} from 'react-native-navigation';
import {INotice, IFile, IAssignment} from '../redux/types/state';

export type INavigationScreen<P> = React.FC<P & {componentId: string}> &
  LayoutComponent;

export type WithCourseInfo<T> = T & {
  courseName: string;
  courseTeacherName: string;
};

export type IEntity =
  | WithCourseInfo<INotice>
  | WithCourseInfo<IFile>
  | WithCourseInfo<IAssignment>;
