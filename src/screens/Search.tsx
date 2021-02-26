import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {Searchbar, Subheading, useTheme} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import useSearch from 'hooks/useSearch';
import Styles from 'constants/Styles';
import {useTypedSelector} from 'data/store';
import {Notice, Assignment, File} from 'data/types/state';
import NoticeCard from 'components/NoticeCard';
import AssignmentCard from 'components/AssignmentCard';
import FileCard from 'components/FileCard';
import Empty from 'components/Empty';
import SafeArea from 'components/SafeArea';
import {ScreenParams} from './types';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {StackActions} from '@react-navigation/native';

const Search: React.FC<StackScreenProps<ScreenParams, 'Search'>> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();

  const safeAreaInsets = useSafeAreaInsets();

  const detailNavigator = useDetailNavigator();

  const notices = useTypedSelector((state) => state.notices.items);
  const assignments = useTypedSelector((state) => state.assignments.items);
  const files = useTypedSelector((state) => state.files.items);

  const [searchQuery, setSearchQuery] = useState(route.params?.query ?? '');

  const [noticeResult, assignmentResult, fileResult] = useSearch(
    notices,
    assignments,
    files,
    searchQuery,
  );

  const handlePush = (name: keyof ScreenParams, item: any) => {
    if (detailNavigator) {
      detailNavigator.dispatch(
        StackActions.replace(name, {
          ...item,
          disableAnimation: true,
        }),
      );
    } else {
      navigation.push(name, item);
    }
  };

  return (
    <SafeArea>
      <View style={Styles.flex1}>
        <Searchbar
          style={styles.searchBar}
          placeholder="搜索通知、作业、文件……"
          onChangeText={setSearchQuery}
          value={searchQuery}
          autoFocus
        />
        {noticeResult.length === 0 &&
        assignmentResult.length === 0 &&
        fileResult.length === 0 ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={Styles.flex1}>
            <Empty />
          </KeyboardAvoidingView>
        ) : (
          <SectionList<Notice | Assignment | File>
            contentContainerStyle={{paddingBottom: safeAreaInsets.bottom}}
            sections={[
              {key: 'notice', title: '通知', data: noticeResult},
              {key: 'assignment', title: '作业', data: assignmentResult},
              {key: 'file', title: '文件', data: fileResult},
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({item, section: {key}}) =>
              key === 'notice' ? (
                <NoticeCard
                  data={item as Notice}
                  onPress={() => handlePush('NoticeDetail', item as Notice)}
                />
              ) : key === 'assignment' ? (
                <AssignmentCard
                  data={item as Assignment}
                  onPress={() =>
                    handlePush('AssignmentDetail', item as Assignment)
                  }
                />
              ) : (
                <FileCard
                  data={item as File}
                  onPress={() => handlePush('FileDetail', item as File)}
                />
              )
            }
            renderSectionHeader={({section: {title, data}}) =>
              data.length ? (
                <Subheading
                  style={[
                    styles.header,
                    {
                      color: theme.colors.placeholder,
                      backgroundColor: theme.dark
                        ? 'black'
                        : theme.colors.background,
                    },
                  ]}>
                  {title}
                </Subheading>
              ) : null
            }
            ItemSeparatorComponent={null}
          />
        )}
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    elevation: 0,
    borderRadius: 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: -1,
  },
});

export default Search;
