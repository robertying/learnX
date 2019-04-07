import React, { useEffect } from "react";
import { connect } from "react-redux";
import NoticesView from "../components/NoticesView";
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
    navigation
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
    if (initialRouteName === "Notices" && courses && courses.length !== 0) {
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
        content: notice.content
      });
    }
  };

  return (
    <NoticesView
      isFetching={isFetching}
      onRefresh={invalidateAll}
      courses={courses}
      notices={notices}
      onNoticeCardPress={onNoticeCardPress}
    />
  );
};

// tslint:disable-next-line: no-object-mutation
NoticesScreen.navigationOptions = {
  title: "通知"
};

function mapStateToProps(state: IPersistAppState): INoticesScreenStateProps {
  return {
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
