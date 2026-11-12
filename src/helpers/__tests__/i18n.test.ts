import dayjs from 'dayjs';
import { mockLocale } from '../../../jest/locale';

// A runtime that never loads App.tsx (the background task) still formats in
// the app's language once helpers/i18n is loaded.
describe('dayjs setup in helpers/i18n', () => {
  afterEach(() => {
    mockLocale.current = 'en-US';
  });

  it('sets the locale and relative times on load', () => {
    mockLocale.current = 'zh-CN';
    jest.isolateModules(() => {
      const isolated: typeof dayjs = require('dayjs');
      isolated.locale('en');
      require('helpers/i18n');
      expect(isolated.locale()).toBe('zh-cn');
      expect(isolated('2026-11-09').format('ddd')).toBe('周一');
      expect(typeof isolated().to).toBe('function');
    });
  });
});
