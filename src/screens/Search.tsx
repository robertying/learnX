import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';
import type { SearchBarCommands } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSearch from 'hooks/useSearch';
import Styles from 'constants/Styles';
import { useAssignments, useNotices, useFiles } from 'data/content';
import { Notice, Assignment, File } from 'data/types/state';
import NoticeCard from 'components/NoticeCard';
import AssignmentCard from 'components/AssignmentCard';
import FileCard from 'components/FileCard';
import Empty from 'components/Empty';
import SafeArea from 'components/SafeArea';
import { t } from 'helpers/i18n';
import { SearchStackParams } from './types';
import { Subheading } from 'components/Text';
import { useTheme } from 'theme';

type Props = NativeStackScreenProps<SearchStackParams, 'Search'>;

const Search: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();

  const safeAreaInsets = useSafeAreaInsets();

  const { notices } = useNotices();
  const { assignments } = useAssignments();
  const { files } = useFiles();

  const initialQuery = route.params?.query ?? '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // The system search bar in the header (UISearchController on iOS and Mac,
  // the toolbar search view on Android).
  const searchBarRef = useRef<SearchBarCommands>(null);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        ref: searchBarRef,
        placeholder: t('searchPlaceholder'),
        autoCapitalize: 'none',
        autoFocus: true,
        hideWhenScrolling: false,
        hideNavigationBar: false,
        obscureBackground: false,
        tintColor: theme.colors.primary,
        onChangeText: e => setSearchQuery(e.nativeEvent.text),
      },
    });
  }, [navigation, theme.colors.primary]);

  // Android focuses through autoFocus. On iOS the search bar is attached only
  // once the search modal has been presented (a transition of the parent
  // stack), so focus it then, once: coming back from a result keeps the
  // keyboard down.
  const focusedOnce = useRef(false);
  useEffect(() => {
    const focusSearchBar = (closing: boolean) => {
      if (closing || focusedOnce.current) {
        return;
      }
      focusedOnce.current = true;
      if (initialQuery) {
        searchBarRef.current?.setText(initialQuery);
      }
      searchBarRef.current?.focus();
    };
    const parent =
      navigation.getParent<NativeStackNavigationProp<ParamListBase>>();
    const unsubscribeParent = parent?.addListener('transitionEnd', e =>
      focusSearchBar(e.data.closing),
    );
    const unsubscribe = navigation.addListener('transitionEnd', e =>
      focusSearchBar(e.data.closing),
    );
    return () => {
      unsubscribeParent?.();
      unsubscribe();
    };
  }, [navigation, initialQuery]);

  const [noticeResult, assignmentResult, fileResult] = useSearch(
    notices,
    assignments,
    files,
    searchQuery,
  );

  const handlePush = (
    name: 'NoticeDetail' | 'AssignmentDetail' | 'FileDetail',
    id: string,
  ) => {
    navigation.push(name, { id });
  };

  return (
    <SafeArea>
      <View style={Styles.flex1}>
        {noticeResult.length === 0 &&
        assignmentResult.length === 0 &&
        fileResult.length === 0 ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={Styles.flex1}
          >
            <Empty />
          </KeyboardAvoidingView>
        ) : (
          <SectionList<Notice | Assignment | File>
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom }}
            sections={[
              { key: 'notice', title: t('notices'), data: noticeResult },
              {
                key: 'assignment',
                title: t('assignments'),
                data: assignmentResult,
              },
              { key: 'file', title: t('files'), data: fileResult },
            ]}
            keyExtractor={item => item.id}
            renderItem={({ item, section: { key } }) =>
              key === 'notice' ? (
                <NoticeCard
                  data={item as Notice}
                  disableSwipe
                  onPress={() => handlePush('NoticeDetail', item.id)}
                />
              ) : key === 'assignment' ? (
                <AssignmentCard
                  data={item as Assignment}
                  disableSwipe
                  onPress={() => handlePush('AssignmentDetail', item.id)}
                />
              ) : (
                <FileCard
                  data={item as File}
                  disableSwipe
                  onPress={() => handlePush('FileDetail', item.id)}
                />
              )
            }
            renderSectionHeader={({ section: { title, data } }) =>
              data.length ? (
                <Subheading
                  style={[
                    styles.header,
                    {
                      color: theme.colors.outline,
                      backgroundColor: theme.dark
                        ? 'black'
                        : theme.colors.background,
                    },
                  ]}
                >
                  {title}
                </Subheading>
              ) : null
            }
          />
        )}
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: -1,
  },
});

export default Search;
