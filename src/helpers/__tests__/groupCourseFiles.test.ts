import { groupCourseFiles } from 'helpers/groupCourseFiles';
import { file } from 'test-utils/fixtures/cards';

const slides = file().category!;
const labs = { ...slides, id: 'labs', title: 'Labs' };
const other = 'Uncategorized';

it('keeps upload order within each category and puts unclassified files last', () => {
  const syllabus = file({ id: 'syllabus', category: undefined });
  const lecture2 = file({ id: 'lecture2', category: slides });
  const lab = file({ id: 'lab', category: labs });
  const lecture1 = file({ id: 'lecture1', category: slides });
  const notes = file({ id: 'notes', category: { ...slides, title: ' ' } });
  const files = Object.freeze([syllabus, lecture2, lab, lecture1, notes]);

  expect(groupCourseFiles(files, other)).toEqual([
    { key: `category:${slides.id}`, heading: slides.title, expanded: true },
    lecture2,
    lecture1,
    { key: `category:${labs.id}`, heading: labs.title, expanded: true },
    lab,
    { key: 'uncategorized', heading: other, expanded: true },
    syllabus,
    notes,
  ]);
});

it('keeps different categories with the same title distinct and omits empty groups', () => {
  const first = file({ id: 'first', category: slides });
  const second = file({
    id: 'second',
    category: { ...labs, title: slides.title },
  });

  expect(groupCourseFiles([first, second], other)).toEqual([
    { key: `category:${slides.id}`, heading: slides.title, expanded: true },
    first,
    { key: `category:${labs.id}`, heading: slides.title, expanded: true },
    second,
  ]);
  expect(groupCourseFiles([], other)).toEqual([]);
});

it('keeps collapsed headings in order and uses ids even when a category is renamed', () => {
  const renamed = { ...slides, title: 'Lecture notes' };
  const lecture = file({ id: 'lecture', category: renamed });
  const lab = file({ id: 'lab', category: labs });
  const syllabus = file({ id: 'syllabus', category: undefined });

  expect(
    groupCourseFiles([syllabus, lecture, lab], other, [
      `category:${slides.id}`,
      'uncategorized',
    ]),
  ).toEqual([
    { key: `category:${slides.id}`, heading: renamed.title, expanded: false },
    { key: `category:${labs.id}`, heading: labs.title, expanded: true },
    lab,
    { key: 'uncategorized', heading: other, expanded: false },
  ]);
});
