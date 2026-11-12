import ScreenWebView from 'components/ScreenWebView';

const releasesUrl = 'https://github.com/robertying/learnX/releases';

// In Settings and in the What's New sheet, so it takes no navigation props.
const Changelog: React.FC = () => (
  <ScreenWebView source={{ uri: releasesUrl }} />
);

export default Changelog;
