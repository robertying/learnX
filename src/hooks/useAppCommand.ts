import { useEffect, useEffectEvent } from 'react';
import { AppCommand, Menus } from 'modules/menus';
import { useWindow } from 'hooks/useWindow';
import { isTargetWindow } from 'services/windows';

/**
 * Runs `handler` when the menu bar command (or its shortcut) is chosen on
 * iPad or Mac, while `enabled`. Several screens stay mounted at once, so
 * enable it only on the one that should respond, usually the focused one.
 * With several windows, only the key window's screens respond.
 */
const useAppCommand = (
  command: AppCommand,
  handler: () => void,
  enabled = true,
) => {
  const onCommand = useEffectEvent(handler);
  const { windowId } = useWindow();

  useEffect(() => {
    if (!enabled || !Menus) {
      return;
    }
    const subscription = Menus.addListener('onCommand', event => {
      if (event.command === command && isTargetWindow(windowId)) {
        onCommand();
      }
    });
    return () => subscription.remove();
  }, [command, enabled, windowId]);
};

export default useAppCommand;
