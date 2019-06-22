import React from "react";
import { Navigation } from "react-native-navigation";
import { ConnectedComponentClass, Provider } from "react-redux";
import { store } from "../redux/store";
import AboutScreen from "../screens/AboutScreen";
import AcknowledgementsScreen from "../screens/AcknowledgementsScreen";
import AssignmentsScreen from "../screens/AssignmentsScreen";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import CoursesScreen from "../screens/CoursesScreen";
import FilesScreen from "../screens/FilesScreen";
import NoticesScreen from "../screens/NoticesScreen";
import SemestersSettingsScreen from "../screens/SemestersSettingsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import WebViewScreen from "../screens/WebViewScreen";

const storeWrapped = (
  Component: ConnectedComponentClass<React.FC<any>, any>
) => (props: any) => (
  <Provider store={store}>
    <Component {...props} />
  </Provider>
);

const registerScreens = () => {
  Navigation.registerComponent(
    "notices.index",
    () => storeWrapped(NoticesScreen),
    () => NoticesScreen
  );
  Navigation.registerComponent(
    "files.index",
    () => storeWrapped(FilesScreen),
    () => FilesScreen
  );
  Navigation.registerComponent(
    "assignments.index",
    () => storeWrapped(AssignmentsScreen),
    () => AssignmentsScreen
  );

  Navigation.registerComponent(
    "courses.index",
    () => storeWrapped(CoursesScreen),
    () => CoursesScreen
  );
  Navigation.registerComponent(
    "courses.detail",
    () => storeWrapped(CourseDetailScreen),
    () => CourseDetailScreen
  );

  Navigation.registerComponent(
    "settings.index",
    () => storeWrapped(SettingsScreen),
    () => SettingsScreen
  );
  Navigation.registerComponent(
    "settings.semesters",
    () => storeWrapped(SemestersSettingsScreen),
    () => SemestersSettingsScreen
  );
  Navigation.registerComponent(
    "settings.acknowledgements",
    () => AcknowledgementsScreen
  );
  Navigation.registerComponent("settings.about", () => AboutScreen);

  Navigation.registerComponent("webview", () => WebViewScreen);
};

export default registerScreens;
