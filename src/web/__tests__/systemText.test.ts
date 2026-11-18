import { CJK_GAP } from 'helpers/cjk';
import { systemText, systemTexts } from 'web/systemText';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

afterEach(uninstallBridge);

it('types the gap between Chinese and Latin text on Windows and Linux', () => {
  for (const platform of ['win32', 'linux']) {
    installBridge({ platform });
    expect(systemText('打开learnX')).toBe(`打开${CJK_GAP}learnX`);
    expect(systemTexts({ quit: '退出learnX', today: 'Today' })).toEqual({
      quit: `退出${CJK_GAP}learnX`,
      today: 'Today',
    });
  }
});

it('leaves it to macOS, which draws it', () => {
  installBridge({ platform: 'darwin' });
  expect(systemText('打开learnX')).toBe('打开learnX');
});
