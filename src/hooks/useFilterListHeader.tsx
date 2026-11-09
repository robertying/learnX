import { useEffect } from 'react';
import { View } from 'react-native';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { ParamListBase } from '@react-navigation/native';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import FilterMenu from 'components/FilterMenu';
import HeaderTitle from 'components/HeaderTitle';
import IconButton from 'components/IconButton';
import DeviceInfo from 'constants/DeviceInfo';
import { filterSubtitle, selectedCountLabel } from 'helpers/filterList';
import type { FilterOption, FilterSelection } from 'helpers/filterOptions';
import { t } from 'helpers/i18n';
import { RootStackParams } from 'screens/types';

const TITLES = {
  notice: 'notices',
  assignment: 'assignments',
  file: 'files',
  course: 'courses',
} as const;

const getHeaderTitleOptions = (title: string, subtitle?: string) =>
  DeviceInfo.supportsNativeSubtitle()
    ? { title, headerSubtitle: subtitle }
    : {
        headerTitle: () => <HeaderTitle title={title} subtitle={subtitle} />,
      };

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
    // The filter button is a pull-down menu of the filters, with the current
    // one checked and each one's count beside it.
    const filterItem: NativeStackHeaderItem = {
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
    };

    if (reorderMode) {
      navigation.setOptions({
        unstable_headerLeftItems: () => [
          {
            type: 'button',
            identifier: 'reorder',
            label: t('reorder'),
            icon: {
              type: 'sfSymbol',
              name: 'arrow.up.and.down',
            },
            onPress: onReorder,
          },
        ],
        unstable_headerRightItems: () => [],

        headerLeft: () => (
          <IconButton
            accessibilityLabel={t('reorder')}
            icon={props => <MaterialCommunityIcons {...props} name="sort" />}
            onPress={onReorder}
            mode="contained"
          />
        ),
        headerRight: () => <View />,
        ...getHeaderTitleOptions(t('reorder'), t('dragToReorder')),
      });
    } else if (selectionMode) {
      navigation.setOptions({
        unstable_headerLeftItems: () => [
          {
            type: 'button',
            identifier: 'select',
            label: t('select'),
            icon: {
              type: 'sfSymbol',
              name: 'checklist',
            },
            onPress: onSelect,
          },
          {
            type: 'button',
            identifier: 'checkAll',
            label: t('checkAll'),
            icon: {
              type: 'sfSymbol',
              name: 'checkmark.circle.fill',
            },
            onPress: onCheckAll,
          },
        ],
        unstable_headerRightItems: () => [
          {
            type: 'button',
            identifier: 'archive',
            label: filterSelected === 'archived' ? t('restore') : t('archive'),
            icon: {
              type: 'sfSymbol',
              name:
                filterSelected === 'archived' ? 'arrow.up.bin' : 'archivebox',
            },
            onPress: onArchiveSelected,
          },
        ],

        headerLeft: () => (
          <>
            <IconButton
              accessibilityLabel={t('select')}
              onPress={onSelect}
              icon={props => (
                <MaterialCommunityIcons
                  {...props}
                  name="format-list-bulleted"
                />
              )}
              mode="contained"
            />
            <IconButton
              accessibilityLabel={t('checkAll')}
              onPress={onCheckAll}
              icon={props => (
                <MaterialCommunityIcons {...props} name="check-all" />
              )}
            />
          </>
        ),
        headerRight: () => (
          <IconButton
            accessibilityLabel={
              filterSelected === 'archived' ? t('restore') : t('archive')
            }
            onPress={onArchiveSelected}
            icon={props => (
              <MaterialCommunityIcons
                {...props}
                name={
                  filterSelected === 'archived'
                    ? 'archive-arrow-up'
                    : 'archive-arrow-down'
                }
              />
            )}
          />
        ),
        ...getHeaderTitleOptions(
          filterSelected === 'archived' ? t('restore') : t('archive'),
          selectedCountLabel(selectedCount),
        ),
      });
    } else {
      navigation.setOptions({
        unstable_headerLeftItems: () =>
          isCourse
            ? [
                filterItem,
                // A third button leaves the title no room beside a sidebar of
                // the default width, so the rest go in a menu.
                {
                  type: 'menu',
                  identifier: 'more',
                  label: t('more'),
                  icon: {
                    type: 'sfSymbol',
                    name: 'ellipsis.circle',
                  },
                  menu: {
                    items: [
                      {
                        type: 'action',
                        label: t('reorder'),
                        icon: {
                          type: 'sfSymbol',
                          name: 'arrow.up.and.down',
                        },
                        onPress: onReorder,
                      },
                      {
                        type: 'action',
                        label: t('courseX'),
                        icon: {
                          type: 'sfSymbol',
                          name: 'info.circle',
                        },
                        onPress: onCourseX,
                      },
                    ],
                  },
                },
              ]
            : [
                {
                  type: 'button',
                  identifier: 'select',
                  label: t('select'),
                  icon: {
                    type: 'sfSymbol',
                    name: 'checklist',
                  },
                  onPress: onSelect,
                },
                filterItem,
              ],
        unstable_headerRightItems: () => [
          ...(DeviceInfo.isMac()
            ? ([
                {
                  type: 'button',
                  identifier: 'refresh',
                  label: t('refresh'),
                  icon: {
                    type: 'sfSymbol',
                    name: refreshing
                      ? 'arrow.trianglehead.2.clockwise.rotate.90'
                      : 'arrow.clockwise',
                  },
                  disabled: refreshing,
                  onPress: () => onRefresh?.(),
                },
              ] satisfies NativeStackHeaderItem[])
            : []),
          {
            type: 'button',
            identifier: 'search',
            label: t('search'),
            icon: {
              type: 'sfSymbol',
              name: 'magnifyingglass',
            },
            onPress: () => navigation.navigate('SearchStack'),
          },
        ],

        headerLeft: () => (
          <>
            {isCourse ? (
              <IconButton
                accessibilityLabel={t('reorder')}
                icon={props => (
                  <MaterialCommunityIcons {...props} name="sort" />
                )}
                onPress={onReorder}
              />
            ) : (
              <IconButton
                accessibilityLabel={t('select')}
                onPress={onSelect}
                icon={props => (
                  <MaterialCommunityIcons
                    {...props}
                    name="format-list-bulleted"
                  />
                )}
              />
            )}
            <FilterMenu
              label={t('filter')}
              options={filterOptions}
              selected={filterSelected}
              onSelectionChange={onFilterSelect}
            />
            {isCourse && (
              <IconButton
                accessibilityLabel={t('courseX')}
                icon={props => (
                  <MaterialCommunityIcons
                    {...props}
                    name="information-outline"
                  />
                )}
                onPress={onCourseX}
              />
            )}
          </>
        ),
        headerRight: () => (
          <>
            {DeviceInfo.isMac() && (
              <IconButton
                accessibilityLabel={t('refresh')}
                disabled={refreshing}
                onPress={onRefresh}
                icon={props => (
                  <MaterialCommunityIcons {...props} name="refresh" />
                )}
              />
            )}
            <IconButton
              accessibilityLabel={t('search')}
              onPress={() => navigation.navigate('SearchStack')}
              icon={props => (
                <MaterialCommunityIcons {...props} name="magnify" />
              )}
            />
          </>
        ),
        ...getHeaderTitleOptions(
          t(TITLES[type]),
          filterSubtitle(filterSelected, defaultSubtitle),
        ),
      });
    }
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
