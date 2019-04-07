import React, { FunctionComponent } from "react";
import {
  StyleSheet,
  TouchableHighlight,
  TouchableHighlightProps,
  View
} from "react-native";
import dayjs from "../helpers/dayjs";
import NoticePlaceholder from "./NoticePlaceholder";
import Text from "./Text";

export type INoticeCardProps = TouchableHighlightProps & {
  readonly loading: boolean;
  readonly title: string;
  readonly author: string;
  readonly date: string;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
};

const NoticeCard: FunctionComponent<INoticeCardProps> = props => {
  const {
    loading,
    onPress,
    title,
    author,
    date,
    courseName,
    courseTeacherName
  } = props;

  return (
    <NoticePlaceholder loading={loading}>
      <TouchableHighlight onPress={onPress}>
        <View style={{ backgroundColor: "#fff" }}>
          {courseName && courseTeacherName && (
            <Text
              style={{
                flex: 1,
                margin: 15,
                marginBottom: 0,
                color: "grey"
              }}
            >
              {`${courseTeacherName} / ${courseName}`}
            </Text>
          )}
          <View
            style={{
              flex: 3,
              margin: courseName && courseTeacherName ? 20 : 15
            }}
          >
            <Text style={{ fontSize: 16, lineHeight: 20 }} numberOfLines={3}>
              {title}
            </Text>
          </View>
          <View
            style={[
              styles.flexRow,
              {
                flex: 1,
                justifyContent: "space-between",
                margin: 15,
                marginTop: 0,
                marginBottom: 10
              }
            ]}
          >
            <Text style={{ color: "grey", fontSize: 12 }}>
              {author + " 发布"}
            </Text>
            <Text style={{ color: "grey", fontSize: 12 }}>
              {dayjs(date).fromNow()}
            </Text>
          </View>
        </View>
      </TouchableHighlight>
    </NoticePlaceholder>
  );
};

export default NoticeCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: "row",
    alignItems: "center"
  }
});
