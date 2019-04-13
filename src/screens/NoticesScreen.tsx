import Fuse from "fuse.js";
import React, { useEffect, useRef, useState } from "react";
import { LayoutAnimation, SafeAreaView, TextInput } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import NoticesView from "../components/NoticesView";
import SearchBar from "../components/SearchBar";
import dayjs from "../helpers/dayjs";
import { initialRouteName } from "../navigation/MainTabNavigator";
import { getCoursesForSemester } from "../redux/actions/courses";
import { getAllNoticesForCourses } from "../redux/actions/notices";
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
}

interface INoticesScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllNoticesForCourses: (courseIds: string[]) => void;
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
    autoRefreshing
  } = props;

  const courseIds = courses.map(course => course.id);

  const notices = [...rawNotices].sort(
    (a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix()
  );

  useEffect(() => {
    if (initialRouteName === "Notices" && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId]);

  useEffect(() => {
    if (initialRouteName === "Notices") {
      invalidateAll();
    }
  }, [courses.length]);

  useEffect(() => {
    if (initialRouteName !== "Notices" && autoRefreshing) {
      invalidateAll();
    }
  }, []);

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
        content: notice.content
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
        onNoticeCardPress={onNoticeCardPress}
      />
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
NoticesScreen.navigationOptions = ({ navigation }) => ({
  title: "通知",
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
    notices: state.notices.items
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: INoticesScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllNoticesForCourses: (courseIds: string[]) =>
    getAllNoticesForCourses(courseIds)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NoticesScreen);
