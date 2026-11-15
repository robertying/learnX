// Flows that open mock items by their learnx:// links: 11-links.yaml, and the
// iPhone Duo posture flows (.maestro/postures), since Maestro can't tap on the
// Duo's inner display. Keep those links pointing at items the mock account
// has.
import { mockAssignments, mockFiles, mockNotices } from 'data/mock';
import { getUrlTarget } from 'helpers/openTarget';
import { readdirSync, readFileSync } from 'node:fs';

const dir = '.maestro/postures';
const postures = readdirSync(dir).filter(name => name.endsWith('.yaml'));

const items = {
  notice: mockNotices,
  assignment: mockAssignments,
  file: mockFiles,
};

const links = (path: string) =>
  (readFileSync(path, 'utf8').match(/LINK: '(learnx:\/\/[^']+)'/g) ?? []).map(
    link => link.slice("LINK: '".length, -1),
  );

const expectMockItem = (link: string) => {
  const { type, id } = getUrlTarget(link) ?? {};
  // Today has no id; an unknown type has no items.
  const known =
    type === 'today'
      ? [undefined]
      : (items[type as keyof typeof items] ?? []).map(item => item.id);
  expect(known).toContain(id);
};

describe('posture flows', () => {
  it('exist', () => {
    expect(postures.length).toBeGreaterThan(0);
  });

  it.each(postures)('%s opens a learnx:// link to a mock item', name => {
    const found = links(`${dir}/${name}`);
    expect(found).toHaveLength(1);
    expectMockItem(found[0]);
  });
});

it('11-links.yaml opens each kind of item and Today', () => {
  const found = links('.maestro/11-links.yaml');
  expect(found.map(link => getUrlTarget(link)?.type)).toEqual([
    'notice',
    'assignment',
    'file',
    'today',
  ]);
  found.forEach(expectMockItem);
});
