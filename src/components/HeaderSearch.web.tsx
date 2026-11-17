import { View } from 'react-native';
import { SearchBox } from '@fluentui/react-components';
import type { HeaderSearchProps } from './HeaderSearch';

/**
 * Fluent's search box in the header, focused as the page opens, as a Windows
 * app's search page starts.
 */
const HeaderSearch: React.FC<HeaderSearchProps> = ({
  defaultValue,
  placeholder,
  onChangeText,
}) => (
  <View style={{ width: '100%', maxWidth: 480 }}>
    <SearchBox
      autoFocus
      defaultValue={defaultValue}
      placeholder={placeholder}
      aria-label={placeholder}
      data-testid="search-box"
      onChange={(_event, data) => onChangeText(data.value)}
    />
  </View>
);

export default HeaderSearch;
