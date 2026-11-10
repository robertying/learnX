// Stand-ins for `@expo/ui/jetpack-compose/modifiers`. The ones that change
// what a row does return what the stand-in views read (jest/mocks/expoCompose.tsx):
// a testID, a tap, and the accessibility role and state Compose would give.

export const testID = (id: string) => ({ testID: id });
export const clickable = (onClick: () => void) => ({ onPress: onClick });
export const toggleable = (
  value: boolean,
  onValueChange: () => void,
  options?: { role?: string; enabled?: boolean },
) => ({
  onPress: onValueChange,
  role: options?.role ?? 'checkbox',
  checked: value,
  disabled: options?.enabled === false,
});
export const selectable = (
  selected: boolean,
  onClick: () => void,
  role?: string,
) => ({
  onPress: onClick,
  role: role === 'radioButton' ? 'radio' : role,
  selected,
});

/**
 * What TalkBack reads, as the stand-in's accessibility label, and the
 * Autofill content type, which text field stand-ins pass on.
 */
export const semantics = ({
  contentDescription,
  contentType,
}: {
  contentDescription?: string;
  contentType?: string;
}) => ({ accessibilityLabel: contentDescription, contentType });

const layout = () => undefined;
/** Read by the button stand-ins, as their style. */
export const size = (width: number, height: number) => ({
  size: { width, height },
});
export const background = layout;
export const clip = layout;
export const fillMaxSize = layout;
export const fillMaxWidth = layout;
export const imePadding = layout;
export const padding = layout;
export const weight = layout;
export const width = layout;
export const Shapes = { RoundedCorner: layout };
