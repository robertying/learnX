import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from 'theme';
import {
  CardSwipeActionProps,
  swipedShare,
  useArmedProgress,
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
  const armedProgress = useArmedProgress({
    side,
    translation,
    rowWidth,
    onArmedChange,
  });

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.25 * armedProgress.get() }],
  }));

  // Both sides' panels fill the card, the trailing one over the leading one,
  // so only the side the card is moving away from shows.
  const rootStyle = useAnimatedStyle(() => ({
    opacity: swipedShare(side, translation.get(), rowWidth.get()) > 0 ? 1 : 0,
  }));

  return (
    <Animated.View
      testID={action.testID}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.root,
        side === 'leading' ? styles.leading : styles.trailing,
        { backgroundColor: theme.colors.statusContainer[action.tone] },
        rootStyle,
      ]}
    >
      <Animated.View style={iconStyle}>
        <CardActionIcon action={action} size={24} />
      </Animated.View>
    </Animated.View>
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
