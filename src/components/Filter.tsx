import {memo, useEffect, useRef, useState} from 'react';
import {LayoutChangeEvent, Platform, StyleSheet, View} from 'react-native';
import {Badge, Colors, Divider, List, Surface, Text} from 'react-native-paper';
import Animated, {EasingNode} from 'react-native-reanimated';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {t} from 'helpers/i18n';

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

const Filter: React.FC<FilterProps> = ({
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
  const position = useRef(new Animated.Value(visible ? 1 : 0));
  const [layout, setLayout] = useState({
    height: 0,
    measured: false,
  });

  const height = Animated.multiply(position.current, layout.height);
  const translateY = Animated.multiply(
    Animated.add(position.current, -1),
    layout.height,
  );

  const handleLayout = ({nativeEvent}: LayoutChangeEvent) => {
    const {height} = nativeEvent.layout;
    setLayout({height, measured: true});
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(position.current, {
        duration: 200,
        toValue: 1,
        easing: EasingNode.out(EasingNode.ease),
      }).start();
    } else {
      Animated.timing(position.current, {
        duration: 200,
        toValue: 0,
        easing: EasingNode.in(EasingNode.ease),
      }).start();
    }
  }, [visible, position]);

  const ListItem: React.FC<{
    name: FilterSelection;
    text: string;
    count?: number;
    color?: string;
    badgeColor?: string;
  }> = ({name, text, count, color, badgeColor}) => (
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
              {color: color ?? 'white', backgroundColor: badgeColor},
            ]}>
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
  );

  return (
    <Surface style={styles.root}>
      <Animated.View style={{height}} />
      <Animated.View
        onLayout={handleLayout}
        style={[
          layout.measured || !visible
            ? [styles.absolute, {transform: [{translateY}]}]
            : null,
          !layout.measured && !visible ? {opacity: 0} : null,
        ]}>
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
    </Surface>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  listItem: {
    paddingHorizontal: 16,
  },
  title: {marginTop: Platform.OS === 'ios' ? 7 : undefined, marginLeft: -12},
  absolute: {
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  text: {
    fontSize: 16,
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
