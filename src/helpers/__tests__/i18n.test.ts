import dayjs from 'dayjs';
import { HomeworkGradeLevel } from '@robertying/thu-learn-lib';
import {
  formatLiteral,
  getAssignmentGradeLevelDescription,
  t,
  tCount,
} from 'helpers/i18n';
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

describe('tCount', () => {
  it('uses the one key for 1 and the other key with the count otherwise', () => {
    expect(tCount('downloadsOneFile', 'downloadsFileCount', 1)).toBe('1 file');
    expect(tCount('downloadsOneFile', 'downloadsFileCount', 3)).toBe('3 files');
    expect(tCount('downloadsOneFile', 'downloadsFileCount', 0)).toBe('0 files');
  });
});

describe('formatLiteral', () => {
  it('wraps text so dayjs prints it as is, without brackets inside', () => {
    expect(formatLiteral('Dr. [M] Y')).toBe('[Dr. M Y]');
  });
});

describe('getAssignmentGradeLevelDescription', () => {
  it('names a known level and shows an unknown one as it is', () => {
    expect(getAssignmentGradeLevelDescription(HomeworkGradeLevel.PASS)).toBe(
      t('pass'),
    );
    expect(getAssignmentGradeLevelDescription('A+' as HomeworkGradeLevel)).toBe(
      'A+',
    );
  });
});
