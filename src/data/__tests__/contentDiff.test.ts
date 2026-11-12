import dayjs from 'dayjs';
import {
  HomeworkCompletionType,
  HomeworkGradeLevel,
} from '@robertying/thu-learn-lib';
import { type ContentDiff, diffById, diffContent } from 'data/contentDiff';
import { mockAssignments, mockFiles, mockNotices } from 'data/mock';
import { Assignment } from 'data/types/state';

const ungraded = mockAssignments.find(a => !a.graded)!;
const graded = mockAssignments.find(a => a.graded)!;

/** Nothing to tell the user about. */
const isContentDiffEmpty = (diff: ContentDiff) =>
  Object.values(diff).every(kinds =>
    Object.values(kinds).every(items => (items as unknown[]).length === 0),
  );

describe('diffById', () => {
  const differ = (a: { id: string; v: number }, b: { id: string; v: number }) =>
    a.v !== b.v;

  it('finds added and changed items by id, in list order', () => {
    const before = [
      { id: 'a', v: 1 },
      { id: 'b', v: 1 },
      { id: 'c', v: 1 },
    ];
    const after = [
      { id: 'd', v: 1 },
      { id: 'c', v: 2 },
      { id: 'a', v: 1 },
      { id: 'e', v: 1 },
    ];
    expect(diffById(before, after, differ)).toEqual({
      added: [after[0], after[3]],
      changed: [{ before: before[2], after: after[1] }],
    });
  });

  it('finds nothing in equal lists, whatever their order', () => {
    const items = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ];
    expect(diffById(items, [...items].reverse(), differ)).toEqual({
      added: [],
      changed: [],
    });
  });
});

