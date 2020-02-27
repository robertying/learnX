import React, {useMemo, useState, useCallback, useEffect} from 'react';
import {Dimensions, View, SafeAreaView, Text} from 'react-native';
import Modal from 'react-native-modal';
import {
  Route,
  SceneRendererProps,
  TabBar,
  TabView,
  NavigationState,
} from 'react-native-tab-view';
import {useDispatch} from 'react-redux';
import AssignmentBoard from '../components/AssignmentBoard';
import AssignmentView from '../components/AssignmentView';
import FileView from '../components/FileView';
import NoticeBoard from '../components/NoticeBoard';
import NoticeView from '../components/NoticeView';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import {stripExtension} from '../helpers/share';
import {
  getAssignmentsForCourse,
  readAssignment,
} from '../redux/actions/assignments';
import {getFilesForCourse, readFile} from '../redux/actions/files';
import {getNoticesForCourse, readNotice} from '../redux/actions/notices';
import {IAssignment, IFile, INotice, ICourse} from '../redux/types/state';
import {INavigationScreen} from '../types';
import {pushTo} from '../helpers/navigation';
import {IFilePreviewScreenProps} from './FilePreviewScreen';
import {Scene} from 'react-native-tab-view/lib/typescript/src/types';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';
import Snackbar from 'react-native-snackbar';

export interface ICourseDetailScreenProps {
  course: ICourse;
}

