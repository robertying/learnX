import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { iOSColors, iOSUIKit } from "react-native-typography";
import Icon from "react-native-vector-icons/MaterialIcons";
import Colors from "../constants/Colors";
import dayjs from "../helpers/dayjs";
import { removeTags } from "../helpers/html";
import { getLocale, getTranslation } from "../helpers/i18n";
import InteractablePreviewWrapper, {
  IInteractablePreviewWrapperProps
} from "./InteractablePreviewWrapper";
import Text from "./Text";

export interface IAssignmentCardProps extends IInteractablePreviewWrapperProps {
  readonly title: string;
  readonly hasAttachment: boolean;
  readonly submitted: boolean;
  readonly graded: boolean;
  readonly date: string;
  readonly description?: string;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
}

const AssignmentCard: React.FC<IAssignmentCardProps> = props => {
  const {
    onPress,
    onPressIn,
    title,
    hasAttachment,
    date,
    courseName,
    courseTeacherName,
    description,
    pinned,
    onPinned,
    submitted,
    graded,
    dragEnabled
  } = props;

  return (
    <InteractablePreviewWrapper
      pinned={pinned}
      onPinned={onPinned}
      onPress={onPress}
      onPressIn={onPressIn}
      dragEnabled={dragEnabled}
    >
      <View
        style={{
          backgroundColor: "#fff",
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
          borderLeftColor: Colors.theme,
          borderLeftWidth: pinned ? 10 : 0
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
          <Text style={iOSUIKit.subhead} numberOfLines={3}>
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
          <Text style={{ color: iOSColors.gray, fontSize: 13 }}>
            {courseName &&
              courseTeacherName &&
              `${courseTeacherName} / ${courseName}`}
          </Text>
          <Text style={{ color: iOSColors.gray, fontSize: 13 }}>
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
    </InteractablePreviewWrapper>
  );
};

export default AssignmentCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: "row",
    alignItems: "center"
  }
});
