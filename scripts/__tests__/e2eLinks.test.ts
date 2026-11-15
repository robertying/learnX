// The iPhone Duo posture flows (.maestro/postures) open mock items by their
// learnx:// links, since Maestro can't tap on the Duo's inner display. Keep
// those links pointing at items the mock account has.
import { mockAssignments, mockFiles, mockNotices } from 'data/mock';
import { getUrlTarget } from 'helpers/openTarget';
import { readdirSync, readFileSync } from 'node:fs';

const dir = '.maestro/postures';
const flows = readdirSync(dir).filter(name => name.endsWith('.yaml'));

const items = {
  notice: mockNotices,
  assignment: mockAssignments,
  file: mockFiles,
};

describe('posture flows', () => {
  it('exist', () => {
    expect(flows.length).toBeGreaterThan(0);
  });

  it.each(flows)('%s opens a learnx:// link to a mock item', name => {
    const links =
      readFileSync(`${dir}/${name}`, 'utf8').match(
        /LINK: '(learnx:\/\/[^']+)'/g,
      ) ?? [];
    expect(links).toHaveLength(1);
    const [link = ''] = links;
    const { type, id } = getUrlTarget(link.slice("LINK: '".length, -1)) ?? {};
    // Today has no id; an unknown type has no items.
    const known =
      type === 'today'
        ? [undefined]
        : (items[type as keyof typeof items] ?? []).map(item => item.id);
    expect(known).toContain(id);
  });
});
