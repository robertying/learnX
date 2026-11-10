import { Linking } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import About from 'screens/About';
import packageJson from '../../../package.json';

it('shows the version with its build, and every dependency', async () => {
  await render(<About navigation={{} as never} route={{} as never} />);
  expect(
    screen.getByText(`${packageJson.version} (${DeviceInfo.buildNo()})`),
  ).toBeTruthy();
  expect(screen.getByText(t('versionInformation'))).toBeTruthy();
  for (const name of Object.keys(packageJson.dependencies)) {
    expect(screen.getByText(name)).toBeTruthy();
  }
});

it('opens the source, contributors, thanks and filing pages', async () => {
  const user = userEvent.setup();
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  await render(<About navigation={{} as never} route={{} as never} />);
  const links = {
    [t('sourceCode')]: 'https://github.com/robertying/learnX',
    'Rui Ying': 'https://github.com/robertying',
    'Junbo Niu': 'https://github.com/lyrenius',
    'Harry Chen': 'https://github.com/Harry-Chen/thu-learn-lib',
    '浙ICP备20024838号-2A': 'https://beian.miit.gov.cn/',
  };
  for (const [title, url] of Object.entries(links)) {
    await user.press(screen.getByText(title));
    expect(openURL).toHaveBeenLastCalledWith(url);
  }
});
