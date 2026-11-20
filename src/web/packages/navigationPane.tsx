import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type PressableStateCallbackType,
} from 'react-native';
import {
  createNavigatorFactory,
  TabActions,
  TabRouter,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type NavigationRoute,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
} from '@react-navigation/native';
import {
  Button,
  Portal,
  Tooltip,
  useArrowNavigationGroup,
} from '@fluentui/react-components';
import BadgeDot from 'components/Badge';
import SystemIcon from 'components/SystemIcon';
import { Text } from 'components/Text';
import { t } from 'helpers/i18n';
import { systemIcons, type SystemIconName } from 'helpers/systemIcons';
import { savePaneExpanded, savedPaneExpanded } from 'navigation/paneLayout';
import { useNavigationPaneSlot } from 'navigation/WindowFrame';
import { useTheme } from 'theme';

/** The screen options MainTab sets that this navigator draws. */
interface TabOptions {
  title?: string;
  tabBarButtonTestID?: string;
  lazy?: boolean;
  /** Android's drawable names (`tab_<symbol>`, `_filled` when selected). */
  tabBarIcon?: (props: { focused: boolean }) => { uri?: string } | undefined;
  /** Any string shows a dot (Settings' badge). */
  tabBarBadge?: string;
}

/** The app's icon for a tab, from the Android drawable MainTab names. */
const iconByDrawable = new Map<string, SystemIconName>();
for (const [name, icon] of Object.entries(systemIcons)) {
  if (!iconByDrawable.has(icon.android)) {
    iconByDrawable.set(icon.android, name as SystemIconName);
  }
}
export const tabIcon = (drawable: { uri?: string } | undefined) =>
  iconByDrawable.get(
    drawable?.uri?.replace(/^tab_/, '').replace(/_filled$/, '') ?? '',
  );

/** The pane's widths: Windows' NavigationView, expanded and compact. */
export const PANE_WIDTH = { expanded: 240, compact: 48 } as const;
/** Windows expands the pane by itself from this window width. */
export const EXPANDED_FROM = 1008;

type TabNavigatorProps = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  TabOptions,
  { tabPress: { data: undefined; canPreventDefault: true } },
  unknown
> &
  TabRouterOptions & {
    /** The phone's keyboard hides the tab bar; a window's pane stays. */
    tabBarHidden?: boolean;
  };

type PaneItemProps = {
  route: NavigationRoute<ParamListBase, string>;
  options: TabOptions;
  selected: boolean;
  expanded: boolean;
  onPress: () => void;
};

const PaneItem = ({
  route,
  options,
  selected,
  expanded,
  onPress,
}: PaneItemProps) => {
  const theme = useTheme();
  const title = options.title ?? route.name;
  const badge = options.tabBarBadge !== undefined;
  const icon = tabIcon(options.tabBarIcon?.({ focused: selected }));
  const item = (
    <Pressable
      role="tab"
      aria-selected={selected}
      // The badge's dot is said with the title, as the Mac sidebar says it.
      aria-label={badge ? `${title}, ${t('a11yNewBadge')}` : title}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      style={({
        hovered,
        pressed,
      }: PressableStateCallbackType & { hovered?: boolean }) => [
        styles.item,
        (selected || hovered || pressed) && {
          backgroundColor: pressed
            ? theme.colors.surfaceVariant
            : theme.colors.secondaryContainer,
        },
      ]}
    >
      {/* Windows' selection pill at the item's leading edge */}
      <View
        style={[
          styles.pill,
          selected && { backgroundColor: theme.colors.primary },
        ]}
      />
      <View>
        {icon ? (
          <SystemIcon
            name={icon}
            size={20}
            filled={selected}
            color={selected ? theme.colors.primary : theme.colors.onSurface}
          />
        ) : null}
        {badge ? <BadgeDot style={styles.badge} /> : null}
      </View>
      {expanded ? (
        <Text numberOfLines={1} style={selected && styles.selectedTitle}>
          {title}
        </Text>
      ) : null}
    </Pressable>
  );
  return expanded ? (
    item
  ) : (
    // The item has its own label: the tooltip only shows the title.
    <Tooltip content={title} relationship="inaccessible" positioning="after">
      {item}
    </Tooltip>
  );
};

/**
 * Stands in for react-native-bottom-tabs' native tab bar in the Electron app:
 * Windows' navigation pane (NavigationView) at the window's leading edge,
 * drawn into `WindowFrame`'s slot. It shows the tabs' icons and titles,
 * expanded in a wide window and as a rail of icons in a narrower one, with
 * the menu button switching between them for good, and Settings at its foot. Each
 * tab's screen stays mounted once shown.
 */
function TabNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  screenListeners,
  screenOptions,
}: TabNavigatorProps) {
  const theme = useTheme();
  const slot = useNavigationPaneSlot();
  const { width } = useWindowDimensions();
  // The user's choice of the menu button, kept across launches, or the
  // window's width until they make one.
  const [expandedChoice, setExpandedChoice] = useState(savedPaneExpanded);
  const expanded = expandedChoice ?? width >= EXPANDED_FROM;
  const { state, descriptors, navigation, NavigationContent } =
    useNavigationBuilder<
      TabNavigationState<ParamListBase>,
      TabRouterOptions,
      TabActionHelpers<ParamListBase>,
      TabOptions,
      { tabPress: { data: undefined; canPreventDefault: true } }
    >(TabRouter, {
      id,
      initialRouteName,
      backBehavior,
      children,
      screenListeners,
      screenOptions,
    });

  // One stop for Tab, with the arrow keys between the tabs, as a tab list
  // and Windows' navigation pane take them: Tab goes on to the page.
  const arrowKeys = useArrowNavigationGroup({
    axis: 'vertical',
    circular: true,
    memorizeCurrent: true,
  });

  const selectedKey = state.routes[state.index].key;
  const [shown, setShown] = useState([selectedKey]);
  if (!shown.includes(selectedKey)) {
    setShown([...shown, selectedKey]);
  }

  const select = (routeName: string, key: string) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.dispatch({
        ...TabActions.jumpTo(routeName),
        target: state.key,
      });
    }
  };

  const renderItem = (route: NavigationRoute<ParamListBase, string>) => (
    <PaneItem
      key={route.key}
      route={route}
      options={descriptors[route.key].options}
      selected={route.key === selectedKey}
      expanded={expanded}
      onPress={() => select(route.name, route.key)}
    />
  );
  const settings = state.routes.filter(r => r.name === 'SettingStack');
  const pane = (
    <View
      role="navigation"
      testID="navigation-pane"
      style={[
        styles.pane,
        {
          width: expanded ? PANE_WIDTH.expanded : PANE_WIDTH.compact,
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.toggle}>
        <Tooltip
          content={expanded ? t('collapseSidebar') : t('expandSidebar')}
          relationship="label"
        >
          <Button
            appearance="subtle"
            aria-expanded={expanded}
            data-testid="navigation-pane-toggle"
            onClick={() => {
              setExpandedChoice(!expanded);
              savePaneExpanded(!expanded);
            }}
            style={toggleSize}
            icon={
              <SystemIcon
                name="sidebar"
                size={20}
                color={theme.colors.onSurface}
              />
            }
          />
        </Tooltip>
      </View>
      {/* One list of tabs, Settings at its foot included. */}
      <View
        role="tablist"
        aria-orientation="vertical"
        // React Native Web's `dataSet` writes Tabster's data attribute.
        {...({ dataSet: { tabster: arrowKeys['data-tabster'] } } as object)}
        style={styles.items}
      >
        {state.routes.filter(r => r.name !== 'SettingStack').map(renderItem)}
        <View style={styles.footer}>{settings.map(renderItem)}</View>
      </View>
    </View>
  );

  return (
    <NavigationContent>
      <View style={styles.window}>
        {slot ? <Portal mountNode={slot as HTMLElement}>{pane}</Portal> : pane}
        <View style={styles.content}>
          {state.routes
            .filter(
              route =>
                shown.includes(route.key) ||
                !descriptors[route.key].options.lazy,
            )
            .map(route => (
              <View
                key={route.key}
                style={[
                  StyleSheet.absoluteFill,
                  route.key !== selectedKey && styles.hidden,
                ]}
              >
                {descriptors[route.key].render()}
              </View>
            ))}
        </View>
      </View>
    </NavigationContent>
  );
}

const ITEM_HEIGHT = 40;

/**
 * The menu button, square at an item's height: its icon's center is then
 * 20 px in, as a tab's is (10 px padding and half a 20 px icon), so the
 * icons line up in the rail.
 */
const toggleSize = {
  width: ITEM_HEIGHT,
  minWidth: ITEM_HEIGHT,
  height: ITEM_HEIGHT,
};

const styles = StyleSheet.create({
  window: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  pane: {
    flex: 1,
    borderRightWidth: 1,
    paddingVertical: 4,
    gap: 4,
    // Windows animates the pane opening and closing.
    transitionProperty: 'width',
    transitionDuration: '150ms',
    overflow: 'hidden',
  } as object,
  toggle: {
    marginHorizontal: 4,
    alignSelf: 'flex-start',
  },
  items: {
    flex: 1,
    gap: 2,
  },
  footer: {
    marginTop: 'auto',
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: ITEM_HEIGHT,
    marginHorizontal: 4,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 4,
  },
  pill: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
  },
  selectedTitle: {
    fontWeight: '600',
  },
  hidden: {
    display: 'none',
  },
});

export const createNativeBottomTabNavigator =
  createNavigatorFactory(TabNavigator);
