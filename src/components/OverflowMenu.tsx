// On iOS and Mac a header's less used actions are a native header menu item
// (hooks/useFilterListHeader), so this Android header button renders nothing.
import type { OverflowMenuProps } from './OverflowMenu.shared';

export type {
  OverflowMenuItem,
  OverflowMenuProps,
} from './OverflowMenu.shared';

const OverflowMenu: React.FC<OverflowMenuProps> = () => null;

export default OverflowMenu;
