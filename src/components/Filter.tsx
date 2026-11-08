import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { t } from 'helpers/i18n';
import { Text } from 'components/Text';
import Divider from 'components/Divider';
import Badge from 'components/Badge';
import Touchable from 'components/Touchable';
import { textOn, useTheme } from 'theme';

export type FilterSelection =
  | 'all'
  | 'unread'
  | 'fav'
  | 'archived'
  | 'hidden'
  | 'unfinished'
  | 'finished';

export interface FilterProps {
  visible: boolean;
  selected: FilterSelection;
  onSelectionChange: (selected: FilterSelection) => void;
  allCount: number;
  unreadCount?: number;
  favCount?: number;
  archivedCount?: number;
  hiddenCount: number;
  unfinishedCount?: number;
}

// Defined outside Filter so that its identity is stable: a component created
// per render remounts every row whenever the parent re-renders (e.g. when a
// toast is dismissed), which drops a tap that is in progress.
const ListItem: React.FC<{
  name: FilterSelection;
  text: string;
  count?: number;
  color?: string;
  badgeColor?: string;
  selected: FilterSelection;
  onSelectionChange: (selected: FilterSelection) => void;
}> = ({
  name,
  text,
  count,
  color,
  badgeColor,
  selected,
  onSelectionChange,
}) => {
  const theme = useTheme();
  const iconColor = theme.colors.onSurfaceVariant;

  return (
    <Touchable
      testID={`filter-${name}`}
      style={styles.listItem}
      onPress={() => onSelectionChange(name)}
      accessibilityRole="button"
      accessibilityState={{ selected: selected === name }}
      // The icons are font glyphs, which would otherwise be read out.
      accessibilityLabel={count === undefined ? text : `${text}, ${count}`}
    >
      <View style={styles.row}>
        {name === 'hidden' ? (
          <MaterialCommunityIcons
            style={styles.icon}
            name="eye-off"
            size={24}
            color={iconColor}
          />
        ) : (
          <MaterialCommunityIcons
            style={styles.icon}
            name={
              name === 'all'
                ? 'inbox'
                : name === 'unread'
                  ? 'email-mark-as-unread'
                  : name === 'fav'
                    ? 'heart'
                    : name === 'archived'
                      ? 'archive'
                      : name === 'unfinished'
                        ? 'checkbox-blank-circle-outline'
                        : 'checkbox-marked-circle-outline'
            }
            size={24}
            color={iconColor}
          />
        )}
        <Text style={styles.text}>{text}</Text>
        <Badge
          style={[
            styles.badge,
            {
              color: color ?? (badgeColor ? textOn(badgeColor) : 'white'),
              backgroundColor: badgeColor,
            },
          ]}
        >
          {count}
        </Badge>
        <View style={styles.flex} />
        {selected === name ? (
          <MaterialCommunityIcons
            style={styles.check}
            name="check"
            size={24}
            color={iconColor}
          />
        ) : null}
      </View>
    </Touchable>
  );
};

const Filter: React.FC<React.PropsWithChildren<FilterProps>> = ({
  visible,
  selected,
  onSelectionChange,
  allCount,
  unreadCount,
  favCount,
  archivedCount,
  hiddenCount,
  unfinishedCount,
}) => {
  const theme = useTheme();

  const position = useSharedValue(visible ? 1 : 0);
  const [height, setHeight] = useState(0);

  const heightStyle = useAnimatedStyle(() => {
    return {
      height: position.value * height,
    };
  }, [height]);

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    setHeight(nativeEvent.layout.height);
  };

  useEffect(() => {
    if (visible) {
      position.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    } else {
      position.value = withTiming(0, {
        duration: 100,
        easing: Easing.in(Easing.ease),
      });
    }
  }, [visible, position]);

  const itemProps = { selected, onSelectionChange };

  return (
    <Animated.View
      style={[
        styles.root,
        { backgroundColor: theme.colors.surface },
        heightStyle,
      ]}
    >
      <View style={styles.content} onLayout={handleLayout}>
        {unfinishedCount !== undefined ? (
          <ListItem
            {...itemProps}
            name="unfinished"
            text={t('unfinished')}
            count={unfinishedCount}
            badgeColor={theme.colors.status.orange}
          />
        ) : null}
        {unfinishedCount !== undefined ? (
          <ListItem
            {...itemProps}
            name="finished"
            text={t('finished')}
            count={allCount - unfinishedCount}
            badgeColor={theme.colors.status.green}
          />
        ) : null}
        <ListItem
          {...itemProps}
          name="all"
          text={t('all')}
          count={allCount}
          badgeColor={theme.colors.status.grey}
        />
        {unreadCount !== undefined ? (
          <ListItem
            {...itemProps}
            name="unread"
            text={t('unread')}
            count={unreadCount}
            badgeColor={theme.colors.status.blue}
          />
        ) : null}
        {favCount !== undefined ? (
          <ListItem
            {...itemProps}
            name="fav"
            text={t('fav')}
            count={favCount}
            badgeColor={theme.colors.status.red}
          />
        ) : null}
        {archivedCount !== undefined ? (
          <ListItem
            {...itemProps}
            name="archived"
            text={t('archived')}
            count={archivedCount}
            badgeColor={theme.colors.status.grey}
          />
        ) : null}
        <ListItem
          {...itemProps}
          name="hidden"
          text={t('hidden')}
          count={hiddenCount}
          badgeColor={theme.colors.status.grey}
        />
        <Divider />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    elevation: 2,
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  // Paper's List.Item heights: 54 pt on iOS (its title had 8 pt of top
  // padding there) and 52 pt on Android.
  listItem: {
    height: Platform.OS === 'ios' ? 54 : 52,
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginLeft: 16,
  },
  text: {
    fontSize: 16,
    marginLeft: 8,
  },
  badge: {
    alignSelf: 'center',
    marginLeft: 8,
  },
  flex: {
    flex: 1,
  },
  check: {
    marginLeft: 16,
  },
});

export default Filter;
