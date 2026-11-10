import { StyleSheet, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { CardAction } from 'helpers/cardActions';
import { statusContainerOpacity, useTheme } from 'theme';
import CardActionIcon from './CardActionIcon';
import Touchable from './Touchable';

const buttonWidth = 80;

/** The buttons a card reveals when swiped; each closes the swipe after */
const CardSwipeActions: React.FC<{
  position: 'left' | 'right';
  translation: SharedValue<number>;
  swipeableMethods: SwipeableMethods;
  actions: CardAction[];
  onAction: (action: CardAction) => void;
}> = ({ position, translation, swipeableMethods, actions, onAction }) => {
  const theme = useTheme();
  const totalButtonWidth = buttonWidth * actions.length;

  const actionStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX:
            position === 'right'
              ? translation.get() + totalButtonWidth
              : translation.get() - totalButtonWidth,
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.drawer, { width: totalButtonWidth }, actionStyle]}
    >
      {actions.map(action => (
        <Touchable
          key={action.key}
          testID={action.testID}
          accessibilityLabel={action.label}
          accessibilityRole="button"
          type="opacity"
          style={styles.button}
          onPress={() => {
            onAction(action);
            swipeableMethods.close();
          }}
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
          <CardActionIcon action={action} size={40} />
        </Touchable>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  drawer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    height: '100%',
    width: buttonWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CardSwipeActions;
