import Fuse from "fuse.js";
import React, { useEffect, useRef, useState } from "react";
import {
  LayoutAnimation,
  ListRenderItem,
  Platform,
  SafeAreaView,
  TextInput,
  View
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import Divider from "../components/Divider";
import EmptyList from "../components/EmptyList";
import NoticesView from "../components/NoticesView";
import SearchBar from "../components/SearchBar";
import SettingsListItem from "../components/SettingsListItem";
import Layout from "../constants/Layout";
import dayjs from "../helpers/dayjs";
import { getTranslation } from "../helpers/i18n";
import {
  getCoursesForSemester,
  setCoursesFilter
} from "../redux/actions/courses";
import {
  getAllNoticesForCourses,
  pinNotice,
  unpinNotice
} from "../redux/actions/notices";
import {
  ICourse,
  INotice,
  IPersistAppState,
  ISemester
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface INoticesScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly loggedIn: boolean;
  readonly semesterId: ISemester;
  readonly courses: ReadonlyArray<ICourse>;
  readonly notices: ReadonlyArray<INotice>;
  readonly isFetching: boolean;
  readonly pinnedNotices: readonly string[];
  readonly hidden: readonly string[];
}

interface INoticesScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllNoticesForCourses: (courseIds: string[]) => void;
  readonly pinNotice: (noticeId: string) => void;
  readonly unpinNotice: (noticeId: string) => void;
  readonly setCoursesFilter: (hidden: string[]) => void;
}

type INoticesScreenProps = INoticesScreenStateProps &
  INoticesScreenDispatchProps;

const NoticesScreen: INavigationScreen<INoticesScreenProps> = props => {
  const {
    loggedIn,
    semesterId,
    courses,
    notices: rawNotices,
    isFetching,
    getCoursesForSemester,
    getAllNoticesForCourses,
    navigation,
    autoRefreshing,
    pinnedNotices,
    pinNotice,
    unpinNotice,
    setCoursesFilter,
    hidden
  } = props;

  const courseIds = courses.map(course => course.id);

  const notices = [...rawNotices]
    .filter(item => !hidden.includes(item.courseId))
    .sort((a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix());

  useEffect(() => {
    if (courses.length === 0 && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId, courses.length]);

  useEffect(() => {
    if (autoRefreshing || notices.length === 0) {
      invalidateAll();
    }
  }, [courses.length]);

  const invalidateAll = () => {
    if (loggedIn && courseIds.length !== 0) {
      getAllNoticesForCourses(courseIds);
    }
  };

  const onNoticeCardPress = (noticeId: string) => {
    const notice = notices.find(item => item.id === noticeId);

    if (notice) {
      navigation.navigate("NoticeDetail", {
        title: notice.title,
        author: notice.publisher,
        content: notice.content,
        attachmentName: notice.attachmentName,
        attachmentUrl: notice.attachmentUrl
      });
    }
  };

  const isSearching = navigation.getParam("isSearching", false);
  const searchBarRef = useRef<TextInput>();
  const [searchResult, setSearchResult] = useState(notices);

  useEffect(() => {
    if (notices.length) {
      setSearchResult(notices);
    }
  }, [notices.length]);

  useEffect(() => {
    if (isSearching) {
      if (searchBarRef.current) {
        searchBarRef.current.focus();
      }
    } else {
      setSearchResult(notices);
    }
  }, [isSearching]);

  const onSearchChange = (text: string) => {
    if (text) {
      const fuse = new Fuse(notices, fuseOptions);
      setSearchResult(fuse.search(text));
    }
  };

  const onPinned = (pin: boolean, noticeId: string) => {
    if (pin) {
      pinNotice(noticeId);
    } else {
      unpinNotice(noticeId);
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
      <NoticesView
        isFetching={isFetching}
        onRefresh={invalidateAll}
        courses={courses}
        notices={searchResult}
        pinnedNotices={pinnedNotices || []}
        onPinned={onPinned}
        onNoticeCardPress={onNoticeCardPress}
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

// tslint:disable-next-line: no-object-mutation
NoticesScreen.navigationOptions = ({ navigation }) => ({
  title: getTranslation("notices"),
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

const fuseOptions = {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ["content", "title", "publisher"]
};

function mapStateToProps(state: IPersistAppState): INoticesScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetching: state.notices.isFetching,
    notices: state.notices.items,
    pinnedNotices: state.notices.pinned,
    hidden: state.courses.hidden || []
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: INoticesScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllNoticesForCourses: (courseIds: string[]) =>
    getAllNoticesForCourses(courseIds),
  pinNotice: (noticeId: string) => pinNotice(noticeId),
  unpinNotice: (noticeId: string) => unpinNotice(noticeId),
  setCoursesFilter: (hidden: string[]) => setCoursesFilter(hidden)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NoticesScreen);
