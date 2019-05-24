import React, { useMemo, useState } from "react";
import { Dimensions, Platform, View } from "react-native";
import Modal from "react-native-modal";
import {
  Route,
  SceneRendererProps,
  TabBar,
  TabView
} from "react-native-tab-view";
import { Props } from "react-native-tab-view/lib/typescript/src/TabBar";
import { connect } from "react-redux";
import AssignmentBoard from "../components/AssignmentBoard";
import AssignmentsView from "../components/AssignmentsView";
import DoubleHeaderTitle from "../components/DoubleHeaderTitle";
import FilesView from "../components/FilesView";
import NoticeBoard from "../components/NoticeBoard";
import NoticesView from "../components/NoticesView";
import Text from "../components/Text";
import Colors from "../constants/Colors";
import Layout from "../constants/Layout";
import dayjs from "../helpers/dayjs";
import { getLocale, getTranslation } from "../helpers/i18n";
import { shareFile, stripExtension } from "../helpers/share";
import { getAssignmentsForCourse } from "../redux/actions/assignments";
import { getFilesForCourse } from "../redux/actions/files";
import { getNoticesForCourse } from "../redux/actions/notices";
import { showToast } from "../redux/actions/toast";
import {
  IAssignment,
  IFile,
  INotice,
  IPersistAppState,
  IWindow
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ITabRoute {
  readonly key: string;
  readonly title: string;
}

const renderTabBar = (props: Props<ITabRoute>) => (
  <TabBar
    {...props}
    indicatorStyle={{ backgroundColor: Colors.tint }}
    style={{ backgroundColor: "white" }}
    renderLabel={renderLabel}
  />
);

const renderLabel: Props<ITabRoute>["renderLabel"] = ({ route }) => (
  <Text style={{ color: "black" }}>{route.title}</Text>
);

interface ICourseDetailScreenStateProps {
  readonly notices: ReadonlyArray<INotice>;
  readonly files: ReadonlyArray<IFile>;
  readonly assignments: ReadonlyArray<IAssignment>;
  readonly isFetchingNotices: boolean;
  readonly isFetchingFiles: boolean;
  readonly isFetchingAssignments: boolean;
  readonly window: IWindow;
}

interface ICourseDetailScreenDispatchProps {
  readonly getNoticesForCourse: (courseId: string) => void;
  readonly getFilesForCourse: (courseId: string) => void;
  readonly getAssignmentsForCourse: (courseId: string) => void;
  readonly showToast: (text: string, duration: number) => void;
}

type ICourseDetailScreenProps = ICourseDetailScreenStateProps &
  ICourseDetailScreenDispatchProps;

const CourseDetailScreen: INavigationScreen<
  ICourseDetailScreenProps
> = props => {
  const {
    navigation,
    notices: rawNotices,
    files: rawFiles,
    assignments: rawAssignments,
    showToast,
    isFetchingAssignments,
    isFetchingFiles,
    isFetchingNotices,
    getAssignmentsForCourse,
    getFilesForCourse,
    getNoticesForCourse,
    window
  } = props;

  const courseId = navigation.getParam("courseId");

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
    { key: "notice", title: getTranslation("notices") },
    { key: "file", title: getTranslation("files") },
    { key: "assignment", title: getTranslation("assignments") }
  ];

  const [currentModal, setCurrentModal] = useState<{
    readonly type: "Notice" | "Assignment";
    readonly data?: INotice | IAssignment | null;
    readonly visible: boolean;
  }>({ type: "Notice", data: null, visible: false });

  const onNoticeCardPress = (noticeId: string) => {
    const notice = notices.find(item => item.id === noticeId);
    setCurrentModal({ type: "Notice", data: notice, visible: true });
  };
  const onFileCardPress = async (
    filename: string,
    url: string,
    ext: string
  ) => {
    if (Platform.OS === "ios") {
      navigation.navigate("WebView", {
        title: stripExtension(filename),
        filename: stripExtension(filename),
        url,
        ext
      });
    } else {
      showToast(getTranslation("downloadingFile"), 1000);
      const success = await shareFile(url, stripExtension(filename), ext);
      if (!success) {
        showToast(getTranslation("downloadFileFailure"), 3000);
      }
    }
  };
  const onAssignmentCardPress = (assignmentId: string) => {
    const assignment = assignments.find(item => item.id === assignmentId);
    setCurrentModal({ type: "Assignment", data: assignment, visible: true });
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
    [notices.length, isFetchingNotices]
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
    [files.length, isFetchingFiles]
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
    [assignments.length, isFetchingAssignments]
  );

  const renderScene = ({
    route
  }: SceneRendererProps & {
    readonly route: Route;
  }) => {
    switch (route.key) {
      case "notice":
        return NoticesRoute;
      case "file":
        return FilesRoute;
      case "assignment":
        return AssignmentsRoute;
      default:
        return null;
    }
  };

  return (
    <>
      <TabView
        navigationState={{ index, routes }}
        renderTabBar={renderTabBar as any}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={
          {
            width: Dimensions.get("window").width
          } as any
        }
      />
      <Modal
        isVisible={currentModal.visible}
        // tslint:disable-next-line: jsx-no-lambda
        onBackdropPress={() =>
          setCurrentModal({ type: "Notice", visible: false })
        }
        animationIn="bounceIn"
        animationOut="zoomOut"
        useNativeDriver={true}
        deviceWidth={
          Platform.OS === "android" ? Layout.window().width : window.width
        }
        deviceHeight={
          Platform.OS === "android" ? Layout.window().height : window.height
        }
      >
        <View style={{ height: "80%", backgroundColor: "white" }}>
          {currentModal.data && currentModal.type === "Notice" && (
            <NoticeBoard
              title={(currentModal.data as INotice).title || ""}
              content={(currentModal.data as INotice).content || ""}
              author={(currentModal.data as INotice).publisher || ""}
              attachmentName={
                (currentModal.data as INotice).attachmentName || ""
              }
              attachmentUrl={(currentModal.data as INotice).attachmentUrl || ""}
              // tslint:disable-next-line: jsx-no-lambda
              onTransition={() =>
                setCurrentModal({ type: "Notice", visible: false })
              }
            />
          )}
          {currentModal.data && currentModal.type === "Assignment" && (
            <AssignmentBoard
              title={(currentModal.data as IAssignment).title || ""}
              description={(currentModal.data as IAssignment).description || ""}
              deadline={
                getLocale().startsWith("zh")
                  ? dayjs((currentModal.data as IAssignment).deadline).format(
                      "llll"
                    ) + " 截止"
                  : "Submission close on " +
                    dayjs((currentModal.data as IAssignment).deadline).format(
                      "llll"
                    )
              }
              attachmentName={
                (currentModal.data as IAssignment).attachmentName || ""
              }
              attachmentUrl={
                (currentModal.data as IAssignment).attachmentUrl || ""
              }
              submittedAttachmentName={
                (currentModal.data as IAssignment).submittedAttachmentName || ""
              }
              submittedAttachmentUrl={
                (currentModal.data as IAssignment).submittedAttachmentUrl || ""
              }
              submitTime={(currentModal.data as IAssignment).submitTime || ""}
              grade={(currentModal.data as IAssignment).grade || NaN}
              gradeContent={
                (currentModal.data as IAssignment).gradeContent || ""
              }
              // tslint:disable-next-line: jsx-no-lambda
              onTransition={() =>
                setCurrentModal({ type: "Notice", visible: false })
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
};

// tslint:disable-next-line: no-object-mutation
CourseDetailScreen.navigationOptions = ({ navigation }) => {
  return {
    headerTitle: (
      <DoubleHeaderTitle
        title={navigation.getParam("courseName", "课程")}
        subtitle={navigation.getParam("courseTeacherName", "教师")}
      />
    ),
    headerBackTitle:
      navigation.getParam("courseName", "课程").substring(0, 3) + "...",
    headerTruncatedBackTitle:
      navigation.getParam("courseName", "课程").substring(0, 3) + "..."
  };
};

function mapStateToProps(
  state: IPersistAppState
): ICourseDetailScreenStateProps {
  return {
    notices: state.notices.items,
    files: state.files.items,
    assignments: state.assignments.items,
    isFetchingNotices: state.notices.isFetching,
    isFetchingFiles: state.files.isFetching,
    isFetchingAssignments: state.assignments.isFetching,
    window: state.settings.window || Dimensions.get("window")
  };
}

const mapDispatchToProps: ICourseDetailScreenDispatchProps = {
  getNoticesForCourse: (courseId: string) => getNoticesForCourse(courseId),
  getFilesForCourse: (courseId: string) => getFilesForCourse(courseId),
  getAssignmentsForCourse: (courseId: string) =>
    getAssignmentsForCourse(courseId),
  showToast: (text: string, duration: number) => showToast(text, duration)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CourseDetailScreen);
