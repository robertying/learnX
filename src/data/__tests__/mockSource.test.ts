import {
  ContentType,
  CourseType,
  FailReason,
  Language,
} from '@robertying/thu-learn-lib';
import {
  defaultMockNetworkConfig,
  MOCK_TIMEOUT_MS,
  mockDownloadFile,
  mockSource,
  mockSubmitAssignment,
  setMockNetworkConfig,
} from 'data/mockSource';
import {
  mockAssignments,
  mockCourses,
  mockCurrentSemester,
  mockFavorites,
  mockFiles,
  mockNotices,
  mockSemesterStart,
  mockSemesters,
} from 'data/mock';

beforeEach(() => {
  setMockNetworkConfig({ ...defaultMockNetworkConfig, latency: 'none' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('mockSource', () => {
  it('answers with the mock data, minus the fields the app adds', async () => {
    const all = (
      await Promise.all(
        [...new Set(mockNotices.map(n => n.courseId))].map(courseId =>
          mockSource.getNotificationList(courseId),
        ),
      )
    ).flat();
    expect(all.map(n => n.id).sort()).toEqual(
      mockNotices.map(n => n.id).sort(),
    );
    expect(all[0]).not.toHaveProperty('courseId');
    expect(all[0]).not.toHaveProperty('courseName');
  });

  it('names notice attachments, and fetches them only when asked', async () => {
    const withAttachment = mockNotices.find(n => n.attachment)!;
    const listed = (
      await mockSource.getNotificationList(withAttachment.courseId)
    ).find(n => n.id === withAttachment.id)!;
    expect(listed.attachment).toBeUndefined();
    expect(listed.attachmentName).toBe(withAttachment.attachment!.name);

    const selected = (
      await mockSource.getNotificationList(
        withAttachment.courseId,
        CourseType.STUDENT,
        { attachments: n => n.id === withAttachment.id },
      )
    ).find(n => n.id === withAttachment.id)!;
    expect(selected.attachment).toEqual(withAttachment.attachment);
  });

  it('leaves out assignment details unless asked', async () => {
    const assignment = mockAssignments.find(a => a.description)!;
    const listed = (await mockSource.getHomeworkList(assignment.courseId)).find(
      a => a.id === assignment.id,
    )!;
    expect(listed).not.toHaveProperty('description');

    const detailed = (
      await mockSource.getHomeworkList(
        assignment.courseId,
        CourseType.STUDENT,
        {
          details: 'all',
        },
      )
    ).find(a => a.id === assignment.id)!;
    expect(detailed.description).toBe(assignment.description);
  });

  it('lists excellent homework without details', async () => {
    const assignment = mockAssignments.find(a => a.excellentHomeworkList)!;
    const listed = (
      await mockSource.getHomeworkList(
        assignment.courseId,
        CourseType.STUDENT,
        {
          details: 'all',
        },
      )
    ).find(a => a.id === assignment.id)!;
    const [excellent] = listed.excellentHomeworkList!;
    expect(excellent).not.toHaveProperty('submittedAttachment');
    await expect(
      mockSource.getExcellentHomeworkDetail(excellent),
    ).resolves.toMatchObject({
      submittedAttachment:
        assignment.excellentHomeworkList![0].submittedAttachment,
    });
  });

  it('fetches course times only when asked', async () => {
    const [course] = await mockSource.getCourseList(mockCurrentSemester);
    expect(course).not.toHaveProperty('timeAndLocation');
    const [withTimes] = await mockSource.getCourseList(mockCurrentSemester, {
      timeAndLocation: true,
    });
    expect(withTimes.timeAndLocation).toEqual(
      mockCourses.find(c => c.id === withTimes.id)!.timeAndLocation,
    );
  });

  it('names courses in the language asked for', async () => {
    const [chinese] = await mockSource.getCourseList(mockCurrentSemester, {
      lang: Language.ZH,
    });
    const [english] = await mockSource.getCourseList(mockCurrentSemester, {
      lang: Language.EN,
    });
    const course = mockCourses.find(c => c.id === chinese.id)!;
    expect(chinese.name).toBe(course.chineseName);
    expect(english.name).toBe(course.englishName);
  });

  it('returns a fresh copy for every response', async () => {
    const [course] = await mockSource.getCourseList(mockCurrentSemester);
    expect(course).not.toHaveProperty('semesterId');
    course.name = 'changed';
    const [again] = await mockSource.getCourseList(mockCurrentSemester);
    expect(again.name).not.toBe('changed');
  });

  it('lists courses only for the semester they belong to', async () => {
    expect(await mockSource.getCourseList('2000-2001-1')).toEqual([]);
  });

  it('answers per course', async () => {
    const courseId = mockAssignments[0].courseId;
    const assignments = await mockSource.getHomeworkList(courseId);
    expect(assignments.length).toBe(
      mockAssignments.filter(a => a.courseId === courseId).length,
    );
  });

  it('describes the current semester', async () => {
    const semester = await mockSource.getCurrentSemester();
    expect(semester.id).toBe(mockCurrentSemester);
  });

  it('waits like a network round trip', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    setMockNetworkConfig({ latency: 'slow' });

    let done = false;
    const pending = mockSource.getSemesterIdList().then(() => (done = true));
    await jest.advanceTimersByTimeAsync(4000);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1000);
    await pending;
    expect(done).toBe(true);
    jest.mocked(Math.random).mockRestore();
  });

  it('fails like a device without a connection', async () => {
    setMockNetworkConfig({ failure: 'offline' });
    const offline = {
      reason: FailReason.NETWORK_ERROR,
      extra: new TypeError('Network request failed'),
    };
    await expect(mockSource.getUserInfo()).rejects.toEqual(offline);
    await expect(mockSource.login()).rejects.toEqual(offline);
  });

  it('fails like a server error', async () => {
    setMockNetworkConfig({ failure: 'serverError' });
    await expect(mockSource.getSemesterIdList()).rejects.toEqual({
      reason: FailReason.UNEXPECTED_STATUS,
    });
    await expect(mockSource.login()).rejects.toEqual({
      reason: FailReason.ERROR_FETCH_FROM_ID,
    });
  });

  it('times out', async () => {
    jest.useFakeTimers();
    setMockNetworkConfig({ failure: 'timeout' });
    const pending = mockSource.getSemesterIdList().catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(MOCK_TIMEOUT_MS);
    expect(await pending).toEqual({ reason: FailReason.REQUEST_TIMEOUT });
  });

  it('rejects logins only when asked to', async () => {
    await expect(mockSource.login()).resolves.toBeUndefined();
    setMockNetworkConfig({ loginFails: true });
    await expect(mockSource.login()).rejects.toEqual({
      reason: FailReason.BAD_CREDENTIAL,
    });
    await expect(mockSource.getSemesterIdList()).resolves.toEqual(
      mockSemesters,
    );
  });

  it('reports upload progress when submitting', async () => {
    const progress: number[] = [];
    await mockSubmitAssignment(p => progress.push(p));
    expect(progress).toEqual([0.25, 0.5, 0.75, 1]);
  });

  it('applies the emulation to file downloads', async () => {
    await expect(mockDownloadFile()).resolves.toBeUndefined();
    setMockNetworkConfig({ failure: 'offline' });
    await expect(mockDownloadFile()).rejects.toMatchObject({
      reason: FailReason.NETWORK_ERROR,
    });
    setMockNetworkConfig({ failure: 'serverError' });
    await expect(mockDownloadFile()).rejects.toEqual({
      reason: FailReason.UNEXPECTED_STATUS,
    });
  });

  describe('favorites', () => {
    const favoriteIds = async (courseId: string) =>
      (
        await mockSource.getFileList(courseId, CourseType.STUDENT, {
          favorites: true,
        } as never)
      )
        .filter(file => (file as { isFavorite?: boolean }).isFavorite)
        .map(file => file.id);
    const file = mockFiles.find(f => !mockFavorites.file.includes(f.id))!;

    it('marks the seeded favorites, and adds and removes them', async () => {
      const favorite = mockFiles.find(f => f.id === mockFavorites.file[0])!;
      expect(await favoriteIds(favorite.courseId)).toContain(favorite.id);
      expect(await favoriteIds(file.courseId)).not.toContain(file.id);

      await mockSource.addToFavorites(ContentType.FILE, file.id);
      await mockSource.addToFavorites(ContentType.FILE, file.id);
      expect(
        (await favoriteIds(file.courseId)).filter(id => id === file.id),
      ).toHaveLength(1);

      await mockSource.removeFromFavorites(file.id);
      await mockSource.removeFromFavorites(file.id);
      expect(await favoriteIds(file.courseId)).not.toContain(file.id);
    });

    it("answers HTTP 500 for an item it doesn't know, or of another type", async () => {
      await expect(
        mockSource.addToFavorites(ContentType.FILE, 'unknown'),
      ).rejects.toMatchObject({ reason: FailReason.UNEXPECTED_STATUS });
      await expect(
        mockSource.addToFavorites(ContentType.NOTIFICATION, file.id),
      ).rejects.toMatchObject({ reason: FailReason.UNEXPECTED_STATUS });
      await expect(
        mockSource.addToFavorites(ContentType.HOMEWORK, mockAssignments[0].id),
      ).resolves.toBeUndefined();
      await mockSource.removeFromFavorites(mockAssignments[0].id);
    });
  });

  it("works the registrar's calendar out from the courses, in Beijing time", async () => {
    const monday = mockSemesterStart.add(1, 'week');
    const { events, failedRanges } = await mockSource.getCalendar(
      monday.format('YYYYMMDD'),
      monday.add(6, 'day').format('YYYYMMDD'),
    );
    expect(failedRanges).toEqual([]);
    expect(events.length).toBeGreaterThan(0);
    const names = new Set(
      mockCourses
        .filter(course => course.semesterId === mockCurrentSemester)
        .map(course => course.name),
    );
    for (const event of events) {
      expect(names).toContain(event.courseName);
      expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(event.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(event.date >= monday.format('YYYY-MM-DD')).toBe(true);
      expect(event.date <= monday.add(6, 'day').format('YYYY-MM-DD')).toBe(
        true,
      );
    }
  });

  it('marks notices read and prepares downloads with a round trip', async () => {
    await expect(mockSource.markNoticeRead('n')).resolves.toBeUndefined();
    await expect(mockSource.prepareFileDownload()).resolves.toBeUndefined();
    const onProgress = jest.fn();
    await mockSource.submitAssignment('a', { onProgress } as never);
    expect(onProgress).toHaveBeenCalled();
    setMockNetworkConfig({ failure: 'offline' });
    await expect(mockSource.markNoticeRead('n')).rejects.toBeTruthy();
  });
});
