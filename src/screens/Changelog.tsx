import ScreenWebView from 'components/ScreenWebView';
import Urls from 'constants/Urls';

// In Settings and in the What's New sheet, so it takes no navigation props.
const Changelog: React.FC = () => (
  <ScreenWebView source={{ uri: `${Urls.repo}/releases` }} />
);

export default Changelog;
