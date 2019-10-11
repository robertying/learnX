/* eslint-disable react-hooks/exhaustive-deps */

import React, {useMemo, useState, useCallback, useEffect} from 'react';
import {Dimensions, Platform, View, SafeAreaView} from 'react-native';
import Modal from 'react-native-modal';
import {Navigation} from 'react-native-navigation';
import {
  Route,
  SceneRendererProps,
  TabBar,
  TabView,
} from 'react-native-tab-view';
import {Props} from 'react-native-tab-view/lib/typescript/src/TabBar';
import {connect} from 'react-redux';
import AssignmentBoard from '../components/AssignmentBoard';
import AssignmentsView from '../components/AssignmentsView';
import FilesView from '../components/FilesView';
import NoticeBoard from '../components/NoticeBoard';
import NoticesView from '../components/NoticesView';
import Text from '../components/Text';
import Colors from '../constants/Colors';
import Layout from '../constants/Layout';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import {shareFile, stripExtension} from '../helpers/share';
import {showToast} from '../helpers/toast';
import {getAssignmentsForCourse} from '../redux/actions/assignments';
import {getFilesForCourse} from '../redux/actions/files';
import {getNoticesForCourse} from '../redux/actions/notices';
import {
  IAssignment,
  IFile,
  INotice,
  IPersistAppState,
} from '../redux/types/state';
import {INavigationScreen} from '../types/NavigationScreen';
import {useDarkMode} from 'react-native-dark-mode';

interface ITabRoute {
  readonly key: string;
  readonly title: string;
}

interface ICourseDetailScreenStateProps {
  readonly notices: ReadonlyArray<INotice>;
  readonly files: ReadonlyArray<IFile>;
  readonly assignments: ReadonlyArray<IAssignment>;
  readonly isFetchingNotices: boolean;
  readonly isFetchingFiles: boolean;
  readonly isFetchingAssignments: boolean;
}

interface ICourseDetailScreenDispatchProps {
  readonly getNoticesForCourse: (courseId: string) => void;
  readonly getFilesForCourse: (courseId: string) => void;
  readonly getAssignmentsForCourse: (courseId: string) => void;
}

type ICourseDetailScreenProps = ICourseDetailScreenStateProps &
  ICourseDetailScreenDispatchProps;

const CourseDetailScreen: INavigationScreen<
  ICourseDetailScreenProps & {
    readonly courseId: string;
    readonly courseName: string;
    readonly courseTeacherName: string;
  }
