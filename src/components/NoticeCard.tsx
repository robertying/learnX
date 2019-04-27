import React, { FunctionComponent } from "react";
import {
  StyleSheet,
  TouchableHighlight,
  TouchableHighlightProps,
  View
} from "react-native";
import dayjs from "../helpers/dayjs";
import Text from "./Text";

export type INoticeCardProps = TouchableHighlightProps & {
  readonly loading: boolean;
  readonly title: string;
  readonly author: string;
  readonly date: string;
  readonly pinned?: boolean;
  readonly onPinned?: (pin: boolean) => void;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
};

const NoticeCard: FunctionComponent<INoticeCardProps> = props => {
    pinned,
    onPinned

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