const CourseDetailScreen: INavigationScreen<ICourseDetailScreenProps> = props => {
  const {course} = props;

  const colorScheme = useColorScheme();

  const dispatch = useDispatch();
  const rawNotices = useTypedSelector(state => state.notices.items);
  const rawFiles = useTypedSelector(state => state.files.items);
  const rawAssignments = useTypedSelector(state => state.assignments.items);
  const error = useTypedSelector(
    state =>
      state.notices.error || state.assignments.error || state.files.error,
  );
  const isFetchingNotices = useTypedSelector(state => state.notices.isFetching);
  const isFetchingAssignments = useTypedSelector(
    state => state.assignments.isFetching,
  );
  const isFetchingFiles = useTypedSelector(state => state.files.isFetching);

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const notices = useMemo(
    () =>
      rawNotices
        .filter(item => item.courseId === course.id)
        .sort(
          (a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix(),
        ),
    [course, rawNotices],
  );

  const files = useMemo(
    () =>
      rawFiles
        .filter(item => item.courseId === course.id)
        .sort(
          (a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix(),
        ),
    [course, rawFiles],
  );

  const assignments = useMemo(
    () =>
      rawAssignments
        .filter(item => item.courseId === course.id)
        .sort((a, b) => dayjs(b.deadline).unix() - dayjs(a.deadline).unix()),
    [course, rawAssignments],
  );

  const [index, setIndex] = useState(0);
  const routes: Route[] = useMemo(
    () => [
      {
        key: 'notice',
        title: getTranslation('notices') + ` (${notices.length})`,
      },
      {key: 'file', title: getTranslation('files') + ` (${files.length})`},
      {
        key: 'assignment',
        title: getTranslation('assignments') + ` (${assignments.length})`,
      },
    ],
    [assignments.length, files.length, notices.length],
  );

  const [currentModal, setCurrentModal] = useState<
    | {
        type: 'Notice';
        data?: INotice;
        visible: boolean;
      }
    | {
        type: 'Assignment';
        data?: IAssignment;
        visible: boolean;
      }
  >({type: 'Notice', data: undefined, visible: false});

  const onNoticeCardPress = useCallback(
    (notice: INotice) => {
      setCurrentModal({type: 'Notice', data: notice, visible: true});
      dispatch(readNotice(notice.id));
    },
    [dispatch],
  );

  const onFileCardPress = useCallback(
    async (file: IFile) => {
      const stripedFilename = stripExtension(file.title);
      const name = 'webview';
      const passProps: IFilePreviewScreenProps = {
        filename: stripedFilename,
        url: file.downloadUrl,
        ext: file.fileType,
        courseName: course.name,
      };
      const title = stripedFilename;

      pushTo<IFilePreviewScreenProps>(
        name,
        props.componentId,
        passProps,
        title,
        true,
        colorScheme === 'dark',
      );

      dispatch(readFile(file.id));
    },
    [colorScheme, props.componentId, dispatch, course],
  );

  const onAssignmentCardPress = useCallback(
    (assignment: IAssignment) => {
      setCurrentModal({type: 'Assignment', data: assignment, visible: true});
      dispatch(readAssignment(assignment.id));
    },
    [dispatch],
  );

  const NoticesRoute = useMemo(
    () => (
      <NoticeView
        isFetching={isFetchingNotices}
        notices={notices}
        onNoticeCardPress={onNoticeCardPress}
        onRefresh={() => dispatch(getNoticesForCourse(course.id))}
      />
    ),
    [course, isFetchingNotices, notices, onNoticeCardPress, dispatch],
  );

  const FilesRoute = useMemo(
    () => (
      <FileView
        isFetching={isFetchingFiles}
        files={files}
        onFileCardPress={onFileCardPress}
        onRefresh={() => dispatch(getFilesForCourse(course.id))}
      />
    ),
    [course, files, dispatch, isFetchingFiles, onFileCardPress],
  );

  const AssignmentsRoute = useMemo(
    () => (
      <AssignmentView
        isFetching={isFetchingAssignments}
        assignments={assignments}
        onAssignmentCardPress={onAssignmentCardPress}
        onRefresh={() => dispatch(getAssignmentsForCourse(course.id))}
      />
    ),
    [
      assignments,
      course,
      dispatch,
      isFetchingAssignments,
      onAssignmentCardPress,
    ],
  );

  useEffect(() => {
    if (error) {
      Snackbar.show({
        text: getTranslation('refreshFailure'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }
  }, [error]);

  const renderLabel = useCallback(
    ({
      route,
    }: Scene<Route> & {
      focused: boolean;
      color: string;
    }) => (
      <Text style={{color: Colors.system('foreground', colorScheme)}}>
        {route.title}
      </Text>
    ),
    [colorScheme],
  );

  const renderTabBar = useCallback(
    (
      props: SceneRendererProps & {
        navigationState: NavigationState<Route>;
      },
    ) => (
      <TabBar
        style={{backgroundColor: Colors.system('background', colorScheme)}}
        indicatorStyle={{
          backgroundColor: Colors.system('purple', colorScheme),
        }}
        {...props}
        renderLabel={renderLabel}
      />
    ),
    [colorScheme, renderLabel],
  );

  const renderScene = ({
    route,
  }: SceneRendererProps & {
    route: Route;
  }) => {
    switch (route.key) {
      case 'notice':
        return NoticesRoute;
      case 'file':
        return FilesRoute;
      case 'assignment':
        return AssignmentsRoute;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <TabView
        navigationState={{index, routes}}
        renderTabBar={renderTabBar}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{
          width: Dimensions.get('window').width,
        }}
      />
      <Modal
        isVisible={currentModal.visible}
        onBackdropPress={() =>
          setCurrentModal({type: 'Notice', visible: false})
        }
        backdropColor={
          colorScheme === 'dark' ? 'rgba(255,255,255,0.25)' : undefined
        }
        animationIn="bounceIn"
        animationOut="zoomOut"
        useNativeDriver={true}
        hideModalContentWhileAnimating={true}>
        <View
          style={{
            height: '80%',
            backgroundColor: Colors.system('background', colorScheme),
          }}>
          {currentModal.data && currentModal.type === 'Notice' && (
            <NoticeBoard
              componentId={props.componentId}
              title={currentModal.data!.title}
              content={currentModal.data!.content}
              author={currentModal.data!.publisher}
              publishTime={currentModal.data!.publishTime}
              attachmentName={currentModal.data!.attachmentName}
              attachmentUrl={currentModal.data!.attachmentUrl}
              beforeNavigation={() =>
                setCurrentModal({type: 'Notice', visible: false})
              }
            />
          )}
          {currentModal.data && currentModal.type === 'Assignment' && (
            <AssignmentBoard
              componentId={props.componentId}
              title={currentModal.data!.title}
              description={currentModal.data!.description}
              deadline={currentModal.data!.deadline}
              attachmentName={currentModal.data!.attachmentName}
              attachmentUrl={currentModal.data!.attachmentUrl}
              submittedAttachmentName={
                currentModal.data!.submittedAttachmentName
              }
              submittedAttachmentUrl={currentModal.data!.submittedAttachmentUrl}
              submitTime={currentModal.data!.submitTime}
              grade={currentModal.data!.grade}
              gradeContent={currentModal.data!.gradeContent}
              studentHomeworkId={currentModal.data!.studentHomeworkId}
              beforeNavigation={() =>
                setCurrentModal({type: 'Notice', visible: false})
              }
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CourseDetailScreen;
