import { Badge as NativeBadge, Host, Text } from '@expo/ui/jetpack-compose';
import { useTheme } from 'theme';
import type { BadgeProps } from './Badge.shared';

export type { BadgeProps } from './Badge.shared';

/**
 * The Material 3 badge (Compose `Badge`): a 16 dp pill with a count, or a
 * 6 dp dot without one. One host per badge, which is fine for the few rows of
 * the list filter; don't use it per item in a long list.
 */
const Badge: React.FC<BadgeProps> = ({
  children,
  backgroundColor,
  color,
  style,
}) => {
  const theme = useTheme();
  const hasContent = children !== undefined && children !== '';

  return (
    <Host matchContents style={style}>
      <NativeBadge
        containerColor={backgroundColor ?? theme.colors.error}
        contentColor={color ?? theme.colors.onError}
      >
        {hasContent ? <Text>{String(children)}</Text> : null}
      </NativeBadge>
    </Host>
  );
};

export default Badge;
