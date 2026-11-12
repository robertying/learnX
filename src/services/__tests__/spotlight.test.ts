import { mockAssignments, mockFiles, mockNotices } from 'data/mock';
import { Notice } from 'data/types/state';
import { clearSpotlight, updateSpotlight } from 'services/spotlight';

jest.mock('modules/spotlight', () => ({
  __esModule: true,
  default: {
    syncItems: jest.fn(async () => {}),
    removeAllItems: jest.fn(async () => {}),
  },
}));

const Spotlight = jest.requireMock('modules/spotlight').default as {
  syncItems: jest.Mock;
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

it('sends a domain without hidden courses', async () => {
  await updateSpotlight({ notices }, options);
  expect(Spotlight.syncItems).toHaveBeenCalledTimes(1);
  const [domain, items] = Spotlight.syncItems.mock.calls[0];
  expect(domain).toBe('notice');
  expect(items.map((i: { id: string }) => i.id)).toEqual(['n0', 'n1']);
});

it('sends the whole list again when anything changed, and nothing when unchanged', async () => {
  await updateSpotlight({ notices }, options);
  await updateSpotlight({ notices }, options);
  expect(Spotlight.syncItems).toHaveBeenCalledTimes(1);

  await updateSpotlight(
    { notices: [{ ...notices[0], title: 'Renamed' }] },
    options,
  );
  expect(Spotlight.syncItems).toHaveBeenLastCalledWith('notice', [
    expect.objectContaining({ id: 'n0', title: 'Renamed' }),
  ]);

  await updateSpotlight({ notices: [] }, options);
  expect(Spotlight.syncItems).toHaveBeenLastCalledWith('notice', []);
  expect(Spotlight.syncItems).toHaveBeenCalledTimes(3);
});

it('sends the same list again after a failed sync', async () => {
  Spotlight.syncItems.mockRejectedValueOnce(new Error('Busy'));
  jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
  await updateSpotlight({ notices }, options);
  await updateSpotlight({ notices }, options);
  expect(Spotlight.syncItems).toHaveBeenCalledTimes(2);
});

it('keeps assignments in their own domain', async () => {
  await updateSpotlight(
    { assignments: mockAssignments.slice(0, 1) },
    { hiddenCourses: [] },
  );
  expect(Spotlight.syncItems).toHaveBeenCalledWith('assignment', [
    expect.objectContaining({ id: mockAssignments[0].id }),
  ]);
});

it('indexes files with their course, type and size', async () => {
  const file = mockFiles[0];
  await updateSpotlight({ files: [file] }, { hiddenCourses: [] });
  const [domain, [item]] = Spotlight.syncItems.mock.calls[0];
  expect(domain).toBe('file');
  expect(item).toMatchObject({ id: file.id, title: file.title });
  expect(item.details).toContain(file.courseName);
  expect(item.details).toContain(file.fileType.toUpperCase());
  expect(item.keywords).toContain(file.courseName);
});

it('removes everything on logout', async () => {
  clearSpotlight();
  await updateSpotlight({}, options);
  expect(Spotlight.removeAllItems).toHaveBeenCalled();
});
