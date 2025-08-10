import { memo, useCallback, useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { Badge, Divider, List, Text, useTheme } from 'react-native-paper';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { t } from 'helpers/i18n';
import Colors from 'constants/Colors';

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
  const [layout, setLayout] = useState({
    height: 0,
    measured: false,
  });

  const heightStyle = useAnimatedStyle(() => {
    return {
      height: position.value * layout.height,
    };
  }, [layout]);
  const transformStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: (position.value - 1) * layout.height }],
    };
  }, [layout]);

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const { height } = nativeEvent.layout;
    setLayout({ height, measured: true });
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

  const ListItem: React.FC<
    React.PropsWithChildren<{
      name: FilterSelection;
      text: string;
      count?: number;
      color?: string;
      badgeColor?: string;
    }>
  > = useCallback(
    ({ name, text, count, color, badgeColor }) => (
      <List.Item
        style={styles.listItem}
        titleStyle={styles.title}
        title={
          <View style={styles.flexRow}>
            <Text style={styles.text}>{text}</Text>
            <Badge
              visible
              style={[
                styles.badge,
                { color: color ?? 'white', backgroundColor: badgeColor },
              ]}
            >
              {count}
            </Badge>
          </View>
        }
        left={props => (
          <List.Icon
            {...props}
            icon={
              name === 'all'
                ? 'inbox'
                : name === 'unread'
                  ? 'email-mark-as-unread'
                  : name === 'fav'
                    ? 'heart'
                    : name === 'archived'
                      ? 'archive'
                      : name === 'hidden'
                        ? p => <MaterialIcons name="visibility-off" {...p} />
                        : name === 'unfinished'
                          ? 'checkbox-blank-circle-outline'
                          : 'checkbox-marked-circle-outline'
            }
          />
        )}
        right={
          selected === name
            ? props => <List.Icon {...props} icon="check" />
            : undefined
        }
        onPress={() => onSelectionChange(name)}
      />
    ),
    [onSelectionChange, selected],
  );

  return (
    <Animated.View
      style={[styles.root, { backgroundColor: theme.colors.surface }]}
    >
      <Animated.View style={heightStyle} />
      <Animated.View
        onLayout={handleLayout}
        style={[
          layout.measured || !visible ? [styles.absolute, transformStyle] : [],
          !visible ? { opacity: 0 } : { opacity: 100 },
        ]}
      >
        {unfinishedCount !== undefined ? (
          <ListItem
            name="unfinished"
            text={t('unfinished')}
            count={unfinishedCount}
            badgeColor={Colors.orange500}
          />
        ) : null}
        {unfinishedCount !== undefined ? (
          <ListItem
            name="finished"
            text={t('finished')}
            count={allCount - unfinishedCount}
            badgeColor={Colors.green500}
          />
        ) : null}
        <ListItem
          name="all"
          text={t('all')}
          count={allCount}
          badgeColor={Colors.grey500}
        />
        {unreadCount !== undefined ? (
          <ListItem
            name="unread"
            text={t('unread')}
            count={unreadCount}
            badgeColor={Colors.blue500}
          />
        ) : null}
        {favCount !== undefined ? (
          <ListItem
            name="fav"
            text={t('fav')}
            count={favCount}
            badgeColor={Colors.red500}
          />
        ) : null}
        {archivedCount !== undefined ? (
          <ListItem
            name="archived"
            text={t('archived')}
            count={archivedCount}
            badgeColor={Colors.grey500}
          />
        ) : null}
        <ListItem
          name="hidden"
          text={t('hidden')}
          count={hiddenCount}
          badgeColor={Colors.grey500}
        />
        <Divider />
      </Animated.View>
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
  },
  listItem: {
    paddingHorizontal: 16,
  },
  title: { marginTop: Platform.OS === 'ios' ? 7 : undefined, marginLeft: -12 },
  absolute: {
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  text: {
    fontSize: 16,
    marginLeft: 4,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginLeft: 8,
  },
});

export default memo(Filter);
