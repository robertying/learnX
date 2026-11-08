import { CourseType, FailReason } from '@robertying/thu-learn-lib';
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
  mockNotices,
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
    await expect(mockSource.getNotificationAttachment(listed)).resolves.toEqual(
      withAttachment.attachment,
    );

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
    await expect(mockSource.getHomeworkDetail(listed)).resolves.toMatchObject({
      description: assignment.description,
    });

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
    const [withTimes] = await mockSource.getCourseList(
      mockCurrentSemester,
      CourseType.STUDENT,
      undefined,
      { timeAndLocation: true },
    );
    expect(withTimes.timeAndLocation).toEqual(
      mockCourses.find(c => c.id === withTimes.id)!.timeAndLocation,
    );
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
    await expect(mockSource.getUserInfo()).rejects.toThrow(
      'Network request failed',
    );
    await expect(mockSource.login()).rejects.toThrow('Network request failed');
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
    const pending = mockSource.getSemesterIdList().catch((e: Error) => e);
    await jest.advanceTimersByTimeAsync(MOCK_TIMEOUT_MS);
    expect(await pending).toEqual(new TypeError('Network request timed out'));
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
    await expect(mockDownloadFile()).rejects.toThrow('Network request failed');
    setMockNetworkConfig({ failure: 'serverError' });
    await expect(mockDownloadFile()).rejects.toEqual({
      reason: FailReason.UNEXPECTED_STATUS,
    });
  });
});
