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
import { SafeAreaView } from 'react-native-screens/experimental';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import useDebouncedQuery from 'hooks/useDebouncedQuery';
import useSearch, {
  type SearchKind,
  type TopHit,
  topHitCount,
} from 'hooks/useSearch';
import Styles from 'constants/Styles';
import { useAssignments, useNotices, useFiles } from 'data/content';
import { useUserData } from 'data/userData';
import NoticeCard from 'components/NoticeCard';
import AssignmentCard from 'components/AssignmentCard';
import FileCard from 'components/FileCard';
import StatusView from 'components/StatusView';
import SafeArea from 'components/SafeArea';
import ScopeChips from 'components/ScopeChips';
import SegmentedTabs from 'components/SegmentedTabs';
import TextButton from 'components/TextButton';
import ToggleMenu from 'components/ToggleMenu';
import type { ToggleMenuOption } from 'components/ToggleMenu.shared';
import { systemIcons } from 'helpers/systemIcons';
import { headerButtons } from 'navigation/headerButtons';
import { hasGlassHeader } from 'navigation/options';
import { t } from 'helpers/i18n';
import { SearchStackParams } from 'navigation/types';
import { Paragraph } from 'components/Text';
import { useTheme } from 'theme';

type Props = NativeStackScreenProps<SearchStackParams, 'Search'>;

