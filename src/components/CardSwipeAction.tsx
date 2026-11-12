import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { statusContainerOpacity, useTheme } from 'theme';
import {
  CardSwipeActionProps,
  FULL_SWIPE,
  swipedShare,
} from './CardSwipeAction.shared';
import CardActionIcon from './CardActionIcon';
import { Text } from './Text';
import Touchable from './Touchable';

export type { CardSwipeActionProps, SwipeSide } from './CardSwipeAction.shared';

const buttonWidth = 80;

/**
 * A card's swipe action on iOS, as in Mail: a button the swipe reveals and
 * rests open on, which stretches as the swipe goes on. Past `FULL_SWIPE` its
 * icon jumps to the card's edge and letting go runs it.
 */
const CardSwipeAction: React.FC<CardSwipeActionProps> = ({
  side,
  action,
  translation,
  rowWidth,
  onArmedChange,
  onPress,
}) => {
  const theme = useTheme();
  const leading = side === 'leading';
  const armedProgress = useSharedValue(0);

  useAnimatedReaction(
    () => swipedShare(side, translation.get(), rowWidth.get()) > FULL_SWIPE,
    (armed, previous) => {
      if (previous !== null && armed !== previous) {
        armedProgress.set(withTiming(armed ? 1 : 0, { duration: 150 }));
        scheduleOnRN(onArmedChange, armed);
      }
    },
  );

  // The revealed area: from the screen's edge to the card's.
  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, (leading ? 1 : -1) * translation.get()),
  }));

  // The icon and name slide in with the card, then wait at the screen's edge
  // until the swipe is long enough to run the action.
  const contentStyle = useAnimatedStyle(() => {
    const extra = (leading ? 1 : -1) * translation.get() - buttonWidth;
    const offset =
      Math.min(0, extra) + Math.max(0, extra) * armedProgress.get();
    return {
      transform: [{ translateX: (leading ? 1 : -1) * offset }],
    };
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.fill, leading ? styles.left : styles.right, fillStyle]}
      >
        <Touchable
          testID={action.testID}
          accessibilityLabel={action.label}
          accessibilityRole="button"
          type="opacity"
          style={StyleSheet.absoluteFill}
          onPress={onPress}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.colors.statusContainer[action.tone],
                opacity: statusContainerOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.content,
              leading ? styles.left : styles.right,
              contentStyle,
            ]}
          >
            <CardActionIcon action={action} size={28} />
            {/* Named under the icon, as in Mail; VoiceOver reads the button's label. */}
            <Text
              variant="caption"
              numberOfLines={1}
              importantForAccessibility="no"
              style={[
                styles.label,
                { color: theme.colors.onStatusContainer[action.tone] },
              ]}
            >
              {action.label}
            </Text>
          </Animated.View>
        </Touchable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Its width is how far the card rests open.
  root: {
    width: buttonWidth,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  left: {
    left: 0,
  },
  right: {
    right: 0,
  },
  content: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: buttonWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  label: {
    marginTop: 4,
    fontWeight: '600',
  },
});

export default CardSwipeAction;
