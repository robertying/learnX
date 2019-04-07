import React from "react";
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView
} from "react-native";
import Colors from "../constants/Colors";
import { ICourse, INotice } from "../redux/types/state";
import Divider from "./Divider";
import NoticeCard from "./NoticeCard";

export interface INoticesViewProps {
  readonly courses?: ReadonlyArray<ICourse>;
  readonly notices: ReadonlyArray<INotice>;
  readonly isFetching: boolean;
  readonly onNoticeCardPress: (noticeId: string) => void;
  readonly onRefresh?: () => void;
}

const NoticesView: React.FunctionComponent<INoticesViewProps> = props => {
  const { courses, notices, isFetching, onNoticeCardPress, onRefresh } = props;

  const renderListItem: ListRenderItem<INotice> = ({ item }) => {
    if (courses) {
      const course = courses.find(course => course.id === item.courseId);
      if (course) {
        return (
          <NoticeCard
            loading={isFetching}
            title={item.title}
            author={item.publisher}
            date={item.publishTime}
            courseName={course.name}
            courseTeacherName={course.teacherName}
            // tslint:disable-next-line: jsx-no-lambda
            onPress={() => onNoticeCardPress(item.id)}
          />
        );
      }
    }
    return (
      <NoticeCard
        loading={isFetching}
        title={item.title}
        author={item.publisher}
        date={item.publishTime}
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() => onNoticeCardPress(item.id)}
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f0f0" }}>
      <FlatList
        ItemSeparatorComponent={Divider}
        data={notices}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            colors={[Colors.tint]}
          />
        }
      />
    </SafeAreaView>
  );
};

export default NoticesView;
