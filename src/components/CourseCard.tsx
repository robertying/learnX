import React from "react";
import {
  StyleSheet,
  TouchableHighlight,
  TouchableHighlightProps,
  View
} from "react-native";
import { iOSColors } from "react-native-typography";
import { ISemester } from "../redux/types/state";
import IconText from "./IconText";
import Text from "./Text";

export type ICourseCardProps = TouchableHighlightProps & {
  readonly loading: boolean;
  readonly courseName: string;
  readonly courseTeacherName: string;
  readonly noticesCount: number;
  readonly filesCount: number;
  readonly assignmentsCount: number;
  readonly semester: ISemester;
};

const CourseCard: React.FunctionComponent<ICourseCardProps> = props => {
  const {
    onPress,
    courseName,
    courseTeacherName,
    noticesCount,
    filesCount,
    assignmentsCount,
    semester
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
            {courseTeacherName}
          </Text>
        )}
        <View
          style={{
            flex: 3,
            margin: 20,
            marginLeft: 30,
            marginRight: 30
          }}
        >
          <Text style={{ fontSize: 16, lineHeight: 20 }} numberOfLines={3}>
            {courseName}
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
          <View style={[styles.flexRow, { flex: 2 }]}>
            <Text style={{ color: "grey", fontSize: 12 }}>{semester}</Text>
          </View>
          <View style={[styles.flexRow, { flex: 3 }]}>
            <IconText
              name="notifications"
              color={iOSColors.black}
              text={`${noticesCount}`}
            />
            <IconText
              name="cloud-download"
              color={iOSColors.black}
              text={`${filesCount}`}
            />
            <IconText
              name="assignment"
              color={iOSColors.black}
              text={`${assignmentsCount}`}
            />
          </View>
        </View>
      </View>
    </TouchableHighlight>
  );
};

export default CourseCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: "row",
    alignItems: "center"
  }
});
