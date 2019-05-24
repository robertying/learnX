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
import { getTranslation } from "../helpers/i18n";
import Text from "./Text";

export type IFileCardProps = TouchableHighlightProps & {
  readonly title: string;
  readonly extension: string;
  readonly size: string;
  readonly date: string;
  readonly description?: string;
  readonly markedImportant: boolean;
  readonly pinned?: boolean;
  readonly onPinned?: (pin: boolean) => void;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
};

const FileCard: FunctionComponent<IFileCardProps> = props => {
  const {
    onPress,
    title,
    size,
    date,
    courseName,
    extension,
    courseTeacherName,
    markedImportant,
    pinned,
    onPinned,
    description
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
            <Text style={{ color: "black", fontSize: 13, marginLeft: 5 }}>
              {extension.toUpperCase() + " " + size}
            </Text>
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
              {description || getTranslation("noFileDescription")}
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
                `${courseTeacherName} / ${courseName} `}
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

export default FileCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: "row",
    alignItems: "center"
  }
});
