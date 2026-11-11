import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from 'theme';
import {
  CardSwipeActionProps,
  FULL_SWIPE,
  swipedShare,
} from './CardSwipeAction.shared';
import CardActionIcon from './CardActionIcon';

/**
 * A card's swipe action on Android, as in Gmail: the card slides over a
 * full-width background in the action's color with its icon at the edge it
 * leaves. Let go past `FULL_SWIPE` (or flung), the card slides off and the
 * action runs; short of it, the card springs back. The icon grows as the swipe
 * passes that point. TalkBack gets the actions from the card itself.
 */
const CardSwipeAction: React.FC<CardSwipeActionProps> = ({
  side,
  action,
  translation,
  rowWidth,
  onArmedChange,
}) => {
  const theme = useTheme();
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

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.25 * armedProgress.get() }],
  }));

  return (
    <View
      testID={action.testID}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.root,
        side === 'leading' ? styles.leading : styles.trailing,
        { backgroundColor: theme.colors.statusContainer[action.tone] },
      ]}
    >
      <Animated.View style={iconStyle}>
        <CardActionIcon action={action} size={24} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // The whole card's width, so the swipe opens all the way across.
  root: {
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  leading: {
    alignItems: 'flex-start',
  },
  trailing: {
    alignItems: 'flex-end',
  },
});

export default CardSwipeAction;
