import Fuse from "fuse.js";
import React, { useEffect, useRef, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  SafeAreaView,
  TextInput
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import FilesView from "../components/FilesView";
import SearchBar from "../components/SearchBar";
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

  const isSearching = navigation.getParam("isSearching", false);
  const searchBarRef = useRef<TextInput>();
  const [searchResult, setSearchResult] = useState(files);

  useEffect(() => {
    if (isSearching) {
      if (searchBarRef.current) {
        searchBarRef.current.focus();
      }
    } else {
      setSearchResult(files);
    }
  }, [isSearching]);

  const onSearchChange = (text: string) => {
    if (text) {
      const fuse = new Fuse(files, fuseOptions);
      setSearchResult(fuse.search(text));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {isSearching && (
        <SearchBar
          ref={searchBarRef as any}
          // tslint:disable-next-line: jsx-no-lambda
          onCancel={() => {
            LayoutAnimation.easeInEaseOut();
            navigation.setParams({ isSearching: false });
          }}
          onChangeText={onSearchChange}
        />
      )}
      <FilesView
        isFetching={isFetching}
        onRefresh={invalidateAll}
        courses={courses}
        files={searchResult}
        onFileCardPress={onFileCardPress}
      />
    </SafeAreaView>
  );
};

const fuseOptions = {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ["description", "fileType", "title"]
};

// tslint:disable-next-line: no-object-mutation
FilesScreen.navigationOptions = ({ navigation }) => ({
  title: "文件",
  headerRight: (
    <Icon.Button
      name="search"
      // tslint:disable-next-line: jsx-no-lambda
      onPress={() => {
        LayoutAnimation.easeInEaseOut();
        navigation.setParams({
          isSearching: !navigation.getParam("isSearching", false)
        });
      }}
      color="white"
      backgroundColor="transparent"
      underlayColor="transparent"
    />
  )
});

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
