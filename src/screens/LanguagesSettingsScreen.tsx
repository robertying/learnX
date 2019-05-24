import React from "react";
import { FlatList, ListRenderItem, SafeAreaView } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import Divider from "../components/Divider";
import SettingsListItem from "../components/SettingsListItem";
import { getTranslation } from "../helpers/i18n";
import { setLang } from "../redux/actions/settings";
import { showToast } from "../redux/actions/toast";
import { IPersistAppState, Language } from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ILanguagesSettingsScreenStateProps {
  readonly lang?: Language | null;
}

interface ILanguagesSettingsScreenDispatchProps {
  readonly setLang: (lang: Language) => void;
  readonly showToast: (text: string, duration: number) => void;
}

type ILanguagesSettingsScreenProps = ILanguagesSettingsScreenStateProps &
  ILanguagesSettingsScreenDispatchProps;

const LanguagesSettingsScreen: INavigationScreen<
  ILanguagesSettingsScreenProps
> = props => {
  const { lang, setLang, showToast } = props;

  const renderListItem: ListRenderItem<{}> = ({ index }) => {
    switch (index) {
      case 0:
        return (
          <SettingsListItem
            variant="none"
            text="中文"
            icon={lang === Language.zh ? <Icon name="check" size={20} /> : null}
            // tslint:disable-next-line: jsx-no-lambda
            onPress={() => {
              setLang(Language.zh);
              showToast(getTranslation("effectAfterReboot"), 1500);
            }}
          />
        );
      case 1:
        return (
          <SettingsListItem
            variant="none"
            text="English"
            icon={lang === Language.en ? <Icon name="check" size={20} /> : null}
            // tslint:disable-next-line: jsx-no-lambda
            onPress={() => {
              setLang(Language.en);
              showToast(getTranslation("effectAfterReboot"), 1500);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f0f0" }}>
      <FlatList
        style={{ marginTop: 10 }}
        data={[{ key: "zh" }, { key: "en" }]}
        renderItem={renderListItem}
        ItemSeparatorComponent={Divider}
      />
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
LanguagesSettingsScreen.navigationOptions = {
  title: getTranslation("languages")
};

function mapStateToProps(
  state: IPersistAppState
): ILanguagesSettingsScreenStateProps {
  return {
    lang: state.settings.lang
  };
}

const mapDispatchToProps: ILanguagesSettingsScreenDispatchProps = {
  setLang,
  showToast
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LanguagesSettingsScreen);
