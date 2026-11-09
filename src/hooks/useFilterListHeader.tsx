import { useEffect } from 'react';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { ParamListBase } from '@react-navigation/native';
import FilterMenu from 'components/FilterMenu';
import { iconSymbols } from 'components/IconButton.shared';
import { getTitleOptions } from 'components/HeaderTitle';
import DeviceInfo from 'constants/DeviceInfo';
import {
  filterSubtitle,
  selectedCountLabel,
  type FilterOption,
  type FilterSelection,
} from 'helpers/filters';
import { t } from 'helpers/i18n';
import { headerButtons, type HeaderButton } from 'navigation/headerButtons';
import { RootStackParams } from 'screens/types';

const TITLES = {
  notice: 'notices',
  assignment: 'assignments',
  file: 'files',
  course: 'courses',
} as const;

export interface FilterListHeaderOptions {
  navigation: Pick<NativeStackNavigationProp<ParamListBase>, 'setOptions'> &
    Pick<NativeStackNavigationProp<RootStackParams>, 'navigate'>;
  type: keyof typeof TITLES;
  defaultSubtitle?: string;
  filterSelected: FilterSelection;
  reorderMode: boolean;
  selectionMode: boolean;
  selectedCount: number;
  refreshing: boolean;
  onRefresh?: () => void;
  /** The choices in the filter menu */
  filterOptions: FilterOption[];
  onFilterSelect: (selected: FilterSelection) => void;
  onReorder: () => void;
  onSelect: () => void;
  onCheckAll: () => void;
  /** Archives (or restores, in the archived filter) the checked items */
  onArchiveSelected: () => void;
  onCourseX: () => void;
}

/**
 * Sets a FilterList screen's header for its three modes: reorder (courses),
 * selection (archive or restore the checked items), and the default with
 * filter, select or reorder, Course X, refresh (Mac) and search.
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
  onRefresh,
  filterOptions,
  onFilterSelect,
  onReorder,
  onSelect,
  onCheckAll,
  onArchiveSelected,
  onCourseX,
}: FilterListHeaderOptions) => {
  const isCourse = type === 'course';

  useEffect(() => {
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
        ...getTitleOptions(t('reorder'), t('dragToReorder')),
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
            icon: restoring ? 'restore' : 'archive',
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
            icon: { type: 'sfSymbol', name: option.sfSymbol },
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

    navigation.setOptions({
      ...headerButtons(
        'left',
        isCourse
          ? [
              { ...reorder, nativeItem: false },
              filter,
              { ...courseX, nativeItem: false },
              // A third native button leaves the title no room beside a
              // sidebar of the default width, so the rest go in a menu.
              {
                id: 'more',
                item: {
                  type: 'menu',
                  identifier: 'more',
                  label: t('more'),
                  icon: { type: 'sfSymbol', name: 'ellipsis.circle' },
                  menu: {
                    items: [reorder, courseX].map(button => ({
                      type: 'action',
                      label: button.label,
                      icon: {
                        type: 'sfSymbol',
                        name: iconSymbols[button.icon],
                      },
                      onPress: button.onPress,
                    })),
                  },
                },
              },
            ]
          : [select, filter],
      ),
      ...headerButtons('right', [
        DeviceInfo.isMac() && {
          id: 'refresh',
          label: t('refresh'),
          icon: 'refresh',
          sfSymbol: refreshing
            ? 'arrow.trianglehead.2.clockwise.rotate.90'
            : undefined,
          disabled: refreshing,
          onPress: () => onRefresh?.(),
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
    navigation,
    onArchiveSelected,
    onCheckAll,
    onCourseX,
    onFilterSelect,
    onRefresh,
    onReorder,
    onSelect,
    refreshing,
    reorderMode,
    selectedCount,
    selectionMode,
    type,
  ]);
};

export default useFilterListHeader;
