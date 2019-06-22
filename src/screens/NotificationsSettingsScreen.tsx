import React from "react";
import { FlatList, ListRenderItem, SafeAreaView } from "react-native";
import { connect } from "react-redux";
import Divider from "../components/Divider";
import SettingsListItem from "../components/SettingsListItem";
import { setNotificationTypes } from "../redux/actions/settings";
import { IPersistAppState, NotificationType } from "../redux/types/state";
import { NavigationScreen } from "../types/NavigationScreen";

interface INotificationsSettingsScreenStateProps {
  readonly notificationTypes: ReadonlyArray<NotificationType>;
}

interface INotificationsSettingsScreenDispatchProps {
  readonly setNotificationTypes: (
    types: ReadonlyArray<NotificationType>
  ) => void;
}

type INotificationsSettingsScreenProps = INotificationsSettingsScreenStateProps &
  INotificationsSettingsScreenDispatchProps;

const NotificationsSettingsScreen: NavigationScreen<
  INotificationsSettingsScreenProps
> = props => {
  const { notificationTypes, setNotificationTypes } = props;

  const onSwitchChange = (type: NotificationType, enabled: boolean) => {
    if (enabled) {
      setNotificationTypes([...notificationTypes, type]);
    } else {
      setNotificationTypes(notificationTypes.filter(item => item !== type));
    }
  };

  const renderListItem: ListRenderItem<{}> = ({ index }) => {
    switch (index) {
      case 0:
        return (
          <SettingsListItem
            variant="switch"
            containerStyle={{ marginTop: 10 }}
            icon={null}
            text="新通知提醒"
            switchValue={notificationTypes.includes(NotificationType.Notices)}
            // tslint:disable-next-line: jsx-no-lambda
            onSwitchValueChange={enabled =>
              onSwitchChange(NotificationType.Notices, enabled)
            }
          />
        );
      case 1:
        return (
          <SettingsListItem
            variant="switch"
            icon={null}
            text="新文件提醒"
            switchValue={notificationTypes.includes(NotificationType.Files)}
            // tslint:disable-next-line: jsx-no-lambda
            onSwitchValueChange={enabled =>
              onSwitchChange(NotificationType.Files, enabled)
            }
          />
        );
      case 2:
        return (
          <SettingsListItem
            variant="switch"
            icon={null}
            text="新作业提醒"
            switchValue={notificationTypes.includes(
              NotificationType.Assignments
            )}
            // tslint:disable-next-line: jsx-no-lambda
            onSwitchValueChange={enabled =>
              onSwitchChange(NotificationType.Assignments, enabled)
            }
          />
        );
      case 3:
        return (
          <SettingsListItem
            variant="switch"
            icon={null}
            text="作业将在 2 天后截止提交提醒"
            switchValue={notificationTypes.includes(NotificationType.Deadlines)}
            // tslint:disable-next-line: jsx-no-lambda
            onSwitchValueChange={enabled =>
              onSwitchChange(NotificationType.Deadlines, enabled)
            }
          />
        );
      case 4:
        return (
          <SettingsListItem
            variant="switch"
            icon={null}
            text="作业成绩发布与更新提醒"
            switchValue={notificationTypes.includes(NotificationType.Grades)}
            // tslint:disable-next-line: jsx-no-lambda
            onSwitchValueChange={enabled =>
              onSwitchChange(NotificationType.Grades, enabled)
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f0f0" }}>
      <FlatList
        data={[
          { key: "notices" },
          { key: "files" },
          { key: "assignments" },
          { key: "deadlines" },
          { key: "grades" }
        ]}
        renderItem={renderListItem}
        ItemSeparatorComponent={Divider}
      />
    </SafeAreaView>
  );
};

function mapStateToProps(
  state: IPersistAppState
): INotificationsSettingsScreenStateProps {
  return {
    notificationTypes: state.settings.notificationTypes || [
      NotificationType.Notices,
      NotificationType.Files,
      NotificationType.Assignments,
      NotificationType.Deadlines,
      NotificationType.Grades
    ]
  };
}

const mapDispatchToProps: INotificationsSettingsScreenDispatchProps = {
  setNotificationTypes
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotificationsSettingsScreen);
