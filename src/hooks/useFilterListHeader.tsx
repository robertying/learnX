import { useLayoutEffect } from 'react';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { ParamListBase } from '@react-navigation/native';
import FilterMenu from 'components/FilterMenu';
import OverflowMenu from 'components/OverflowMenu';
import { getTitleOptions } from 'navigation/options';
import DeviceInfo from 'constants/DeviceInfo';
import {
  filterSubtitle,
  selectedCountLabel,
  type FilterOption,
  type FilterSelection,
} from 'helpers/filters';
import { t } from 'helpers/i18n';
import { systemIcons } from 'helpers/systemIcons';
import { headerButtons, type HeaderButton } from 'navigation/headerButtons';
import { RootStackParams } from 'navigation/types';
import useLatest from 'hooks/useLatest';
import { isElectron } from 'helpers/platform';

const TITLES = {
  notice: 'notices',
  assignment: 'assignments',
  file: 'files',
  course: 'courses',
} as const;

/** What the header's buttons do: the screen's handlers. */
export interface FilterListHeaderHandlers {
  onRefresh?: () => void;
  onFilterSelect: (selected: FilterSelection) => void;
  onReorder: () => void;
  onSelect: () => void;
  onCheckAll: () => void;
  /** Archives (or restores, in the archived filter) the checked items */
  onArchiveSelected: () => void;
  onCourseX: () => void;
}

export interface FilterListHeaderOptions extends FilterListHeaderHandlers {
  navigation: Pick<NativeStackNavigationProp<ParamListBase>, 'setOptions'> &
    Pick<NativeStackNavigationProp<RootStackParams>, 'navigate'>;
  type: keyof typeof TITLES;
  defaultSubtitle?: string;
  filterSelected: FilterSelection;
  reorderMode: boolean;
  selectionMode: boolean;
  selectedCount: number;
  refreshing: boolean;
  /** The choices in the filter menu */
  filterOptions: FilterOption[];
}

/**
 * Sets a FilterList screen's header for its three modes: reorder (courses),
 * selection (archive or restore the checked items), and the default with
 * filter, select or reorder, Course X, refresh (Mac, Windows) and search.
 */
