import { ApiError, FailReason } from '@robertying/thu-learn-lib';
import {
  getSemesterTextFromId,
  isBadCredential,
  isNetworkError,
  serializeError,
} from 'helpers/parse';
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
});

describe('serializeError', () => {
  it('keeps the reason of an ApiError and stringifies its extra', () => {
    const error: ApiError = {
      reason: FailReason.NOT_LOGGED_IN,
      extra: { code: 401 },
    };
    expect(serializeError(error)).toEqual({
      reason: FailReason.NOT_LOGGED_IN,
      extra: '{"code":401}',
    });
  });

  it('maps any other error to UNEXPECTED_STATUS', () => {
    expect(serializeError(new Error('boom'))).toEqual({
      reason: FailReason.UNEXPECTED_STATUS,
    });
  });
});

describe('isNetworkError', () => {
  it('spots a request without an answer, bare or wrapped', () => {
    const offline = {
      reason: FailReason.NETWORK_ERROR,
      extra: new TypeError('Network request failed'),
    };
    expect(isNetworkError(offline)).toBe(true);
    expect(
      isNetworkError({
        reason: FailReason.ERROR_FETCH_FROM_ID,
        extra: offline,
      }),
    ).toBe(true);
  });

  it('counts a thu-learn-lib timeout, bare or wrapped', () => {
    const timeout = {
      reason: FailReason.REQUEST_TIMEOUT,
      extra: { url: 'https://learn.tsinghua.edu.cn', timeout: 60000 },
    };
    expect(isNetworkError(timeout)).toBe(true);
    expect(
      isNetworkError({
        reason: FailReason.ERROR_FETCH_FROM_ID,
        extra: timeout,
      }),
    ).toBe(true);
  });

  it('does not count other failures', () => {
    expect(
      isNetworkError({
        reason: FailReason.ERROR_FETCH_FROM_ID,
        extra: new TypeError(
          "Cannot read properties of undefined (reading 'split')",
        ),
      }),
    ).toBe(false);
    expect(isNetworkError({ reason: FailReason.BAD_CREDENTIAL })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe('isBadCredential', () => {
  it('spots a wrong password only', () => {
    expect(isBadCredential({ reason: FailReason.BAD_CREDENTIAL })).toBe(true);
    expect(isBadCredential({ reason: FailReason.ERROR_FETCH_FROM_ID })).toBe(
      false,
    );
    expect(isBadCredential(null)).toBe(false);
  });
});
