import React, { useMemo, useState } from "react";
import { Dimensions, Platform, View } from "react-native";
import Modal from "react-native-modal";
import {
  Scene,
  SceneRendererProps,
  TabBar,
  TabBarProps,
  TabView,
  TabViewProps
} from "react-native-tab-view";
import { connect } from "react-redux";
import AssignmentsView from "../components/AssignmentsView";
import DoubleHeaderTitle from "../components/DoubleHeaderTitle";
import FilesView from "../components/FilesView";
import NoticeBoard from "../components/NoticeBoard";
import NoticesView from "../components/NoticesView";
import Text from "../components/Text";
import Colors from "../constants/Colors";
import dayjs from "../helpers/dayjs";
import { shareFile } from "../helpers/share";
import { showToast } from "../redux/actions/toast";
import {
  IAssignment,
  IFile,
  INotice,
  IPersistAppState
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ITabRoute {
  readonly key: string;
  readonly title: string;
}

const renderTabBar: TabViewProps<ITabRoute>["renderTabBar"] = props => (
  <TabBar
    {...props}
    indicatorStyle={{ backgroundColor: Colors.tint }}
    style={{ backgroundColor: "white" }}
    renderLabel={renderLabel}
  />
);

const renderLabel: TabBarProps<ITabRoute>["renderLabel"] = ({ route }) => (
  <Text style={{ color: "black" }}>{route.title}</Text>
);

interface ICourseDetailScreenProps {
  readonly notices: ReadonlyArray<INotice>;
  readonly files: ReadonlyArray<IFile>;
  readonly assignments: ReadonlyArray<IAssignment>;
}

const CourseDetailScreen: INavigationScreen<
  ICourseDetailScreenProps
> = props => {
  const {
    navigation,
    notices: rawNotices,
    files: rawFiles,
    assignments: rawAssignments
  } = props;

  const courseId = navigation.getParam("courseId");

  const notices = rawNotices.filter(item => item.courseId === courseId);
  const files = rawFiles.filter(item => item.courseId === courseId);
  const assignments = rawAssignments.filter(item => item.courseId === courseId);

  const [index, setIndex] = useState(0);
  const routes: any = [
    { key: "notice", title: "通知" },
    { key: "file", title: "文件" },
    { key: "assignment", title: "作业" }
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
        filename,
        url
      });
    } else {
      showToast("文件下载中……", 1500);
      const success = await shareFile(url, ext);
      if (!success) {
        showToast("文件下载失败", 1500);
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
        isFetching={false}
        notices={notices}
        onNoticeCardPress={onNoticeCardPress}
      />
    ),
    [notices.length, onNoticeCardPress]
  );
  const FilesRoute = useMemo(
    () => (
      <FilesView
        isFetching={false}
        files={files}
        onFileCardPress={onFileCardPress}
      />
    ),
    [files.length]
  );
  const AssignmentsRoute = useMemo(
    () => (
      <AssignmentsView
        isFetching={false}
        assignments={assignments}
        onAssignmentCardPress={onAssignmentCardPress}
      />
    ),
    [assignments.length]
  );

  const renderScene = ({ route }: SceneRendererProps<any> & Scene<any>) => {
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
      >
        <View style={{ height: "80%", backgroundColor: "white" }}>
          {currentModal.data && currentModal.type === "Notice" && (
            <NoticeBoard
              title={(currentModal.data as INotice).title || ""}
              content={(currentModal.data as INotice).content || ""}
              author={(currentModal.data as INotice).publisher || ""}
            />
          )}
          {currentModal.data && currentModal.type === "Assignment" && (
            <NoticeBoard
              title={(currentModal.data as IAssignment).title || ""}
              content={(currentModal.data as IAssignment).description || ""}
              author={
                dayjs((currentModal.data as IAssignment).deadline).format(
                  "llll"
                ) + " 截止"
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
    headerBackTitle: navigation.getParam("courseName", "课程"),
    headerTruncatedBackTitle:
      navigation.getParam("courseName", "课程").substring(0, 5) + "..."
  };
};

const mapStateToProps = (state: IPersistAppState) => ({
  notices: state.notices.items,
  files: state.files.items,
  assignments: state.assignments.items
});

export default connect(
  mapStateToProps,
  null
)(CourseDetailScreen);
