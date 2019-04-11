import React, { useEffect } from "react";
import { Platform } from "react-native";
import { connect } from "react-redux";
import FilesView from "../components/FilesView";
import dayjs from "../helpers/dayjs";
import { shareFile } from "../helpers/share";
import { initialRouteName } from "../navigation/MainTabNavigator";
import { getCoursesForSemester } from "../redux/actions/courses";
import { getAllFilesForCourses } from "../redux/actions/files";
import { showToast } from "../redux/actions/toast";
import {
  ICourse,
  IFile,
  IPersistAppState,
  ISemester
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface IFilesScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly loggedIn: boolean;
  readonly semesterId: ISemester;
  readonly courses: ReadonlyArray<ICourse>;
  readonly files: ReadonlyArray<IFile>;
  readonly isFetching: boolean;
}

interface IFilesScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllFilesForCourses: (courseIds: string[]) => void;
  readonly showToast: (text: string, duration: number) => void;
}

type IFilesScreenProps = IFilesScreenStateProps & IFilesScreenDispatchProps;

const FilesScreen: INavigationScreen<IFilesScreenProps> = props => {
  const {
    loggedIn,
    semesterId,
    courses,
    files: rawFiles,
    isFetching,
    getCoursesForSemester,
    getAllFilesForCourses,
    navigation,
    autoRefreshing,
    showToast
  } = props;

  const courseIds = courses.map(course => course.id);

  const files = [...rawFiles].sort(
    (a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix()
  );

  useEffect(() => {
    if (initialRouteName === "Files" && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId]);

  useEffect(() => {
    if (initialRouteName === "Files") {
      invalidateAll();
    }
  }, [courses.length]);

  useEffect(() => {
    if (initialRouteName !== "Files" && autoRefreshing) {
      invalidateAll();
    }
  }, []);

  const invalidateAll = () => {
    if (loggedIn && courseIds.length !== 0) {
      getAllFilesForCourses(courseIds);
    }
  };

  const onFileCardPress = async (
    filename: string,
    url: string,
    ext: string
  ) => {
    if (Platform.OS === "ios") {
      navigation.navigate("WebView", {
        filename,
        url,
        ext
      });
    } else {
      showToast("文件下载中……", 3000);
      const success = await shareFile(url, ext);
      if (!success) {
        showToast("文件下载失败", 3000);
      }
    }
  };

  return (
    <FilesView
      isFetching={isFetching}
      onRefresh={invalidateAll}
      courses={courses}
      files={files}
      onFileCardPress={onFileCardPress}
    />
  );
};

// tslint:disable-next-line: no-object-mutation
FilesScreen.navigationOptions = {
  title: "文件"
};

function mapStateToProps(state: IPersistAppState): IFilesScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetching: state.files.isFetching,
    files: state.files.items
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: IFilesScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllFilesForCourses: (courseIds: string[]) =>
    getAllFilesForCourses(courseIds),
  showToast: (text: string, duration: number) => showToast(text, duration)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FilesScreen);
