import React, { useEffect } from "react";
import { FlatList, ListRenderItem, SafeAreaView } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import Divider from "../components/Divider";
import SettingsListItem from "../components/SettingsListItem";
import { getTranslation } from "../helpers/i18n";
import { getCoursesForSemester } from "../redux/actions/courses";
import { setCurrentSemester } from "../redux/actions/currentSemester";
import { store } from "../redux/store";
import { IPersistAppState, ISemester } from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ISemestersSettingsScreenStateProps {
  readonly semesters: ReadonlyArray<ISemester>;
  readonly currentSemester: ISemester;
}

interface ISemestersSettingsScreenDispatchProps {
  readonly setCurrentSemester: (semester: ISemester) => void;
}

type ISemestersSettingsScreenProps = ISemestersSettingsScreenStateProps &
  ISemestersSettingsScreenDispatchProps;

const SemestersSettingsScreen: INavigationScreen<
  ISemestersSettingsScreenProps
> = props => {
  const { semesters, currentSemester, setCurrentSemester } = props;

  useEffect(() => {
    return () => {
      store.dispatch(getCoursesForSemester(currentSemester as string));
    };
  }, [currentSemester]);

  const renderListItem: ListRenderItem<ISemester> = ({ item }) => {
    return (
      <SettingsListItem
        variant="none"
        text={item as string}
        icon={currentSemester === item ? <Icon name="check" size={20} /> : null}
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() => {
          setCurrentSemester(item);
        }}
      />
    );
  };

  const keyExtractor = (item: any) => item as string;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f0f0" }}>
      <FlatList
        style={{ marginTop: 10 }}
        data={semesters}
        renderItem={renderListItem}
        ItemSeparatorComponent={Divider}
        keyExtractor={keyExtractor}
      />
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
SemestersSettingsScreen.navigationOptions = {
  title: getTranslation("semesters")
};

function mapStateToProps(
  state: IPersistAppState
): ISemestersSettingsScreenStateProps {
  return {
    semesters: state.semesters.items,
    currentSemester: state.currentSemester
  };
}

const mapDispatchToProps: ISemestersSettingsScreenDispatchProps = {
  setCurrentSemester
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SemestersSettingsScreen);
