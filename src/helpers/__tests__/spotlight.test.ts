import { mockAssignments, mockNotices } from 'data/mock';
import { Notice } from 'data/types/state';
import { clearSpotlight, updateSpotlight } from 'helpers/spotlight';

jest.mock('modules/spotlight', () => ({
  __esModule: true,
  default: {
    replaceItems: jest.fn(async () => {}),
    updateItems: jest.fn(async () => {}),
    removeAllItems: jest.fn(async () => {}),
  },
}));

const Spotlight = jest.requireMock('modules/spotlight').default as {
  replaceItems: jest.Mock;
  updateItems: jest.Mock;
  removeAllItems: jest.Mock;
};

const notices = mockNotices.slice(0, 3).map((n, i) => ({
  ...n,
  id: `n${i}`,
  courseId: i === 2 ? 'hidden' : 'course',
})) as Notice[];
const options = { hiddenCourses: ['hidden'] };

beforeEach(async () => {
  clearSpotlight();
  await updateSpotlight({}, options);
  jest.clearAllMocks();
});

it('replaces a domain first, without hidden courses', async () => {
  await updateSpotlight({ notices }, options);
  expect(Spotlight.replaceItems).toHaveBeenCalledTimes(1);
  const [domain, items] = Spotlight.replaceItems.mock.calls[0];
  expect(domain).toBe('notice');
  expect(items.map((i: { id: string }) => i.id)).toEqual(['n0', 'n1']);
  expect(Spotlight.updateItems).not.toHaveBeenCalled();
});

it('then sends only what changed or went, and nothing when unchanged', async () => {
  await updateSpotlight({ notices }, options);
  await updateSpotlight({ notices }, options);
  expect(Spotlight.replaceItems).toHaveBeenCalledTimes(1);
  expect(Spotlight.updateItems).not.toHaveBeenCalled();

  await updateSpotlight(
    { notices: [{ ...notices[0], title: 'Renamed' }] },
    options,
  );
  expect(Spotlight.updateItems).toHaveBeenCalledWith(
    'notice',
    [expect.objectContaining({ id: 'n0', title: 'Renamed' })],
    ['n1'],
  );
});

it('replaces the domain again after a failed update', async () => {
  await updateSpotlight({ notices }, options);
  Spotlight.updateItems.mockRejectedValueOnce(new Error('Busy'));
  jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
  await updateSpotlight({ notices: notices.slice(0, 1) }, options);
  await updateSpotlight({ notices: notices.slice(1, 2) }, options);
  expect(Spotlight.replaceItems).toHaveBeenCalledTimes(2);
});

it('keeps assignments in their own domain', async () => {
  await updateSpotlight(
    { assignments: mockAssignments.slice(0, 1) },
    { hiddenCourses: [] },
  );
  expect(Spotlight.replaceItems).toHaveBeenCalledWith('assignment', [
    expect.objectContaining({ id: mockAssignments[0].id }),
  ]);
});

it('removes everything on logout', async () => {
  clearSpotlight();
  await updateSpotlight({}, options);
  expect(Spotlight.removeAllItems).toHaveBeenCalled();
});
