// Flows that open mock items by their learnx:// links: 11-links.yaml (and the
// Mac app's LinksUITests), and the iPhone Duo posture flows (.maestro/postures), since Maestro can't see the
// open Duo's tab bar; and 12-notification-actions.yaml, whose launches post
// notifications about mock items by id. Keep them pointing at items the mock
// account has.
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

it('12-notification-actions.yaml posts notifications about mock items', () => {
  const specs = (
    readFileSync('.maestro/12-notification-actions.yaml', 'utf8').match(
      /NOTIFICATION: '([^']+)'/g,
    ) ?? []
  ).map(line => line.slice("NOTIFICATION: '".length, -1));
  expect(specs.length).toBeGreaterThan(0);
  for (const spec of specs) {
    const [kind, list] = spec.split(':');
    const type = kind === 'reminder' ? 'assignment' : kind;
    const known = (items[type as keyof typeof items] ?? []).map(i => i.id);
    for (const id of list.split(',')) {
      expect(known).toContain(id);
    }
  }
});

it("the Mac app's LinksUITests opens each kind of item and Today", () => {
  const found = (
    readFileSync('ios/learnXUITests/Mac/LinksUITests.swift', 'utf8').match(
      /"learnx:\/\/[^"]+"/g,
    ) ?? []
  ).map(link => link.slice(1, -1));
  expect(found.map(link => getUrlTarget(link)?.type)).toEqual([
    'notice',
    'assignment',
    'file',
    'today',
  ]);
  found.forEach(expectMockItem);
});
