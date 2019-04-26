import React, { FunctionComponent } from "react";
import {
  StyleSheet,
  TouchableHighlight,
  TouchableHighlightProps,
  View
} from "react-native";
import dayjs from "../helpers/dayjs";
import Text from "./Text";

export type IAssignmentCardProps = TouchableHighlightProps & {
  readonly loading: boolean;
  readonly title: string;
  readonly attachment?: string;
  readonly date: string;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
};

const AssignmentCard: FunctionComponent<IAssignmentCardProps> = props => {
  const {
    onPress,
    title,
    attachment,
    date,
    courseName,
    courseTeacherName
  } = props;

  return (
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
            {attachment ? "附件 " + attachment : "无附件"}
          </Text>
          <Text style={{ color: "grey", fontSize: 12 }}>
            {dayjs().isAfter(dayjs(date))
              ? dayjs().to(dayjs(date)) + "截止"
              : "还剩 " + dayjs().to(dayjs(date), true)}
          </Text>
        </View>
      </View>
    </TouchableHighlight>
  );
};

export default AssignmentCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: "row",
    alignItems: "center"
  }
});
