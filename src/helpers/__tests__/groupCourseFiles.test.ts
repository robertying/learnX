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
    { key: `category:${slides.id}`, heading: slides.title },
    lecture2,
    lecture1,
    { key: `category:${labs.id}`, heading: labs.title },
    lab,
    { key: 'uncategorized', heading: other },
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
    { key: `category:${slides.id}`, heading: slides.title },
    first,
    { key: `category:${labs.id}`, heading: slides.title },
    second,
  ]);
  expect(groupCourseFiles([], other)).toEqual([]);
});