> = props => {
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
    courseId,
  } = props;

  const notices = rawNotices
    .filter(item => item.courseId === courseId)
    .sort((a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix());
  const files = rawFiles
    .filter(item => item.courseId === courseId)
    .sort((a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix());
  const assignments = rawAssignments
    .filter(item => item.courseId === courseId)
    .sort((a, b) => dayjs(b.deadline).unix() - dayjs(a.deadline).unix());

  const [index, setIndex] = useState(0);
  const routes: any = [
    {key: 'notice', title: getTranslation('notices')},
    {key: 'file', title: getTranslation('files')},
    {key: 'assignment', title: getTranslation('assignments')},
  ];

  const [currentModal, setCurrentModal] = useState<{
    readonly type: 'Notice' | 'Assignment';
    readonly data?: INotice | IAssignment | null;
    readonly visible: boolean;
  }>({type: 'Notice', data: null, visible: false});

  const onNoticeCardPress = (noticeId: string) => {
    const notice = notices.find(item => item.id === noticeId);
    setCurrentModal({type: 'Notice', data: notice, visible: true});
  };
  const onFileCardPress = async (
    filename: string,
    url: string,
    ext: string,
  ) => {
    if (Platform.OS === 'ios') {
      Navigation.push(props.componentId, {
        component: {
          name: 'webview',
          passProps: {
            filename: stripExtension(filename),
            url,
            ext,
            pushed: true,
          },
          options: {
            topBar: {
              title: {
                component: {
                  name: 'navigation.title',
                  passProps: {
                    pushed: true,
                    children: stripExtension(filename),
                    style: {
                      fontSize: 17,
                      fontWeight: '500',
                      color: isDarkMode ? 'white' : 'black',
                    },
                  },
                },
              },
            },
          },
        },
      });
    } else {
      showToast(getTranslation('downloadingFile'), 1000);
      const success = await shareFile(url, stripExtension(filename), ext);
      if (!success) {
        showToast(getTranslation('downloadFileFailure'), 3000);
      }
    }
  };
  const onAssignmentCardPress = (assignmentId: string) => {
    const assignment = assignments.find(item => item.id === assignmentId);
    setCurrentModal({type: 'Assignment', data: assignment, visible: true});
  };

  const NoticesRoute = useMemo(
    () => (
      <NoticesView
        isFetching={isFetchingNotices}
        notices={notices}
        onNoticeCardPress={onNoticeCardPress}
        // tslint:disable-next-line: jsx-no-lambda
        onRefresh={() => getNoticesForCourse(courseId)}
      />
    ),
    [notices.length, isFetchingNotices],
  );
  const FilesRoute = useMemo(
    () => (
      <FilesView
        isFetching={isFetchingFiles}
        files={files}
        onFileCardPress={onFileCardPress}
        // tslint:disable-next-line: jsx-no-lambda
        onRefresh={() => getFilesForCourse(courseId)}
      />
    ),
    [files.length, isFetchingFiles],
  );
  const AssignmentsRoute = useMemo(
    () => (
      <AssignmentsView
        isFetching={isFetchingAssignments}
        assignments={assignments}
        onAssignmentCardPress={onAssignmentCardPress}
        // tslint:disable-next-line: jsx-no-lambda
        onRefresh={() => getAssignmentsForCourse(courseId)}
      />
    ),
    [assignments.length, isFetchingAssignments],
  );

  const isDarkMode = useDarkMode();

  useEffect(() => {
    Navigation.mergeOptions(props.componentId, {
      topBar: {
        title: {
          component: {
            name: 'text',
            passProps: {
              children: props.courseName,
              style: {
                fontSize: 17,
                fontWeight: '500',
                color: isDarkMode ? 'white' : 'black',
              },
            },
          },
        },
      },
    });
  }, [isDarkMode, props.componentId]);

  const renderTabBar = useCallback(
    (props: Props<ITabRoute>) => (
      <TabBar
        style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
        indicatorStyle={{
          backgroundColor: isDarkMode ? Colors.purpleDark : Colors.theme,
        }}
        {...props}
        renderLabel={renderLabel}
      />
    ),
    [isDarkMode],
  );

  const renderLabel: Props<ITabRoute>['renderLabel'] = useCallback(
    ({route}) => <Text>{route.title}</Text>,
    [isDarkMode],
  );

  const renderScene = ({
    route,
  }: SceneRendererProps & {
    readonly route: Route;
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
      style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
      <TabView
        navigationState={{index, routes}}
        renderTabBar={renderTabBar as any}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={
          {
            width: Dimensions.get('window').width,
          } as any
        }
      />
      <Modal
        isVisible={currentModal.visible}
        // tslint:disable-next-line: jsx-no-lambda
        onBackdropPress={() =>
          setCurrentModal({type: 'Notice', visible: false})
        }
        backdropColor={isDarkMode ? 'rgba(255,255,255,0.25)' : undefined}
        animationIn="bounceIn"
        animationOut="zoomOut"
        useNativeDriver={true}
        deviceWidth={Layout.window.width}
        deviceHeight={
          Platform.OS === 'android'
            ? Layout.window.height + 100
            : Layout.window.height
        }>
        <View
          style={{
            height: '80%',
            backgroundColor: isDarkMode ? 'black' : 'white',
          }}>
          {currentModal.data && currentModal.type === 'Notice' && (
            <NoticeBoard
              componentId={props.componentId}
              title={(currentModal.data as INotice).title || ''}
              content={(currentModal.data as INotice).content || ''}
              author={(currentModal.data as INotice).publisher || ''}
              publishTime={(currentModal.data as INotice).publishTime || ''}
              attachmentName={
                (currentModal.data as INotice).attachmentName || ''
              }
              attachmentUrl={(currentModal.data as INotice).attachmentUrl || ''}
              // tslint:disable-next-line: jsx-no-lambda
              onTransition={() =>
                Platform.OS === 'ios' &&
                setCurrentModal({type: 'Notice', visible: false})
              }
            />
          )}
          {currentModal.data && currentModal.type === 'Assignment' && (
            <AssignmentBoard
              componentId={props.componentId}
              title={(currentModal.data as IAssignment).title || ''}
              description={(currentModal.data as IAssignment).description || ''}
              deadline={(currentModal.data as IAssignment).deadline}
              attachmentName={
                (currentModal.data as IAssignment).attachmentName || ''
              }
              attachmentUrl={
                (currentModal.data as IAssignment).attachmentUrl || ''
              }
              submittedAttachmentName={
                (currentModal.data as IAssignment).submittedAttachmentName || ''
              }
              submittedAttachmentUrl={
                (currentModal.data as IAssignment).submittedAttachmentUrl || ''
              }
              submitTime={(currentModal.data as IAssignment).submitTime || ''}
              grade={(currentModal.data as IAssignment).grade || NaN}
              gradeContent={
                (currentModal.data as IAssignment).gradeContent || ''
              }
              // tslint:disable-next-line: jsx-no-lambda
              onTransition={() =>
                Platform.OS === 'ios' &&
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
  getNoticesForCourse: (courseId: string) => getNoticesForCourse(courseId),
  getFilesForCourse: (courseId: string) => getFilesForCourse(courseId),
  getAssignmentsForCourse: (courseId: string) =>
    getAssignmentsForCourse(courseId),
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CourseDetailScreen);
