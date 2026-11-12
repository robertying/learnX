import { useLayoutEffect, useRef } from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { type HeaderButton, headerButtons } from 'navigation/headerButtons';

/**
 * Shows `buttons` on one side of the screen's header, set before the screen
 * is drawn so they never appear a frame late. Each button's `onPress` is
 * called as it is at the time of the press, so callers pass plain functions;
 * the header is only set again when what the buttons show changes. Falsy
 * entries are left out, as in `headerButtons`.
 */
const useHeaderButtons = (
  navigation: Pick<NavigationProp<ParamListBase>, 'setOptions'>,
  side: 'left' | 'right',
  buttons: (HeaderButton | false | null | undefined)[],
) => {
  const shown = buttons.filter(button => !!button);
  const handlers = useRef(new Map<string, () => void>());
  useLayoutEffect(() => {
    handlers.current = new Map(
      shown.map(button => [button.id, button.onPress]),
    );
  });

  // What the buttons show, without their handlers.
  const look = JSON.stringify(shown, (key, value) =>
    key === 'onPress' ? undefined : value,
  );
  useLayoutEffect(() => {
    const described: Omit<HeaderButton, 'onPress'>[] = JSON.parse(look);
    navigation.setOptions(
      headerButtons(
        side,
        described.map(button => ({
          ...button,
          onPress: () => handlers.current.get(button.id)?.(),
        })),
      ),
    );
  }, [navigation, side, look]);
};

export default useHeaderButtons;
