import {
  RefreshControl as NativeRefreshControl,
  type RefreshControlProps,
} from 'react-native';
import { useTheme } from 'theme';

/**
 * Pull to refresh for a React Native scroll view. Android draws Material 3's
 * colors, as Compose's pull to refresh (Today and the forms) does, where the
 * plain control is grey on white; iOS keeps the system spinner.
 */
const RefreshControl: React.FC<RefreshControlProps> = props => {
  const theme = useTheme();
  return (
    <NativeRefreshControl
      colors={[theme.colors.primary]}
      progressBackgroundColor={theme.colors.surfaceContainer}
      {...props}
    />
  );
};

export default RefreshControl;
