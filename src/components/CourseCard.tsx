import React from "react";
import {
  Platform,
  StyleSheet,
  TouchableHighlight,
  TouchableHighlightProps,
  View
} from "react-native";
import Interactable from "react-native-interactable";
import { iOSUIKit } from "react-native-typography";
import Colors from "../constants/Colors";
import { ISemester } from "../redux/types/state";
import IconText from "./IconText";
import Text from "./Text";

export type ICourseCardProps = TouchableHighlightProps & {
  readonly courseName: string;
  readonly courseTeacherName: string;
  readonly noticesCount: number;
  readonly filesCount: number;
  readonly assignmentsCount: number;
  readonly semester: ISemester;
  readonly pinned: boolean;
  readonly onPinned: (pin: boolean) => void;
};

const CourseCard: React.FunctionComponent<ICourseCardProps> = props => {
  const {
    onPress,
    courseName,
    courseTeacherName,
    noticesCount,
    filesCount,
    assignmentsCount,
    semester,
    pinned,
    onPinned
  } = props;

  const onDrag = (event: Interactable.IDragEvent) => {
    if (Math.abs(event.nativeEvent.x) > 150) {
      onPinned(!pinned);
    }
  };

  return (
    <Interactable.View
      animatedNativeDriver={true}
      horizontalOnly={true}
      snapPoints={[{ x: 0 }]}
      onDrag={onDrag}
    >
      <TouchableHighlight
        onPress={onPress}
        underlayColor={pinned ? "white" : undefined}
      >
        <View
          style={{
            backgroundColor: pinned ? Colors.lightTint : "#fff",
            padding: 15
          }}
        >
          <Text
            style={[
              { flex: 1 },
              iOSUIKit.title3Emphasized,
              Platform.OS === "android" && { fontWeight: "bold" }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {courseName}
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "flex-end", flex: 1 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[iOSUIKit.subhead, { marginTop: 10 }]}>
                {courseTeacherName}
              </Text>
              <Text style={{ color: "grey", fontSize: 13, marginTop: 10 }}>
                {semester}
              </Text>
            </View>
            <View style={[styles.flexRow, { flex: 1 }]}>
              <IconText
                name="notifications"
                color="grey"
                text={`${noticesCount}`}
              />
              <IconText name="folder" color="grey" text={`${filesCount}`} />
              <IconText
                name="today"
                color="grey"
                text={`${assignmentsCount}`}
              />
            </View>
          </View>
        </View>
      </TouchableHighlight>
    </Interactable.View>
  );
};

export default CourseCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: "row",
    alignItems: "center"
  }
});
