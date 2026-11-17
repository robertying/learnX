import {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Tooltip } from '@fluentui/react-components';
import SystemIcon from 'components/SystemIcon';
import { systemIcons, type SystemIconName } from 'helpers/systemIcons';
import { useTheme } from 'theme';
import { showMenu } from 'modules/menus/electronMenu';
import type { AppCommand, ContextMenuViewProps } from './index';

export type {
  AppCommand,
  ContextMenuAction,
  ContextMenuViewProps,
} from './index';

// The Electron app's menus and commands (Windows): the commands the iOS menu
// bar sends come from their Windows shortcuts, and a card's context menu is
// a native menu (electron/menus.cjs), opened by right-click or the menu key.

type CommandListener = (event: { command: AppCommand }) => void;

const listeners = new Set<CommandListener>();

/** The shortcut's command: F5 or Ctrl+R, Ctrl+F, Ctrl+, and Alt+↑/↓. */
export const commandForKey = (
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>,
): AppCommand | null => {
  const control = event.ctrlKey || event.metaKey;
  if (event.key === 'F5' || (control && event.key.toLowerCase() === 'r')) {
    return 'refresh';
  }
  if (control && event.key.toLowerCase() === 'f') {
    return 'search';
  }
  if (control && event.key === ',') {
    return 'settings';
  }
  if (event.altKey && event.key === 'ArrowUp') {
    return 'previousItem';
  }
  if (event.altKey && event.key === 'ArrowDown') {
    return 'nextItem';
  }
  return null;
};

const handleKeyDown = (event: KeyboardEvent) => {
  const command = commandForKey(event);
  if (command && listeners.size) {
    // Not the page's own reload (Ctrl+R, F5) or find.
    event.preventDefault();
    listeners.forEach(listener => listener({ command }));
  }
};

/** The menu bar commands, as the iOS module sends them (`useAppCommand`). */
export const Menus = {
  addListener: (_event: 'onCommand', listener: CommandListener) => {
    if (!listeners.size) {
      globalThis.addEventListener?.('keydown', handleKeyDown);
    }
    listeners.add(listener);
    return {
      remove: () => {
        listeners.delete(listener);
        if (!listeners.size) {
          globalThis.removeEventListener?.('keydown', handleKeyDown);
        }
      },
    };
  },
};

/** The app's icon for a context menu action, by its SF Symbol. */
const iconBySymbol = new Map<string, SystemIconName>();
for (const [name, icon] of Object.entries(systemIcons)) {
  if (!iconBySymbol.has(icon.ios)) {
    iconBySymbol.set(icon.ios, name as SystemIconName);
  }
}

/** Marks a card's view, for the arrow keys to move between cards. */
const CARD = 'learnxCard';
const cardSelector = '[data-learnx-card]';

/**
 * The card above or below `card` in the same list: the nearest ancestor
 * holding other cards is the list. Focuses its first focusable view (the
 * card's pressable), which Return opens.
 */
export const focusAdjacentCard = (card: HTMLElement, offset: 1 | -1) => {
  let list = card.parentElement;
  while (list && list.querySelectorAll(cardSelector).length < 2) {
    list = list.parentElement;
  }
  if (!list) {
    return false;
  }
  const cards = Array.from(list.querySelectorAll<HTMLElement>(cardSelector));
  const next = cards[cards.indexOf(card) + offset];
  if (!next) {
    return false;
  }
  const target = next.querySelector<HTMLElement>('[tabindex="0"]') ?? next;
  target.focus();
  target.scrollIntoView?.({ block: 'nearest' });
  return true;
};

/**
 * A card's context menu in the Electron app: right-click, the menu key or
 * Shift+F10 shows `actions` as a native menu, and they also show as buttons
 * over the card's end while the pointer is on it (in place of the phone's
 * swipes). With `keyboardFocusable`, ↑ and ↓ move between the list's cards;
 * the card's own pressable takes Return (so `onPrimaryAction` isn't needed;
 * React Native Web leaves it out of the view, as other props it doesn't know).
 */
export const ContextMenuView = ({
  actions,
  onAction,
  keyboardFocusable,
  children,
  style,
  ...props
}: ContextMenuViewProps & { children?: ReactNode }) => {
  const theme = useTheme();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [hovered, setHovered] = useState(false);
  const latest = useRef({ actions, onAction, keyboardFocusable });
  useEffect(() => {
    latest.current = { actions, onAction, keyboardFocusable };
  });

  const choose = (key: string) => onAction({ nativeEvent: { key } } as never);

  useEffect(() => {
    // Mounted with the view, as effects run after it is
    const element = ref.current as unknown as HTMLElement;
    /** The menu at the pointer, or under the card (from the keyboard). */
    const open = (anchor?: HTMLElement) => {
      const { actions: shown, onAction: run } = latest.current;
      void showMenu(
        shown.map(action => ({ id: action.key, label: action.title })),
        key => run({ nativeEvent: { key } } as never),
        anchor,
      );
    };
    const onContextMenu = (event: MouseEvent) => {
      if (!latest.current.actions.length) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      open();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === 'ContextMenu' ||
          (event.shiftKey && event.key === 'F10')) &&
        latest.current.actions.length
      ) {
        event.preventDefault();
        open(element);
      } else if (
        latest.current.keyboardFocusable &&
        !event.altKey &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
        focusAdjacentCard(element, event.key === 'ArrowDown' ? 1 : -1)
      ) {
        event.preventDefault();
      }
    };
    const onEnter = () => setHovered(true);
    const onLeave = () => setHovered(false);
    element.addEventListener('contextmenu', onContextMenu);
    element.addEventListener('keydown', onKeyDown);
    element.addEventListener('mouseenter', onEnter);
    element.addEventListener('mouseleave', onLeave);
    return () => {
      element.removeEventListener('contextmenu', onContextMenu);
      element.removeEventListener('keydown', onKeyDown);
      element.removeEventListener('mouseenter', onEnter);
      element.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <View
      ref={ref}
      {...props}
      style={style}
      // React Native Web's data-* attributes (not in React Native's types)
      {...({
        dataSet: keyboardFocusable ? { [CARD]: 'true' } : undefined,
      } as object)}
    >
      {children}
      {hovered && actions.length ? (
        <View
          style={[
            styles.hoverActions,
            { backgroundColor: theme.colors.surfaceContainer },
          ]}
        >
          {actions.map(action => {
            const icon = iconBySymbol.get(action.systemImage) ?? 'more';
            return (
              <Tooltip
                key={action.key}
                content={action.title}
                relationship="label"
              >
                <Button
                  appearance="subtle"
                  size="small"
                  data-testid={`hover-${action.key}`}
                  icon={
                    <SystemIcon
                      name={icon}
                      size={16}
                      color={theme.colors.onSurfaceMedium}
                    />
                  }
                  onClick={event => {
                    event.stopPropagation();
                    choose(action.key);
                  }}
                />
              </Tooltip>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // Over the card's top end, where its date is, as Outlook's hover actions
  hoverActions: {
    position: 'absolute',
    top: 6,
    right: 8,
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    borderRadius: 4,
    boxShadow: '0 0 2px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.14)',
  },
});