describe('diffContent', () => {
  const lists = {
    notices: mockNotices,
    assignments: mockAssignments,
    files: mockFiles,
  };

  it('finds no changes when nothing changed', () => {
    const diff = diffContent(lists, structuredClone(lists));
    expect(isContentDiffEmpty(diff)).toBe(true);
  });

  it('reports new notices, assignments and files', () => {
    const diff = diffContent(
      {
        notices: mockNotices.slice(1),
        assignments: mockAssignments.slice(1),
        files: mockFiles.slice(2),
      },
      lists,
    );
    expect(diff.notices.added).toEqual([mockNotices[0]]);
    expect(diff.assignments.added).toEqual([mockAssignments[0]]);
    expect(diff.files.added).toEqual(mockFiles.slice(0, 2));
    expect(isContentDiffEmpty(diff)).toBe(false);
  });

  it('ignores removed items and changes nobody is told about', () => {
    const diff = diffContent(lists, {
      notices: mockNotices
        .slice(1)
        .map(n => ({ ...n, hasRead: !n.hasRead, title: `${n.title}!` })),
      assignments: mockAssignments.map(a => ({
        ...a,
        // A group assignment becoming submitted is news.
        completionType: HomeworkCompletionType.INDIVIDUAL,
        submitted: !a.submitted,
        description: 'edited',
      })),
      files: mockFiles.map(f => ({ ...f, isNew: !f.isNew })),
    });
    expect(isContentDiffEmpty(diff)).toBe(true);
  });

  it('treats a missing list on either side as unchanged', () => {
    expect(isContentDiffEmpty(diffContent({}, lists))).toBe(true);
    expect(isContentDiffEmpty(diffContent(lists, {}))).toBe(true);
    const diff = diffContent(
      { notices: [], assignments: [] },
      { notices: mockNotices, files: mockFiles },
    );
    expect(diff.notices.added).toEqual(mockNotices);
    expect(diff.assignments.added).toEqual([]);
    expect(diff.files.added).toEqual([]);
  });

  describe('assignments', () => {
    const change = (before: Assignment, after: Assignment) =>
      diffContent({ assignments: [before] }, { assignments: [after] })
        .assignments;

    it('reports an assignment that was graded', () => {
      const after = { ...ungraded, graded: true, grade: 90 };
      expect(change(ungraded, after)).toEqual({
        added: [],
        graded: [{ before: ungraded, after }],
        commented: [],
        deadlineChanged: [],
        groupSubmitted: [],
      });
    });

    it('reports a changed grade or grade level', () => {
      const regraded = { ...graded, grade: (graded.grade ?? 0) + 5 };
      expect(change(graded, regraded).graded).toEqual([
        { before: graded, after: regraded },
      ]);
      const leveled = { ...graded, gradeLevel: HomeworkGradeLevel.A };
      expect(change(graded, leveled).graded).toHaveLength(1);
    });

    it('ignores a grade that was taken back', () => {
      const after = { ...graded, graded: false, grade: undefined };
      expect(
        isContentDiffEmpty(
          diffContent({ assignments: [graded] }, { assignments: [after] }),
        ),
      ).toBe(true);
    });

    it('reports a moved deadline or late submission deadline', () => {
      const later = dayjs(ungraded.deadline).add(1, 'day').toISOString();
      const moved = { ...ungraded, deadline: later };
      expect(change(ungraded, moved)).toEqual({
        added: [],
        graded: [],
        commented: [],
        deadlineChanged: [{ before: ungraded, after: moved }],
        groupSubmitted: [],
      });
      const late = { ...ungraded, lateSubmissionDeadline: later };
      expect(change(ungraded, late).deadlineChanged).toHaveLength(1);
    });

    it('compares deadlines by the moment, not the text', () => {
      const sameMoment = {
        ...ungraded,
        deadline: dayjs(ungraded.deadline).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      };
      expect(sameMoment.deadline).not.toBe(ungraded.deadline);
      expect(change(ungraded, sameMoment).deadlineChanged).toEqual([]);
    });

    it("reports a grader's comment that came or changed after the grade", () => {
      const plain = { ...graded, gradeContent: undefined };
      const commented = { ...plain, gradeContent: 'Good work' };
      expect(change(plain, commented).commented).toEqual([
        { before: plain, after: commented },
      ]);
      const edited = { ...commented, gradeContent: 'Better work' };
      expect(change(commented, edited).commented).toHaveLength(1);
      // Only spaces changed, or the comment taken away
      const spaced = { ...commented, gradeContent: ' Good work ' };
      expect(change(commented, spaced).commented).toEqual([]);
      expect(change(commented, plain).commented).toEqual([]);
    });

    it('leaves the comment of a new grade to the grade', () => {
      const after = { ...ungraded, graded: true, grade: 1, gradeContent: 'Ok' };
      const { graded: g, commented } = change(ungraded, after);
      expect(g).toHaveLength(1);
      expect(commented).toEqual([]);
      const regraded = { ...graded, grade: 2, gradeContent: 'Better' };
      expect(change(graded, regraded).commented).toEqual([]);
    });

    it('reports a group assignment that became submitted', () => {
      const group = {
        ...ungraded,
        submitted: false,
        completionType: HomeworkCompletionType.GROUP,
      };
      const submitted = { ...group, submitted: true };
      expect(change(group, submitted).groupSubmitted).toEqual([
        { before: group, after: submitted },
      ]);
      expect(change(submitted, group).groupSubmitted).toEqual([]);
      const individual = {
        ...group,
        completionType: HomeworkCompletionType.INDIVIDUAL,
      };
      expect(
        change(individual, { ...individual, submitted: true }).groupSubmitted,
      ).toEqual([]);
    });

    it('reports an assignment both graded and moved under both', () => {
      const later = dayjs(ungraded.deadline).add(1, 'hour').toISOString();
      const after = { ...ungraded, graded: true, grade: 1, deadline: later };
      const { graded: g, deadlineChanged } = change(ungraded, after);
      expect(g).toHaveLength(1);
      expect(deadlineChanged).toHaveLength(1);
    });
  });
});
