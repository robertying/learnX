import React, { useState } from "react";
import {
  Animated,
  TextInput,
  TextInputProps,
  View,
  ViewProps
} from "react-native";
import { iOSUIKit } from "react-native-typography";
import Icon from "react-native-vector-icons/MaterialIcons";
import Colors from "../constants/Colors";
import TextButton, { ITextButtonProps } from "./TextButton";

export type ISearchBarProps = TextInputProps & {
  readonly onCancel: ITextButtonProps["onPress"];
  readonly onChangeText?: TextInputProps["onChangeText"];
  readonly containerStyle?: ViewProps["style"];
  readonly innerRef?: React.Ref<TextInput> | undefined;
};

const SearchBar: React.FunctionComponent<ISearchBarProps> = props => {
  const { onCancel, containerStyle, innerRef, onChangeText } = props;

  const [cancelButtonWidth] = useState(new Animated.Value(0.01));

  const onFocus: TextInputProps["onFocus"] = e => {
    Animated.timing(cancelButtonWidth, {
      toValue: 34,
      duration: 300
    }).start();

    const onFocus = props.onFocus;
    if (onFocus) {
      onFocus(e);
    }
  };

  const onBlur: TextInputProps["onBlur"] = e => {
    Animated.timing(cancelButtonWidth, {
      toValue: 0.01,
      duration: 300
    }).start();

    const onBlur = props.onBlur;
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <Animated.View
      style={[
        {
          backgroundColor: Colors.lightTint,
          justifyContent: "center"
        },
        containerStyle
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          ref={innerRef}
          style={{
            flex: 1,
            height: 34,
            margin: 8,
            backgroundColor: "white",
            borderColor: "white",
            borderLeftWidth: 34,
            borderRadius: 8,
            fontSize: iOSUIKit.bodyObject.fontSize
          }}
          selectionColor={Colors.tint}
          allowFontScaling={true}
          clearButtonMode="while-editing"
          enablesReturnKeyAutomatically={true}
          placeholder="搜索课程、老师……"
          placeholderTextColor="gray"
          returnKeyType="search"
          selectTextOnFocus={true}
          onFocus={onFocus}
          onBlur={onBlur}
          onChangeText={onChangeText}
        />
        <AnimatedButton
          onPress={onCancel}
          style={{
            width: cancelButtonWidth,
            marginRight: cancelButtonWidth.interpolate({
              inputRange: [0, 34],
              outputRange: [0, 8]
            })
          }}
        >
          取消
        </AnimatedButton>
      </View>
      <Icon
        name="search"
        size={20}
        style={{ position: "absolute", left: 20 }}
        color="gray"
      />
    </Animated.View>
  );
};

const AnimatedButton = Animated.createAnimatedComponent(TextButton);

export default React.forwardRef(
  (props: ISearchBarProps, ref: React.Ref<TextInput> | undefined) => (
    <SearchBar innerRef={ref} {...props} />
  )
);