const useFilterListHeader = ({
  navigation,
  type,
  defaultSubtitle,
  filterSelected,
  reorderMode,
  selectionMode,
  selectedCount,
  refreshing,
  filterOptions,
  ...handlers
}: FilterListHeaderOptions) => {
  // The header is set again only when what it shows changes; its buttons
  // call the screen's current handlers.
  const latest = useLatest(handlers);
  const isCourse = type === 'course';

  useLayoutEffect(() => {
    const {
      onRefresh,
      onFilterSelect,
      onReorder,
      onSelect,
      onCheckAll,
      onArchiveSelected,
      onCourseX,
    } = bind(latest);
    const reorder: HeaderButton = {
      id: 'reorder',
      label: t('reorder'),
      icon: 'reorder',
      onPress: onReorder,
    };
    const select: HeaderButton = {
      id: 'select',
      label: t('select'),
      icon: 'select',
      onPress: onSelect,
    };

    if (reorderMode) {
      navigation.setOptions({
        ...headerButtons('left', [{ ...reorder, contained: true }]),
        ...headerButtons('right', []),
        ...getTitleOptions(
          t('reorder'),
          // A mouse moves courses with their menu or hover buttons.
          isElectron() ? t('moveToReorder') : t('dragToReorder'),
        ),
      });
      return;
    }

    if (selectionMode) {
      const restoring = filterSelected === 'archived';
      const archiveLabel = restoring ? t('restore') : t('archive');
      navigation.setOptions({
        ...headerButtons('left', [
          { ...select, contained: true },
          {
            id: 'checkAll',
            label: t('checkAll'),
            icon: 'checkAll',
            onPress: onCheckAll,
          },
        ]),
        ...headerButtons('right', [
          {
            id: 'archive',
            label: archiveLabel,
            icon: restoring ? 'unarchive' : 'archive',
            onPress: onArchiveSelected,
          },
        ]),
        ...getTitleOptions(archiveLabel, selectedCountLabel(selectedCount)),
      });
      return;
    }

    // The filter button is a pull-down menu of the filters, with the current
    // one checked and each one's count beside it.
    const filter = {
      id: 'filter',
      item: {
        type: 'menu',
        identifier: 'filter',
        label: t('filter'),
        icon: {
          type: 'sfSymbol',
          name:
            filterSelected === 'all'
              ? 'line.3.horizontal.decrease.circle'
              : 'line.3.horizontal.decrease.circle.fill',
        },
        menu: {
          items: filterOptions.map(option => ({
            type: 'action',
            label: option.label,
            description: String(option.count),
            icon: { type: 'sfSymbol', name: systemIcons[option.icon].ios },
            state: filterSelected === option.name ? 'on' : 'off',
            onPress: () => onFilterSelect(option.name),
          })),
        },
      } satisfies NativeStackHeaderItem,
      element: (
        <FilterMenu
          label={t('filter')}
          options={filterOptions}
          selected={filterSelected}
          onSelectionChange={onFilterSelect}
        />
      ),
    };
    const courseX: HeaderButton = {
      id: 'courseX',
      label: t('courseX'),
      icon: 'info',
      onPress: onCourseX,
    };

    const moreActions = [reorder, courseX];

    navigation.setOptions({
      ...headerButtons(
        'left',
        isCourse
          ? [
              filter,
              // Beside a third button the title has no room: next to a
              // sidebar of the default width (iOS and Mac), or at a large
              // font scale in a narrow pane (Android). So the less used
              // actions go in a menu: a native More menu, or Material's
              // overflow menu.
              {
                id: 'more',
                item: {
                  type: 'menu',
                  identifier: 'more',
                  label: t('more'),
                  icon: { type: 'sfSymbol', name: systemIcons.more.ios },
                  menu: {
                    items: moreActions.map(button => ({
                      type: 'action',
                      label: button.label,
                      icon: {
                        type: 'sfSymbol',
                        name: systemIcons[button.icon].ios,
                      },
                      onPress: button.onPress,
                    })),
                  },
                },
                element: (
                  <OverflowMenu
                    label={t('more')}
                    items={moreActions}
                    testID="more"
                  />
                ),
              },
            ]
          : [select, filter],
      ),
      ...headerButtons('right', [
        // A window has no pull to refresh (Mac, Windows).
        (DeviceInfo.isMac() || isElectron()) && {
          id: 'refresh',
          label: t('refresh'),
          icon: 'refresh',
          sfSymbol: refreshing
            ? 'arrow.trianglehead.2.clockwise.rotate.90'
            : undefined,
          disabled: refreshing,
          onPress: onRefresh,
        },
        {
          id: 'search',
          label: t('search'),
          icon: 'search',
          onPress: () => navigation.navigate('SearchStack'),
        },
      ]),
      ...getTitleOptions(
        t(TITLES[type]),
        filterSubtitle(filterSelected, defaultSubtitle),
      ),
    });
  }, [
    defaultSubtitle,
    filterOptions,
    filterSelected,
    isCourse,
    latest,
    navigation,
    refreshing,
    reorderMode,
    selectedCount,
    selectionMode,
    type,
  ]);
};

/** Handlers that call the screen's latest ones when pressed. */
const bind = (latest: {
  current: FilterListHeaderHandlers;
}): Required<FilterListHeaderHandlers> => ({
  onRefresh: () => latest.current.onRefresh?.(),
  onFilterSelect: selected => latest.current.onFilterSelect(selected),
  onReorder: () => latest.current.onReorder(),
  onSelect: () => latest.current.onSelect(),
  onCheckAll: () => latest.current.onCheckAll(),
  onArchiveSelected: () => latest.current.onArchiveSelected(),
  onCourseX: () => latest.current.onCourseX(),
});

export default useFilterListHeader;
