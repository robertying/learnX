import { LayoutRoot } from "react-native-navigation";
import Colors from "../constants/Colors";
import { getTranslation } from "../helpers/i18n";
import { loadTabIcons } from "../helpers/icons";

export const getNavigationRoot = async () => {
  const icons = await loadTabIcons();

  const navigationRoot: LayoutRoot = {
    root: {
      bottomTabs: {
        children: [
          {
            stack: {
              children: [
                {
                  component: {
                    name: "notices.index"
                  }
                }
              ],
              options: {
                bottomTab: {
                  text: getTranslation("notices"),
                  textColor: Colors.tabIconDefault,
                  selectedTextColor: Colors.tabIconSelected,
                  icon: icons.notifications,
                  iconColor: Colors.tabIconDefault,
                  selectedIconColor: Colors.tabIconSelected
                }
              }
            }
          },
          {
            stack: {
              children: [
                {
                  component: {
                    name: "files.index"
                  }
                }
              ],
              options: {
                bottomTab: {
                  text: getTranslation("files"),
                  textColor: Colors.tabIconDefault,
                  selectedTextColor: Colors.tabIconSelected,
                  icon: icons.folder,
                  iconColor: Colors.tabIconDefault,
                  selectedIconColor: Colors.tabIconSelected
                }
              }
            }
          },
          {
            stack: {
              children: [
                {
                  component: {
                    name: "assignments.index"
                  }
                }
              ],
              options: {
                bottomTab: {
                  text: getTranslation("assignments"),
                  textColor: Colors.tabIconDefault,
                  selectedTextColor: Colors.tabIconSelected,
                  icon: icons.today,
                  iconColor: Colors.tabIconDefault,
                  selectedIconColor: Colors.tabIconSelected
                }
              }
            }
          },
          {
            stack: {
              children: [
                {
                  component: {
                    name: "courses.index"
                  }
                }
              ],
              options: {
                bottomTab: {
                  text: getTranslation("courses"),
                  textColor: Colors.tabIconDefault,
                  selectedTextColor: Colors.tabIconSelected,
                  icon: icons.apps,
                  iconColor: Colors.tabIconDefault,
                  selectedIconColor: Colors.tabIconSelected
                }
              }
            }
          }
        ]
      }
    }
  };

  return navigationRoot;
};
