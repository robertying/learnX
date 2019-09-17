import React, {useEffect} from 'react';
import {FlatList, ListRenderItem, SafeAreaView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {connect} from 'react-redux';
import SettingsListItem from '../components/SettingsListItem';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {getCoursesForSemester} from '../redux/actions/courses';
import {setCurrentSemester} from '../redux/actions/currentSemester';
import {getAllSemesters} from '../redux/actions/semesters';
import {IPersistAppState} from '../redux/types/state';
import {INavigationScreen} from '../types/NavigationScreen';
import {useDarkMode, initialMode} from 'react-native-dark-mode';
import {Navigation} from 'react-native-navigation';

interface ISemestersSettingsScreenStateProps {
  readonly semesters: readonly string[];
  readonly currentSemester: string;
}

interface ISemestersSettingsScreenDispatchProps {
  readonly setCurrentSemester: (semesterId: string) => void;
  readonly getCoursesForSemester: (semesterId: string) => void;
  readonly getAllSemesters: () => void;
}

type ISemestersSettingsScreenProps = ISemestersSettingsScreenStateProps &
  ISemestersSettingsScreenDispatchProps;

const SemestersSettingsScreen: INavigationScreen<
  ISemestersSettingsScreenProps
> = props => {
  const {
    semesters,
    currentSemester,
    setCurrentSemester,
    getCoursesForSemester,
    getAllSemesters,
  } = props;

  useEffect(() => {
    getAllSemesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      getCoursesForSemester(currentSemester);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemester]);

  const renderListItem: ListRenderItem<string> = ({item}) => {
    return (
      <SettingsListItem
        variant="none"
        text={item as string}
        icon={
          currentSemester === item ? (
            <Icon
              name="check"
              size={20}
              color={isDarkMode ? Colors.grayDark : undefined}
            />
          ) : null
        }
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() => {
          setCurrentSemester(item);
        }}
      />
    );
  };

  const keyExtractor = (item: any) => item as string;

  const isDarkMode = useDarkMode();

  useEffect(() => {
    Navigation.mergeOptions(props.componentId, {
      topBar: {
        title: {
          component: {
            name: 'text',
            passProps: {
              children: getTranslation('changeSemester'),
              style: {
                fontSize: 17,
                fontWeight: '500',
                color: isDarkMode ? 'white' : 'black',
              },
            },
          },
        },
      },
    });
  }, [isDarkMode, props.componentId]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDarkMode ? 'black' : 'white',
      }}>
      <FlatList
        style={{
          marginTop: 10,
          backgroundColor: isDarkMode ? 'black' : 'white',
        }}
        data={semesters}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
      />
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
SemestersSettingsScreen.options = {
  topBar: {
    title: {
      component: {
        name: 'text',
        passProps: {
          children: getTranslation('changeSemester'),
          style: {
            fontSize: 17,
            fontWeight: '500',
            color: initialMode === 'dark' ? 'white' : 'black',
          },
        },
      },
    },
  },
};

function mapStateToProps(
  state: IPersistAppState,
): ISemestersSettingsScreenStateProps {
  return {
    semesters: state.semesters.items,
    currentSemester: state.currentSemester,
  };
}

const mapDispatchToProps: ISemestersSettingsScreenDispatchProps = {
  setCurrentSemester,
  getCoursesForSemester,
  getAllSemesters,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SemestersSettingsScreen);
