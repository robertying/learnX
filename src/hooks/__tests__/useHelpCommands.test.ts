import { renderHook } from '@testing-library/react-native';
import useAppCommand from 'hooks/useAppCommand';
import useHelpCommands from 'hooks/useHelpCommands';
import { openLink } from 'helpers/openLink';

jest.mock('hooks/useAppCommand', () => jest.fn());
jest.mock('helpers/openLink', () => ({ openLink: jest.fn() }));
let mockChinese = false;
jest.mock('helpers/i18n', () => ({
  isLocaleChinese: () => mockChinese,
}));

describe('useHelpCommands', () => {
  it("opens the website and the privacy policy in the app's language", async () => {
    await renderHook(() => useHelpCommands());
    const handlers = Object.fromEntries(
      jest
        .mocked(useAppCommand)
        .mock.calls.map(([command, handler, enabled]) => {
          expect(enabled).toBeUndefined();
          return [command, handler];
        }),
    );

    handlers.website();
    expect(openLink).toHaveBeenLastCalledWith('https://tsinghua.app/learnX');
    handlers.privacyPolicy();
    expect(openLink).toHaveBeenLastCalledWith(
      'https://github.com/robertying/learnX/blob/main/docs/PRIVACY_POLICY_EN.md',
    );
    mockChinese = true;
    handlers.privacyPolicy();
    expect(openLink).toHaveBeenLastCalledWith(
      'https://github.com/robertying/learnX/blob/main/docs/PRIVACY_POLICY_CN.md',
    );
  });
});
