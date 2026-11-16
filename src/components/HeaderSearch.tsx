export interface HeaderSearchProps {
  /** The query to start with. */
  defaultValue?: string;
  placeholder: string;
  onChangeText: (text: string) => void;
}

/**
 * A search box in a page's header, for the Electron app, which has no native
 * header search bar (`HeaderSearch.web.tsx`). iOS and Android use the
 * system's (`headerSearchBarOptions`), so it's nothing here.
 */
const HeaderSearch: React.FC<HeaderSearchProps> = () => null;

export default HeaderSearch;
