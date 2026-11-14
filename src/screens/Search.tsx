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
import { useUserData } from 'data/userData';
import { Notice, Assignment, File } from 'data/types/state';
import NoticeCard from 'components/NoticeCard';
import AssignmentCard from 'components/AssignmentCard';
import FileCard from 'components/FileCard';
import StatusView from 'components/StatusView';
import SafeArea from 'components/SafeArea';
import { t } from 'helpers/i18n';
import { SearchStackParams } from 'navigation/types';
import { Paragraph } from 'components/Text';
import { useTheme } from 'theme';

type Props = NativeStackScreenProps<SearchStackParams, 'Search'>;

const Search: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();

  const safeAreaInsets = useSafeAreaInsets();

  // Hidden courses' items are left out; archived ones are found.
  const hiddenCourses = new Set(useUserData(data => data.hiddenCourses));
  const shown = <T extends { courseId: string }>(items: T[]) =>
    items.filter(item => !hiddenCourses.has(item.courseId));
  const notices = shown(useNotices().notices);
  const assignments = shown(useAssignments().assignments);
  const files = shown(useFiles().files);

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
        // Android's close button doesn't always send a text change. iOS and
        // Mac have no cancel button (patched out): it only did what the clear
        // button in the field does, and the modal has its own Close button.
        onClose: () => setSearchQuery(''),
        onFocus: () => {
          searchBarFocused.current = true;
        },
      },
    });
  }, [navigation, theme.colors.primary]);

  // Android focuses through autoFocus. On iOS the header search bar is
  // attached some time after the screen mounts (once the search modal is
  // presented), and focus() before that does nothing. So keep asking until
  // the bar reports focus: on each early transitionEnd and on a few timers
  // after mounting. Coming back from a result doesn't refocus it.
  const searchBarFocused = useRef(false);
  useEffect(() => {
    let attempts = 0;
    const focusSearchBar = () => {
      if (searchBarFocused.current || attempts >= 8) {
        return;
      }
      if (attempts === 0 && initialQuery) {
        searchBarRef.current?.setText(initialQuery);
      }
      attempts++;
      searchBarRef.current?.focus();
    };
    const timers = [50, 200, 400, 700, 1000].map(delay =>
      setTimeout(focusSearchBar, delay),
    );
    const parent =
      navigation.getParent<NativeStackNavigationProp<ParamListBase>>();
    const unsubscribeParent = parent?.addListener('transitionEnd', e => {
      if (!e.data.closing) {
        focusSearchBar();
      }
    });
    const unsubscribe = navigation.addListener('transitionEnd', e => {
      if (!e.data.closing) {
        focusSearchBar();
      }
    });
    return () => {
      timers.forEach(clearTimeout);
      unsubscribeParent?.();
      unsubscribe();
    };
  }, [navigation, initialQuery]);

  const {
    notices: noticeResult,
    assignments: assignmentResult,
    files: fileResult,
  } = useSearch(notices, assignments, files, searchQuery);
  const hasResults =
    noticeResult.length > 0 ||
    assignmentResult.length > 0 ||
    fileResult.length > 0;

  return (
    <SafeArea>
      <View style={Styles.flex1}>
        {/* Behind the results and always mounted: a KeyboardAvoidingView
            that mounts while the keyboard is up (after the query is cleared)
            never learns its height, so the prompt would sit behind it. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={Styles.flex1}
          >
            {hasResults ? null : searchQuery.trim() ? (
              <StatusView icon="noResults" message={t('noResults')} />
            ) : (
              <StatusView icon="search" message={t('searchPrompt')} />
            )}
          </KeyboardAvoidingView>
        </View>
        {hasResults ? (
          <SectionList<Notice | Assignment | File>
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode="on-drag"
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
            renderItem={({ item, index, section: { key, data } }) =>
              key === 'notice' ? (
                <NoticeCard
                  data={item as Notice}
                  last={index === data.length - 1}
                  actionsDisabled
                  onPress={() =>
                    navigation.push('NoticeDetail', { id: item.id })
                  }
                />
              ) : key === 'assignment' ? (
                <AssignmentCard
                  data={item as Assignment}
                  last={index === data.length - 1}
                  actionsDisabled
                  onPress={() =>
                    navigation.push('AssignmentDetail', { id: item.id })
                  }
                />
              ) : (
                <FileCard
                  data={item as File}
                  last={index === data.length - 1}
                  actionsDisabled
                  onPress={() => navigation.push('FileDetail', { id: item.id })}
                />
              )
            }
            renderSectionHeader={({ section: { title, data } }) =>
              data.length ? (
                <Paragraph
                  accessibilityRole="header"
                  style={[
                    styles.header,
                    {
                      color: theme.colors.onSurfaceMedium,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                >
                  {title}
                </Paragraph>
              ) : null
            }
          />
        ) : null}
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 1,
  },
});

export default Search;
