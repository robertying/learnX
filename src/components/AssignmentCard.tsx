import React, { FunctionComponent } from "react";
import {
  Platform,
  StyleSheet,
  TouchableHighlight,
  TouchableHighlightProps,
  View
} from "react-native";
import Interactable from "react-native-interactable";
import { iOSColors, iOSUIKit } from "react-native-typography";
import Icon from "react-native-vector-icons/MaterialIcons";
import Colors from "../constants/Colors";
import dayjs from "../helpers/dayjs";
import { removeTags } from "../helpers/html";
import { getLocale, getTranslation } from "../helpers/i18n";
import Text from "./Text";

export type IAssignmentCardProps = TouchableHighlightProps & {
  readonly loading: boolean;
  readonly title: string;
  readonly hasAttachment: boolean;
  readonly submitted: boolean;
  readonly graded: boolean;
  readonly date: string;
  readonly description?: string;
  readonly pinned?: boolean;
  readonly onPinned?: (pin: boolean) => void;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
};

const AssignmentCard: FunctionComponent<IAssignmentCardProps> = props => {
  const {
    onPress,
    title,
    hasAttachment,
    date,
    courseName,
    courseTeacherName,
    description,
    pinned,
    onPinned,
    submitted,
    graded
  } = props;

  const onDrag = (event: Interactable.IDragEvent) => {
    if (Math.abs(event.nativeEvent.x) > 150) {
      onPinned!(!pinned);
    }
  };

  return (
    <Interactable.View
      animatedNativeDriver={true}
      horizontalOnly={true}
      snapPoints={[{ x: 0 }]}
      onDrag={onDrag}
      dragEnabled={courseName && courseTeacherName ? true : false}
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
          <View
            style={[
              styles.flexRow,
              {
                justifyContent: "space-between"
              }
            ]}
          >
            <Text
              style={[
                { flex: 1 },
                iOSUIKit.bodyEmphasized,
                Platform.OS === "android" && { fontWeight: "bold" }
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            {hasAttachment && (
              <Icon
                style={{ marginLeft: 5 }}
                name="attachment"
                size={18}
                color={iOSColors.yellow}
              />
            )}
            {submitted && (
              <Icon
                style={{ marginLeft: 5 }}
                name="done"
                size={18}
                color={iOSColors.green}
              />
            )}
            {graded && (
              <Icon
                style={{ marginLeft: 5 }}
                name="grade"
                size={18}
                color={iOSColors.red}
              />
            )}
          </View>
          <View
            style={{
              marginTop: 8
            }}
          >
            <Text
              style={[iOSUIKit.subhead, { lineHeight: 24 }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {removeTags(description || "") ||
                getTranslation("noAssignmentDescription")}
            </Text>
          </View>
          <View
            style={[
              styles.flexRow,
              {
                justifyContent: "space-between",
                marginTop: 10
              }
            ]}
          >
            <Text style={{ color: "grey", fontSize: 13 }}>
              {courseName &&
                courseTeacherName &&
                `${courseTeacherName} / ${courseName}`}
            </Text>
            <Text style={{ color: "grey", fontSize: 13 }}>
              {getLocale().startsWith("zh")
                ? dayjs().isAfter(dayjs(date))
                  ? dayjs().to(dayjs(date)) + "截止"
                  : "还剩 " + dayjs().to(dayjs(date), true)
                : dayjs().isAfter(dayjs(date))
                ? "closed " + dayjs().to(dayjs(date))
                : "due in " + dayjs().to(dayjs(date), true)}
            </Text>
          </View>
        </View>
      </TouchableHighlight>
    </Interactable.View>
  );
};

export default AssignmentCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: "row",
    alignItems: "center"
  }
});
