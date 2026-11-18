import { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { t } from 'helpers/i18n';
import { useTheme } from 'theme';
import type { SplitDividerProps } from './SplitDivider';

export type { SplitDividerProps } from './SplitDivider';

/** How far an arrow key moves the divider. */
const KEY_STEP = 16;
/** How much wider than the line the grip is on each side. */
const GRIP_OVERHANG = 4;

const clamp = (width: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, width)));

/**
 * The line between the Electron app's list and detail columns, which drags
 * to resize the list, as a pane divider does in Windows apps: the pointer
 * grabs it a few pixels either side of the line, the arrow keys move it
 * while it has focus, and a double click puts it back to the default width.
 */
const SplitDivider: React.FC<SplitDividerProps> = ({
  width,
  min,
  max,
  defaultWidth,
  onResize,
  onResizeEnd,
}) => {
  const theme = useTheme();
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const drag = useRef<{ x: number; width: number; moved: number } | null>(null);

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    // Not a text selection across the panes.
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width, moved: width };
    setActive(true);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!drag.current) {
      return;
    }
    const next = clamp(
      drag.current.width + event.clientX - drag.current.x,
      min,
      max,
    );
    if (next !== drag.current.moved) {
      drag.current.moved = next;
      onResize(next);
    }
  };
  const endDrag = () => {
    if (!drag.current) {
      return;
    }
    const { moved, width: started } = drag.current;
    drag.current = null;
    setActive(false);
    if (moved !== started) {
      onResizeEnd(moved);
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const next =
      event.key === 'ArrowLeft'
        ? width - KEY_STEP
        : event.key === 'ArrowRight'
          ? width + KEY_STEP
          : event.key === 'Home'
            ? min
            : event.key === 'End'
              ? max
              : null;
    if (next === null) {
      return;
    }
    event.preventDefault();
    const clamped = clamp(next, min, max);
    onResize(clamped);
    onResizeEnd(clamped);
  };
  const onClick = (event: MouseEvent) => {
    if (event.detail === 2) {
      const reset = clamp(defaultWidth, min, max);
      onResize(reset);
      onResizeEnd(reset);
    }
  };

  // React Native Web passes the DOM's pointer, key and click events through
  // to the element, which React Native's types don't know.
  const events = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onKeyDown,
    onClick,
  } as unknown as { onPress?: (event: GestureResponderEvent) => void };

  return (
    <View style={styles.divider}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              active || hovered
                ? theme.colors.outline
                : theme.colors.outlineVariant,
          },
        ]}
      />
      <View
        testID="split-divider"
        role="separator"
        aria-label={t('a11yListWidth')}
        aria-orientation="vertical"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={width}
        focusable
        style={styles.grip}
        {...events}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  divider: {
    width: 1,
    alignSelf: 'stretch',
    // Above both columns, so the grip's overhang takes the pointer.
    zIndex: 3,
  },
  grip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -GRIP_OVERHANG,
    right: -GRIP_OVERHANG,
    cursor: 'col-resize',
    // The pointer's drag moves the divider, not the page.
    touchAction: 'none',
  } as object,
});

export default SplitDivider;
