import { QueryClient } from '@tanstack/react-query';
import {
  localizeCachedCourseNames,
  localizedCourseName,
} from 'data/courseNames';
import {
  clearQueryCache,
  queryClient,
  queryPersister,
  restoreQueryCache,
} from 'data/queryClient';
import { queryKeys } from 'data/queryKeys';
import type { Course } from 'data/types/state';
import * as i18n from 'helpers/i18n';

const setChinese = (chinese: boolean) =>
  jest
    .spyOn(require('helpers/i18n') as typeof i18n, 'isLocaleChinese')
    .mockReturnValue(chinese);

afterEach(() => jest.restoreAllMocks());

const semester = '2026-2027-1';

const course = (id: string, chineseName: string, englishName: string) =>
  ({
    id,
    name: chineseName,
    chineseName,
    englishName,
    semesterId: semester,
  }) as Course;

const signals = course('c1', '信号与系统', 'Signals and Systems');
const physics = course('c2', '大学物理', 'University Physics');

describe('localizedCourseName', () => {
  it("picks the name in the app's language", () => {
    setChinese(true);
    expect(localizedCourseName({ ...signals, name: 'x' })).toBe('信号与系统');
    setChinese(false);
    expect(localizedCourseName(signals)).toBe('Signals and Systems');
  });

  it('falls back to the name the server picked', () => {
    setChinese(false);
    expect(localizedCourseName({ ...signals, englishName: '' })).toBe(
      '信号与系统',
    );
    setChinese(true);
    expect(
      localizedCourseName({
        name: 'Signals',
        chineseName: '',
        englishName: 'Signals and Systems',
      }),
    ).toBe('Signals');
  });
});

describe('localizeCachedCourseNames', () => {
  const coursesKey = queryKeys.courses(semester);
  const noticesKey = queryKeys.content('notices', semester);
  const filesKey = queryKeys.content('files', semester);
  const fetchedAt = 1_700_000_000_000;

  /** A cache as fetched in Chinese. */
  const cachedInChinese = () => {
    // Kept for good, so no garbage collection timer outlives the test.
    const client = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    client.setQueryData(coursesKey, [signals, physics], {
      updatedAt: fetchedAt,
    });
    client.setQueryData(
      noticesKey,
      [
        { id: 'n1', courseId: 'c1', courseName: '信号与系统' },
        // A course no longer cached keeps its name.
        { id: 'n2', courseId: 'gone', courseName: '旧课程' },
      ],
      { updatedAt: fetchedAt },
    );
    client.setQueryData(
      filesKey,
      [{ id: 'f1', courseId: 'c2', courseName: '大学物理' }],
      { updatedAt: fetchedAt },
    );
    // Never fetched: skipped.
    client.getQueryCache().build(client, {
      queryKey: queryKeys.content('assignments', semester),
    });
    return client;
  };

  it('renames cached courses and the names copied into items', () => {
    setChinese(false);
    const client = cachedInChinese();

    expect(localizeCachedCourseNames(client)).toEqual([
      coursesKey,
      noticesKey,
      filesKey,
    ]);
    expect(client.getQueryData<Course[]>(coursesKey)?.map(c => c.name)).toEqual(
      ['Signals and Systems', 'University Physics'],
    );
    expect(client.getQueryData(noticesKey)).toEqual([
      { id: 'n1', courseId: 'c1', courseName: 'Signals and Systems' },
      { id: 'n2', courseId: 'gone', courseName: '旧课程' },
    ]);
    expect(client.getQueryData(filesKey)).toEqual([
      { id: 'f1', courseId: 'c2', courseName: 'University Physics' },
    ]);
    // Still as old as the fetch, so it is refreshed and shown as such.
    expect(client.getQueryState(coursesKey)?.dataUpdatedAt).toBe(fetchedAt);
    expect(client.getQueryState(noticesKey)?.dataUpdatedAt).toBe(fetchedAt);
  });

  it('changes nothing when the names are already in its language', () => {
    setChinese(true);
    const client = cachedInChinese();
    const courses = client.getQueryData(coursesKey);
    const notices = client.getQueryData(noticesKey);

    expect(localizeCachedCourseNames(client)).toEqual([]);
    expect(client.getQueryData(coursesKey)).toBe(courses);
    expect(client.getQueryData(noticesKey)).toBe(notices);
  });

  it('renames items whose course is right but whose copy is not', () => {
    setChinese(true);
    const client = cachedInChinese();
    client.setQueryData(noticesKey, [
      { id: 'n1', courseId: 'c1', courseName: 'Signals and Systems' },
    ]);
    expect(localizeCachedCourseNames(client)).toEqual([noticesKey]);
    expect(client.getQueryData(noticesKey)).toEqual([
      { id: 'n1', courseId: 'c1', courseName: '信号与系统' },
    ]);
  });
});

describe('restoring the cache after the language changed', () => {
  // `restoreQueryCache` runs once per launch, so this file calls it only here.
  it('shows and saves the names in the new language', async () => {
    jest.useFakeTimers();
    const key = queryKeys.courses(semester);
    clearQueryCache();
    queryClient.setQueryData(key, [signals]);
    await queryPersister.persistQueryByKey(key, queryClient);

    // Relaunched in English.
    queryClient.clear();
    setChinese(false);
    await restoreQueryCache();
    const name = () => queryClient.getQueryData<Course[]>(key)?.[0].name;
    expect(name()).toBe('Signals and Systems');

    // Saved, so the next launch starts from it.
    await jest.advanceTimersByTimeAsync(1000);
    queryClient.clear();
    await queryPersister.restoreQueries(queryClient);
    expect(name()).toBe('Signals and Systems');
    jest.useRealTimers();
  });
});
