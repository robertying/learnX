import { useEffect, useEffectEvent } from 'react';
import { AppCommand, Menus } from 'modules/menus';

/**
 * Runs `handler` when the menu bar command (or its shortcut) is chosen on
 * iPad or Mac, while `enabled`. Several screens stay mounted at once, so
 * enable it only on the one that should respond, usually the focused one.
 */
const useAppCommand = (
  command: AppCommand,
  handler: () => void,
  enabled = true,
) => {
  const onCommand = useEffectEvent(handler);

  useEffect(() => {
    if (!enabled || !Menus) {
      return;
    }
    const subscription = Menus.addListener('onCommand', event => {
      if (event.command === command) {
        onCommand();
      }
    });
    return () => subscription.remove();
  }, [command, enabled]);
};

export default useAppCommand;
