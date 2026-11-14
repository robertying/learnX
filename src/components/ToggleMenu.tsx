// On iOS and Mac the button and its menu are a native header menu item
// (screens/Search), so this Android header button renders nothing.
import type { ToggleMenuProps } from './ToggleMenu.shared';

const ToggleMenu: React.FC<ToggleMenuProps> = () => null;

export default ToggleMenu;
