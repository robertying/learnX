import Fuse from "fuse.js";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  ListRenderItem,
  Platform,
  SafeAreaView,
  TextInput,
  View
} from "react-native";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import Divider from "../components/Divider";
import EmptyList from "../components/EmptyList";
import FilesView from "../components/FilesView";
import SearchBar from "../components/SearchBar";
import SettingsListItem from "../components/SettingsListItem";
import Layout from "../constants/Layout";
import dayjs from "../helpers/dayjs";
import { getTranslation } from "../helpers/i18n";
import { shareFile, stripExtension } from "../helpers/share";
import {
  getCoursesForSemester,
  setCoursesFilter
} from "../redux/actions/courses";
import {
  getAllFilesForCourses,
  pinFile,
  unpinFile
} from "../redux/actions/files";
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
  readonly pinnedFiles: readonly string[];
  readonly hidden: readonly string[];
}

interface IFilesScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllFilesForCourses: (courseIds: string[]) => void;
  readonly showToast: (text: string, duration: number) => void;
  readonly pinFile: (fileId: string) => void;
  readonly unpinFile: (fileId: string) => void;
  readonly setCoursesFilter: (hidden: string[]) => void;
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
    showToast,
    pinFile,
    pinnedFiles,
    unpinFile,
    hidden,
    setCoursesFilter
  } = props;

  const courseIds = courses.map(course => course.id);

  const files = [...rawFiles]
    .filter(item => !hidden.includes(item.courseId))
    .sort((a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix());

  useEffect(() => {
    if (courses.length === 0 && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId, courses.length]);

  useEffect(() => {
    if (autoRefreshing || files.length === 0) {
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

  const isSearching = navigation.getParam("isSearching", false);
  const searchBarRef = useRef<TextInput>();
  const [searchResult, setSearchResult] = useState(files);

  useEffect(() => {
    if (files.length) {
      setSearchResult(files);
    }
  }, [files.length]);

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

  const onPinned = (pin: boolean, fileId: string) => {
    if (pin) {
      pinFile(fileId);
    } else {
      unpinFile(fileId);
    }
  };

  const modalVisible = navigation.getParam("filterModalVisible");

  const renderListItem: ListRenderItem<ICourse> = ({ item }) => {
    return (
      <SettingsListItem
        variant="none"
        text={item.name}
        icon={hidden.includes(item.id) ? null : <Icon name="check" size={20} />}
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() =>
          hidden.includes(item.id)
            ? setCoursesFilter(hidden.filter(hid => hid !== item.id))
            : setCoursesFilter([...hidden, item.id])
        }
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

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
        pinnedFiles={pinnedFiles || []}
        onPinned={onPinned}
      />
      <Modal
        style={{
          margin: 0,
          marginTop: Platform.OS === "android" ? 0 : Layout.statusBarHeight
        }}
        isVisible={modalVisible}
        backdropColor="transparent"
        swipeDirection="down"
        // tslint:disable-next-line: jsx-no-lambda
        onSwipeComplete={() =>
          navigation.setParams({ filterModalVisible: false })
        }
      >
        <View style={{ flex: 1, backgroundColor: "white" }}>
          <Icon.Button
            style={{ margin: 10 }}
            name="close"
            // tslint:disable-next-line: jsx-no-lambda
            onPress={() => {
              navigation.setParams({ filterModalVisible: false });
            }}
            color="black"
            size={24}
            backgroundColor="transparent"
            underlayColor="transparent"
            activeOpacity={0.6}
          />
          <FlatList
            ListEmptyComponent={EmptyList}
            ItemSeparatorComponent={Divider}
            data={courses}
            renderItem={renderListItem}
            keyExtractor={keyExtractor}
          />
        </View>
      </Modal>
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
  title: getTranslation("files"),
  headerLeft: (
    <Icon.Button
      style={{ marginLeft: 10 }}
      name="filter-list"
      // tslint:disable-next-line: jsx-no-lambda
      onPress={() => {
        navigation.setParams({
          filterModalVisible: true
        });
      }}
      color="white"
      size={24}
      backgroundColor="transparent"
      underlayColor="transparent"
      activeOpacity={0.6}
    />
  ),
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
      size={24}
      backgroundColor="transparent"
      underlayColor="transparent"
      activeOpacity={0.6}
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
    files: state.files.items,
    pinnedFiles: state.files.pinned,
    hidden: state.courses.hidden || []
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: IFilesScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllFilesForCourses: (courseIds: string[]) =>
    getAllFilesForCourses(courseIds),
  showToast: (text: string, duration: number) => showToast(text, duration),
  pinFile: (fileId: string) => pinFile(fileId),
  unpinFile: (fileId: string) => unpinFile(fileId),
  setCoursesFilter: (hidden: string[]) => setCoursesFilter(hidden)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FilesScreen);
