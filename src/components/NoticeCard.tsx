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

export type INoticeCardProps = TouchableHighlightProps & {
  readonly title: string;
  readonly author: string;
  readonly date: string;
  readonly content?: string;
  readonly markedImportant: boolean;
  readonly hasAttachment: boolean;
  readonly pinned?: boolean;
  readonly onPinned?: (pin: boolean) => void;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
};

const NoticeCard: FunctionComponent<INoticeCardProps> = props => {
  const {
    onPress,
    title,
    author,
    date,
    courseName,
    courseTeacherName,
    content,
    markedImportant,
    hasAttachment,
    pinned,
    onPinned
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
            {markedImportant && (
              <Icon
                style={{ marginLeft: 5 }}
                name="flag"
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
              {removeTags(content || "") || getTranslation("noNoticeContent")}
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
              {courseName && courseTeacherName
                ? `${courseTeacherName} / ${courseName}`
                : getLocale().startsWith("zh")
                ? author + " 发布"
                : "published by " + author}
            </Text>
            <Text style={{ color: "grey", fontSize: 13 }}>
              {dayjs(date).fromNow()}
            </Text>
          </View>
        </View>
      </TouchableHighlight>
    </Interactable.View>
  );
};

export default NoticeCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: "row",
    alignItems: "center"
  }
});
