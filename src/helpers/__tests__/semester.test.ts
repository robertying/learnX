import { getSemesterTextFromId } from 'helpers/semester';
import { mockLocale } from '../../../jest/locale';

describe('getSemesterTextFromId', () => {
  afterEach(() => {
    mockLocale.current = 'en-US';
  });

  describe('in English', () => {
    beforeEach(() => {
      mockLocale.current = 'en-US';
    });

    it.each([
      ['2025-2026-1', 'Fall 2025-2026'],
      ['2025-2026-2', 'Spring 2025-2026'],
      ['2025-2026-3', 'Summer 2025-2026'],
    ])('formats %s as %s', (id, text) => {
      expect(getSemesterTextFromId(id)).toBe(text);
    });
  });

  describe('in Chinese', () => {
    beforeEach(() => {
      mockLocale.current = 'zh-Hans-CN';
    });

    it.each([
      ['2025-2026-1', '2025-2026 学年秋季学期'],
      ['2025-2026-2', '2025-2026 学年春季学期'],
      ['2025-2026-3', '2025-2026 学年夏季学期'],
    ])('formats %s as %s', (id, text) => {
      expect(getSemesterTextFromId(id)).toBe(text);
    });
  });

  it('shows an id in another shape as it is', () => {
    expect(getSemesterTextFromId('2025-2026-9')).toBe('2025-2026-9');
    expect(getSemesterTextFromId('')).toBe('');
  });
});
