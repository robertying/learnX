import 'react-native';
import App from '../App';

import renderer from 'react-test-renderer';

it('should render correctly', () => {
  renderer.create(<App />);
});
