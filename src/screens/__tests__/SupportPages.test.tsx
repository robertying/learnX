import { Linking } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { t } from 'helpers/i18n';
import Changelog from 'screens/Changelog';
import Help from 'screens/Help';
import Maintainer from 'screens/Maintainer';

let mockProps: Record<string, any> = {};
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => {
      mockProps = props;
      return <View testID="webview" />;
    },
  };
});

let openURL: jest.SpyInstance;
beforeEach(() => {
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
});

describe('Help', () => {
  it('opens a GitHub issue or an email', async () => {
    const user = userEvent.setup();
    await render(<Help navigation={{} as never} route={{} as never} />);
    await user.press(screen.getByText(t('createNewGitHubIssue')));
    expect(openURL).toHaveBeenLastCalledWith(
      'https://github.com/robertying/learnX/issues/new/choose',
    );
    await user.press(screen.getByText('learnX@ruiying.io'));
    expect(openURL).toHaveBeenLastCalledWith('mailto:learnX@ruiying.io');
  });

  it("shows the issue template without the translation file's indentation", async () => {
    await render(<Help navigation={{} as never} route={{} as never} />);
    const template = t('issueTemplateContent')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    const paragraph = screen.getByText(template[0], { exact: false });
    expect(paragraph.props.children).toBe(template.join('\n'));
  });
});

describe('Maintainer', () => {
  it('asks for maintainers by email', async () => {
    await render(<Maintainer navigation={{} as never} route={{} as never} />);
    expect(screen.getByText(t('maintainerDescription'))).toBeTruthy();
    await userEvent.press(screen.getByText('learnX@ruiying.io'));
    expect(openURL).toHaveBeenCalledWith('mailto:learnX@ruiying.io');
  });
});

describe('Changelog', () => {
  it('shows the releases, with progress while loading', async () => {
    await render(<Changelog />);
    expect(mockProps.source.uri).toBe(
      'https://github.com/robertying/learnX/releases',
    );
    expect(screen.queryByTestId('progress')).toBeNull();
    await act(() =>
      mockProps.onLoadProgress({ nativeEvent: { progress: 0.5 } }),
    );
    expect(screen.getByTestId('progress')).toBeTruthy();
  });
});