const Search: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();

  const safeAreaInsets = useSafeAreaInsets();

  // Archived items are found and hidden courses' items aren't, unless the
  // filter menu says otherwise, for this search only.
  const [includeArchived, setIncludeArchived] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const hiddenCourses = new Set(useUserData(data => data.hiddenCourses));
  const archived = useUserData(data => data.archived);
  const archivedIds = {
    notice: new Set(archived.notice),
    assignment: new Set(archived.assignment),
    file: new Set(archived.file),
  };
  const shown = <T extends { id: string; courseId: string }>(
    kind: SearchKind,
    items: T[],
  ) =>
    items.filter(
      item =>
        (includeHidden || !hiddenCourses.has(item.courseId)) &&
        (includeArchived || !archivedIds[kind].has(item.id)),
    );
  const notices = shown('notice', useNotices().notices);
  const assignments = shown('assignment', useAssignments().assignments);
  const files = shown('file', useFiles().files);

  // All shows the best few of each kind; a kind's tab shows all of it.
  const [scope, setScope] = useState<SearchKind | 'all'>('all');

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

  const toggleFilter = (name: string) =>
    name === 'archived'
      ? setIncludeArchived(on => !on)
      : setIncludeHidden(on => !on);
  const filterOptions = searchFilterOptions(includeArchived, includeHidden);
  const filtered = !includeArchived || includeHidden;
  // iOS and Mac: a native menu of toggles across from Close. Android's open
  // search bar takes the whole toolbar, so its menu sits beside the tabs.
  useLayoutEffect(() => {
    if (Platform.OS === 'android') {
      return;
    }
    const options = searchFilterOptions(includeArchived, includeHidden);
    navigation.setOptions(
      headerButtons('right', [
        {
          id: 'filter',
          item: {
            type: 'menu',
            identifier: 'filter',
            label: t('filter'),
            icon: {
              type: 'sfSymbol',
              name:
                !includeArchived || includeHidden
                  ? 'line.3.horizontal.decrease.circle.fill'
                  : 'line.3.horizontal.decrease.circle',
            },
            menu: {
              title: t('searchInclude'),
              multiselectable: true,
              items: options.map(option => ({
                type: 'action',
                label: option.label,
                icon: { type: 'sfSymbol', name: systemIcons[option.icon].ios },
                state: option.on ? 'on' : 'off',
                onPress: () => toggleFilter(option.name),
              })),
            },
          } satisfies NativeStackHeaderItem,
        },
      ]),
    );
  }, [navigation, includeArchived, includeHidden]);

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

  // Results follow typing once it pauses, so the list doesn't reshape on
  // every key, and keep the last ones that matched a little longer before
  // No Results replaces them: a query being composed (pinyin letters before
  // they become characters) usually matches nothing for a moment.
  const typedQuery = useDebouncedQuery(searchQuery, 250);
  const settledQuery = useDebouncedQuery(searchQuery, 600);
  const typed = useSearch(notices, assignments, files, typedQuery);
  const settled = useSearch(notices, assignments, files, settledQuery);
  const found = (r: typeof typed) =>
    r.notices.length + r.assignments.length + r.files.length > 0;
  const results = found(typed) ? typed : settled;
  const byKind = {
    notice: results.notices.map(item => ({ kind: 'notice', item }) as TopHit),
    assignment: results.assignments.map(
      item => ({ kind: 'assignment', item }) as TopHit,
    ),
    file: results.files.map(item => ({ kind: 'file', item }) as TopHit),
  };
  const kinds = ['notice', 'assignment', 'file'] as const;
  const titles = {
    notice: 'notices',
    assignment: 'assignments',
    file: 'files',
  } as const;
  const hasResults = kinds.some(kind => byKind[kind].length > 0);

  // The overview: the top hits, when some kind has more than it shows, then
  // the first few of each kind not among them, each with See All.
  const overflows = kinds.some(kind => byKind[kind].length > topHitCount);
  const topHits = overflows ? results.topHits : [];
  const isTop = new Set(topHits.map(hit => hit.item.id));
  const sections =
    scope === 'all'
      ? [
          {
            key: 'top' as const,
            title: t('topHits'),
            data: topHits,
            more: false,
          },
          ...kinds.map(kind => {
            const rest = byKind[kind].filter(hit => !isTop.has(hit.item.id));
            return {
              key: kind,
              title: t(titles[kind]),
              data: rest.slice(0, topHitCount),
              more: byKind[kind].length > topHitCount,
            };
          }),
        ]
      : [
          {
            key: scope,
            title: t(titles[scope]),
            data: byKind[scope],
            more: false,
          },
        ];

  const tabs = ['all', ...kinds] as const;
  const tabTitles = tabs.map(tab =>
    tab === 'all' ? t('all') : t(titles[tab]),
  );
  // The floating tabs' height, which the results scroll clear of.
  const [tabsHeight, setTabsHeight] = useState(0);

  const renderResult = ({ kind, item }: TopHit, last: boolean) => {
    const common = {
      last,
      actionsDisabled: true,
      highlight: results.words,
      archived: archivedIds[kind].has(item.id),
      markArchived: true,
    };
    return kind === 'notice' ? (
      <NoticeCard
        {...common}
        data={item}
        onPress={() => navigation.push('NoticeDetail', { id: item.id })}
      />
    ) : kind === 'assignment' ? (
      <AssignmentCard
        {...common}
        data={item}
        onPress={() => navigation.push('AssignmentDetail', { id: item.id })}
      />
    ) : (
      <FileCard
        {...common}
        data={item}
        onPress={() => navigation.push('FileDetail', { id: item.id })}
      />
    );
  };

  const renderList = (topInset: number) => (
    <SectionList<TopHit, (typeof sections)[number]>
      // Starts over at the top for another tab or tab height.
      key={`${scope}-${topInset}`}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom }}
      contentInset={{ top: topInset }}
      // Starts at the top of its inset, as a course's lists do.
      contentOffset={{ x: 0, y: -topInset }}
      scrollIndicatorInsets={{ top: topInset }}
      ListEmptyComponent={
        <Paragraph style={styles.empty}>{t('noResults')}</Paragraph>
      }
      sections={sections.filter(section => section.data.length)}
      keyExtractor={({ kind, item }) => `${kind}-${item.id}`}
      renderItem={({ item, index, section: { data } }) =>
        renderResult(item, index === data.length - 1)
      }
      renderSectionHeader={({ section: { key, title, more } }) =>
        scope === 'all' ? (
          <View
            style={[
              styles.header,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Paragraph
              accessibilityRole="header"
              style={[
                styles.headerTitle,
                { color: theme.colors.onSurfaceMedium },
              ]}
            >
              {title}
            </Paragraph>
            {more && key !== 'top' ? (
              <TextButton size="small" onPress={() => setScope(key)}>
                {t('seeAll')}
              </TextButton>
            ) : null}
          </View>
        ) : null
      }
    />
  );

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
            {hasResults ? null : settledQuery.trim() ? (
              <StatusView icon="noResults" message={t('noResults')} />
            ) : (
              <StatusView icon="search" message={t('searchPrompt')} />
            )}
          </KeyboardAvoidingView>
        </View>
        {Platform.OS === 'android' ? (
          // Chips for the kinds and the filter menu, once there's a query,
          // so the menu can bring back what it leaves out even when nothing
          // matches.
          searchQuery.trim() ? (
            <View style={Styles.flex1}>
              <View style={styles.androidBar}>
                <ScopeChips
                  titles={tabTitles}
                  selectedIndex={tabs.indexOf(scope)}
                  onSelect={i => setScope(tabs[i])}
                />
                <ToggleMenu
                  label={t('filter')}
                  options={filterOptions}
                  active={filtered}
                  onToggle={toggleFilter}
                />
              </View>
              {hasResults ? renderList(0) : null}
            </View>
          ) : null
        ) : !hasResults ? null : hasGlassHeader ? (
          // iPhone and iPad from iOS 26: the tabs float in glass under the
          // header, as in a course's detail, and the results scroll under
          // them once their height is known.
          <>
            {tabsHeight ? renderList(tabsHeight) : null}
            <SafeAreaView
              edges={{ top: true }}
              style={styles.floatingTabs}
              pointerEvents="box-none"
            >
              <View onLayout={e => setTabsHeight(e.nativeEvent.layout.height)}>
                <SegmentedTabs
                  titles={tabTitles}
                  selectedIndex={tabs.indexOf(scope)}
                  onSelect={i => setScope(tabs[i])}
                  accessibilityLabel={t('search')}
                  floating
                />
              </View>
            </SafeAreaView>
          </>
        ) : (
          <View style={Styles.flex1}>
            <SegmentedTabs
              titles={tabTitles}
              selectedIndex={tabs.indexOf(scope)}
              onSelect={i => setScope(tabs[i])}
              accessibilityLabel={t('search')}
            />
            {renderList(0)}
          </View>
        )}
      </View>
    </SafeArea>
  );
};

/** The filter menu's toggles. */
const searchFilterOptions = (
  includeArchived: boolean,
  includeHidden: boolean,
) =>
  [
    {
      name: 'archived',
      label: t('archived'),
      icon: 'archived',
      on: includeArchived,
    },
    {
      name: 'hidden',
      label: t('hidden'),
      icon: 'hide',
      on: includeHidden,
    },
  ] satisfies ToggleMenuOption[];

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 1,
  },
  headerTitle: {
    flex: 1,
  },
  androidBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingStart: 16,
    paddingEnd: 8,
    paddingVertical: 4,
  },
  floatingTabs: {
    position: 'absolute',
    // Its own height, not the screen's (SafeAreaView flexes by default).
    flex: 0,
    top: 0,
    left: 0,
    right: 0,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 32,
  },
});

export default Search;
