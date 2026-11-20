import { Language } from '@robertying/thu-learn-lib';
import dayjs from 'dayjs';
import * as written from 'data/mock';
import { mockInEnglish } from 'data/mockEnglish';
import { largeMock, largeMockSize } from 'data/mockScale';

const large = largeMock(written, Language.ZH);

const ids = (items: { id: string }[]) => items.map(item => item.id);

describe('largeMock', () => {
  it('grows the written mock data to the large semester', () => {
    expect(large.mockNotices).toHaveLength(largeMockSize.notices);
    expect(large.mockAssignments).toHaveLength(largeMockSize.assignments);
    expect(large.mockFiles).toHaveLength(largeMockSize.files);
    const hidden = new Set(written.mockUserData.hiddenCourses);
    const visible = large.mockCourses.filter(
      c => c.semesterId === written.mockCurrentSemester && !hidden.has(c.id),
    );
    expect(visible).toHaveLength(largeMockSize.courses);
  });

  it('keeps every written item as it is, first', () => {
    expect(large.mockNotices.slice(0, written.mockNotices.length)).toEqual(
      written.mockNotices,
    );
    expect(
      large.mockAssignments.slice(0, written.mockAssignments.length),
    ).toEqual(written.mockAssignments);
    expect(large.mockFiles.slice(0, written.mockFiles.length)).toEqual(
      written.mockFiles,
    );
    expect(large.mockUserData).toBe(written.mockUserData);
  });

  it('gives every item its own id, in a visible course of this semester', () => {
    const hidden = new Set(written.mockUserData.hiddenCourses);
    const courses = new Set(
      large.mockCourses
        .filter(
          c =>
            c.semesterId === written.mockCurrentSemester && !hidden.has(c.id),
        )
        .map(c => c.id),
    );
    for (const list of [
      large.mockNotices,
      large.mockAssignments,
      large.mockFiles,
    ]) {
      expect(new Set(ids(list)).size).toBe(list.length);
      const added = list.slice(-100);
      expect(added.every(item => courses.has(item.courseId))).toBe(true);
    }
    const attachments = large.mockNotices.flatMap(n =>
      n.attachment ? [n.attachment.id] : [],
    );
    expect(new Set(attachments).size).toBe(attachments.length);
  });

  it('is the same every time, in both languages', () => {
    const again = largeMock(written, Language.ZH);
    expect(ids(again.mockNotices)).toEqual(ids(large.mockNotices));
    expect(again.mockFiles.map(f => f.courseId)).toEqual(
      large.mockFiles.map(f => f.courseId),
    );
    const english = largeMock(mockInEnglish(), Language.EN);
    expect(ids(english.mockAssignments)).toEqual(ids(large.mockAssignments));
    expect(english.mockNotices.at(-1)?.title).toMatch(/ \(\d+\)$/);
    expect(large.mockNotices.at(-1)?.title).toMatch(/（\d+）$/);
    const course = english.mockCourses.at(-1);
    expect(course?.englishName).toBe('Electromagnetic Fields and Waves');
    expect(course?.teacherName).toBe('Ruochuan Shen');
    expect(large.mockCourses.at(-1)?.teacherName).toBe('沈若川');
  });

  it('keeps notices long and times in the semester so far', () => {
    const added = large.mockNotices.slice(written.mockNotices.length);
    const average =
      added.reduce((sum, n) => sum + (n.content?.length ?? 0), 0) /
      added.length;
    expect(average).toBeGreaterThan(500);
    const start = written.mockSemesterStart.valueOf();
    expect(
      added.every(n => {
        const time = dayjs(n.publishTime).valueOf();
        return time >= start && time <= Date.now();
      }),
    ).toBe(true);
  });

  it('moves a submitted copy only earlier, so it was submitted in the past', () => {
    const added = large.mockAssignments.slice(written.mockAssignments.length);
    const submitted = added.filter(a => a.submitted);
    expect(submitted.length).toBeGreaterThan(0);
    expect(
      submitted.every(
        a =>
          !a.submitTime || dayjs(a.submitTime).valueOf() <= Date.now() + 1000,
      ),
    ).toBe(true);
    expect(added.some(a => a.excellentHomeworkList)).toBe(false);
  });
});
