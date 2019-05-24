import React from "react";
import { Platform, StatusBar } from "react-native";
import {
  createBottomTabNavigator,
  createStackNavigator,
  Header,
  NavigationStackScreenOptions
} from "react-navigation";
import { connect } from "react-redux";
import LinearGradientBlurView from "../components/LinearGradientBlurView";
import TabBarIcon from "../components/TabBarIcon";
import Colors from "../constants/Colors";
import Layout from "../constants/Layout";
import { getTranslation } from "../helpers/i18n";
import { store } from "../redux/store";
import { IPersistAppState, Tab } from "../redux/types/state";
import AboutScreen from "../screens/AboutScreen";
import AcknowledgementsScreen from "../screens/AcknowledgementsScreen";
import AssignmentDetailScreen from "../screens/AssignmentDetailScreen";
import AssignmentsScreen from "../screens/AssignmentsScreen";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import CoursesScreen from "../screens/CoursesScreen";
import FilesScreen from "../screens/FilesScreen";
import NoticeDetailScreen from "../screens/NoticeDetailScreen";
import NoticesScreen from "../screens/NoticesScreen";
import SemestersSettingsScreen from "../screens/SemestersSettingsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import WebViewScreen from "../screens/WebViewScreen";

const defaultNavigationOptions: NavigationStackScreenOptions = {
  headerBackground: (
    <LinearGradientBlurView>
      <StatusBar translucent={true} backgroundColor="transparent" />
    </LinearGradientBlurView>
  ),
  headerTintColor: Colors.headerTint,
  headerStyle:
    Platform.OS === "android"
      ? {
          paddingTop: Layout.statusBarHeight,
          height: Header.HEIGHT + Layout.statusBarHeight,
          elevation: 10
        }
      : undefined
};

const NoticesStack = createStackNavigator(
  {
    Notices: NoticesScreen,
    NoticeDetail: NoticeDetailScreen,
    WebView: WebViewScreen
  },
  {
    defaultNavigationOptions,
    headerTransitionPreset: "uikit",
    initialRouteName: "Notices",
    navigationOptions: {
      tabBarIcon: ({ focused }) => (
        <TabBarIcon focused={focused} name="notifications" />
      ),
      tabBarLabel: getTranslation("notices")
    }
  }
);

const FilesStack = createStackNavigator(
  {
    Files: FilesScreen,
    WebView: WebViewScreen
  },
  {
    defaultNavigationOptions,
    headerTransitionPreset: "uikit",
    initialRouteName: "Files",
    navigationOptions: {
      tabBarIcon: ({ focused }) => (
        <TabBarIcon focused={focused} name="folder" />
      ),
      tabBarLabel: getTranslation("files")
    }
  }
);

const AssignmentsStack = createStackNavigator(
  {
    Assignments: AssignmentsScreen,
    AssignmentDetail: AssignmentDetailScreen,
    WebView: WebViewScreen
  },
  {
    defaultNavigationOptions,
    headerTransitionPreset: "uikit",
    initialRouteName: "Assignments",
    navigationOptions: {
      tabBarIcon: ({ focused }) => (
        <TabBarIcon focused={focused} name="today" />
      ),
      tabBarLabel: getTranslation("assignments")
    }
  }
);

const CoursesStack = createStackNavigator(
  {
    Courses: CoursesScreen,
    CourseDetail: CourseDetailScreen,
    WebView: WebViewScreen
  },
  {
    defaultNavigationOptions,
    headerTransitionPreset: "uikit",
    initialRouteName: "Courses",
    navigationOptions: {
      tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name="apps" />,
      tabBarLabel: getTranslation("courses")
    }
  }
);

const TabBarIconWithBadge = connect(
  (state: IPersistAppState) => ({
    hasDot: state.settings.hasUpdate
  }),
  null
)(TabBarIcon);

const SettingsStack = createStackNavigator(
  {
    Settings: SettingsScreen,
    Acknowledgements: AcknowledgementsScreen,
    About: AboutScreen,
    Semesters: SemestersSettingsScreen
  },
  {
    defaultNavigationOptions,
    headerTransitionPreset: "uikit",
    initialRouteName: "Settings",
    navigationOptions: {
      tabBarIcon: ({ focused }) => (
        <TabBarIconWithBadge focused={focused} name="settings" />
      ),
      tabBarLabel: getTranslation("settings")
    }
  }
);

const tabsOrder = store.getState().settings.tabsOrder;
const order = tabsOrder.map(tab => Tab[tab]);
export const initialRouteName = order[0];

const TabNavigator = createBottomTabNavigator(
  {
    Notices: NoticesStack,
    Files: FilesStack,
    Assignments: AssignmentsStack,
    Courses: CoursesStack,
    Settings: SettingsStack
  },
  {
    order,
    tabBarOptions: {
      activeTintColor: Colors.tabIconSelected,
      inactiveTintColor: Colors.tabIconDefault,
      style: {
        paddingTop: 3,
        paddingBottom: 3,
        elevation: 10,
        borderTopColor: "transparent",
        shadowColor: "grey",
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.5
      }
    },
    initialRouteName
  }
);

export default TabNavigator;
