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

const layout = () => undefined;
export const background = layout;
export const clip = layout;
export const fillMaxSize = layout;
export const fillMaxWidth = layout;
export const imePadding = layout;
export const padding = layout;
export const size = layout;
export const weight = layout;
export const width = layout;
export const Shapes = { RoundedCorner: layout };
