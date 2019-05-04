import React from "react";
import { View } from "react-native";
import { iOSColors } from "react-native-typography";
import Icon from "react-native-vector-icons/MaterialIcons";
import Colors from "../constants/Colors";

export interface ITabBarIconProps {
  readonly name: string;
  readonly focused: boolean;
  readonly hasDot?: boolean;
}

const TabBarIcon = (props: ITabBarIconProps) =>
  props.hasDot ? (
    <View>
      <Icon
        name={props.name}
        size={24}
        color={props.focused ? Colors.tabIconSelected : Colors.tabIconDefault}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          backgroundColor: iOSColors.red,
          borderRadius: 4,
          width: 8,
          height: 8
        }}
      />
    </View>
  ) : (
    <Icon
      name={props.name}
      size={24}
      color={props.focused ? Colors.tabIconSelected : Colors.tabIconDefault}
    />
  );

export default TabBarIcon;
