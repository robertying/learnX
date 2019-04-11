import React from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import Colors from "../constants/Colors";

export interface ITabBarIconProps {
  readonly name: string;
  readonly focused: boolean;
}

const TabBarIcon = (props: ITabBarIconProps) => (
  <Icon
    name={props.name}
    size={24}
    style={{ marginBottom: -3 }}
    color={props.focused ? Colors.tabIconSelected : Colors.tabIconDefault}
  />
);

export default TabBarIcon;
