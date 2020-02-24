import React, {useMemo, useState, useCallback, useEffect} from 'react';
import {Dimensions, Platform, View, SafeAreaView, Text} from 'react-native';
import Modal from 'react-native-modal';
import {
  Route,
  SceneRendererProps,
  TabBar,
  TabView,
  NavigationState,
} from 'react-native-tab-view';
import {connect} from 'react-redux';
import AssignmentBoard from '../components/AssignmentBoard';
import AssignmentView from '../components/AssignmentView';
import FileView from '../components/FileView';
import NoticeBoard from '../components/NoticeBoard';
import NoticeView from '../components/NoticeView';
import Colors from '../constants/Colors';
import Layout from '../constants/Layout';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import {stripExtension} from '../helpers/share';
import {getAssignmentsForCourse} from '../redux/actions/assignments';
import {getFilesForCourse} from '../redux/actions/files';
import {getNoticesForCourse} from '../redux/actions/notices';
import {
  IAssignment,
  IFile,
  INotice,
  IPersistAppState,
  ICourse,
} from '../redux/types/state';
import {INavigationScreen} from '../types';
import {pushTo} from '../helpers/navigation';
import {IFilePreviewScreenProps} from './FilePreviewScreen';
import {Scene} from 'react-native-tab-view/lib/typescript/src/types';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';

interface ICourseDetailScreenStateProps {
  course?: ICourse;
  notices: INotice[];
  files: IFile[];
  assignments: IAssignment[];
  isFetchingNotices: boolean;
  isFetchingFiles: boolean;
  isFetchingAssignments: boolean;
}

interface ICourseDetailScreenDispatchProps {
  getNoticesForCourse: (courseId: string) => void;
  getFilesForCourse: (courseId: string) => void;
  getAssignmentsForCourse: (courseId: string) => void;
}

export type ICourseDetailScreenProps = ICourseDetailScreenStateProps &
  ICourseDetailScreenDispatchProps;

const CourseDetailScreen: INavigationScreen<ICourseDetailScreenProps> = props => {
  const {
    notices: rawNotices,
    files: rawFiles,
    assignments: rawAssignments,
    isFetchingAssignments,
    isFetchingFiles,
    isFetchingNotices,
    getAssignmentsForCourse,
    getFilesForCourse,
    getNoticesForCourse,
    course,
  } = props;

  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme, true);
  }, [colorScheme, props.componentId]);

  const notices = useMemo(
    () =>
      rawNotices
        .filter(item => item.courseId === course!.id)
        .sort(
          (a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix(),
        ),
    [course, rawNotices],
  );

  const files = useMemo(
    () =>
      rawFiles
        .filter(item => item.courseId === course!.id)
        .sort(
          (a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix(),
        ),
    [course, rawFiles],
  );

  const assignments = useMemo(
    () =>
      rawAssignments
        .filter(item => item.courseId === course!.id)
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

  const onNoticeCardPress = useCallback((notice: INotice) => {
    setCurrentModal({type: 'Notice', data: notice, visible: true});
  }, []);

  const onFileCardPress = useCallback(
    async (file: IFile) => {
      const stripedFilename = stripExtension(file.title);
      const name = 'webview';
      const passProps = {
        filename: stripedFilename,
        url: file.downloadUrl,
        ext: file.fileType,
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
    },
    [colorScheme, props.componentId],
  );

  const onAssignmentCardPress = useCallback((assignment: IAssignment) => {
    setCurrentModal({type: 'Assignment', data: assignment, visible: true});
  }, []);

  const NoticesRoute = useMemo(
    () => (
      <NoticeView
        isFetching={isFetchingNotices}
        notices={notices}
        onNoticeCardPress={onNoticeCardPress}
        onRefresh={() => getNoticesForCourse(course!.id)}
      />
    ),
    [
      course,
      getNoticesForCourse,
      isFetchingNotices,
      notices,
      onNoticeCardPress,
    ],
  );

  const FilesRoute = useMemo(
    () => (
      <FileView
        isFetching={isFetchingFiles}
        files={files}
        onFileCardPress={onFileCardPress}
        onRefresh={() => getFilesForCourse(course!.id)}
      />
    ),
    [course, files, getFilesForCourse, isFetchingFiles, onFileCardPress],
  );

  const AssignmentsRoute = useMemo(
    () => (
      <AssignmentView
        isFetching={isFetchingAssignments}
        assignments={assignments}
        onAssignmentCardPress={onAssignmentCardPress}
        onRefresh={() => getAssignmentsForCourse(course!.id)}
      />
    ),
    [
      assignments,
      course,
      getAssignmentsForCourse,
      isFetchingAssignments,
      onAssignmentCardPress,
    ],
  );

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
        deviceWidth={Layout.initialWindow.width}
        deviceHeight={
          Platform.OS === 'android'
            ? Layout.initialWindow.height + 100
            : Layout.initialWindow.height
        }>
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

function mapStateToProps(
  state: IPersistAppState,
): ICourseDetailScreenStateProps {
  return {
    notices: state.notices.items,
    files: state.files.items,
    assignments: state.assignments.items,
    isFetchingNotices: state.notices.isFetching,
    isFetchingFiles: state.files.isFetching,
    isFetchingAssignments: state.assignments.isFetching,
  };
}

const mapDispatchToProps: ICourseDetailScreenDispatchProps = {
  getNoticesForCourse,
  getFilesForCourse,
  getAssignmentsForCourse,
};

export default connect(mapStateToProps, mapDispatchToProps)(CourseDetailScreen);
