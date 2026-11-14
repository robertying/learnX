import Storage from 'expo-sqlite/kv-store';
import { mockAssignments, mockFiles, mockNotices } from 'data/mock';
import { Notice } from 'data/types/state';
import { recordError } from 'services/crashReporting';
import {
  SPOTLIGHT_INDEXED_KEY,
  clearSpotlight,
  updateSpotlight,
} from 'services/spotlight';

jest.mock('modules/spotlight', () => {
  // Keeps the state of the last write, as the index does.
  const index = { state: null as string | null };
  const write =
    (stateArg: number) =>
    async (...args: unknown[]) => {
      index.state = args[stateArg] as string;
    };
  return {
    __esModule: true,
    index,
    default: {
      indexState: jest.fn(async () => index.state),
      replaceItems: jest.fn(write(2)),
      updateItems: jest.fn(write(3)),
      removeAllItems: jest.fn(write(0)),
    },
  };
});

jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));

const { index, default: Spotlight } = jest.requireMock('modules/spotlight') as {
  index: { state: string | null };
  default: {
    indexState: jest.Mock;
    replaceItems: jest.Mock;
    updateItems: jest.Mock;
    removeAllItems: jest.Mock;
  };
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
    expect.any(String),
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
  expect(Spotlight.replaceItems).toHaveBeenCalledWith(
    'assignment',
    [expect.objectContaining({ id: mockAssignments[0].id })],
    expect.any(String),
  );
});

it('indexes files with their course, type and size', async () => {
  const file = mockFiles[0];
  await updateSpotlight({ files: [file] }, { hiddenCourses: [] });
  const [domain, [item]] = Spotlight.replaceItems.mock.calls[0];
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

/** A new JS runtime: fresh modules, the same saved hashes and index. */
const restart = async (
  run: (
    spotlight: typeof import('services/spotlight'),
    native: typeof Spotlight,
  ) => Promise<void>,
) => {
  const saved = Storage.getItemSync(SPOTLIGHT_INDEXED_KEY);
  const state = index.state;
  jest.clearAllMocks();
  await jest.isolateModulesAsync(async () => {
    const kv = (
      jest.requireMock('expo-sqlite/kv-store') as {
        default: {
          setItemSync: (key: string, value: string) => void;
          removeItemSync: (key: string) => void;
        };
      }
    ).default;
    if (saved) {
      kv.setItemSync(SPOTLIGHT_INDEXED_KEY, saved);
    } else {
      kv.removeItemSync(SPOTLIGHT_INDEXED_KEY);
    }
    const mock = jest.requireMock('modules/spotlight') as {
      index: { state: string | null };
      default: typeof Spotlight;
    };
    mock.index.state = state;
    await run(
      require('services/spotlight') as typeof import('services/spotlight'),
      mock.default,
    );
  });
};

it('sends only what changed after the app starts again', async () => {
  await updateSpotlight({ notices }, options);
  expect(Storage.getItemSync(SPOTLIGHT_INDEXED_KEY)).toBeTruthy();

  await restart(async (spotlight, native) => {
    await spotlight.updateSpotlight({ notices }, options);
    expect(native.removeAllItems).not.toHaveBeenCalled();
    expect(native.replaceItems).not.toHaveBeenCalled();
    expect(native.updateItems).not.toHaveBeenCalled();

    await spotlight.updateSpotlight({ notices: notices.slice(1) }, options);
    expect(native.updateItems).toHaveBeenCalledWith(
      'notice',
      [],
      ['n0'],
      expect.any(String),
    );
  });
});

it('indexes everything again when the index lost what was saved', async () => {
  await updateSpotlight({ notices }, options);
  // iOS emptied the index, e.g. after a restore to another phone.
  index.state = null;

  await restart(async (spotlight, native) => {
    await spotlight.updateSpotlight({ notices }, options);
    expect(native.removeAllItems).toHaveBeenCalledTimes(1);
    expect(native.replaceItems).toHaveBeenCalledWith(
      'notice',
      [
        expect.objectContaining({ id: 'n0' }),
        expect.objectContaining({ id: 'n1' }),
      ],
      expect.any(String),
    );
  });

  // And the next start trusts the index again.
  await restart(async (spotlight, native) => {
    await spotlight.updateSpotlight({ notices }, options);
    expect(native.removeAllItems).not.toHaveBeenCalled();
    expect(native.replaceItems).not.toHaveBeenCalled();
  });
});

it('indexes everything again when the index state cannot be read', async () => {
  await updateSpotlight({ notices }, options);

  await restart(async (spotlight, native) => {
    native.indexState.mockRejectedValueOnce(new Error('Unavailable'));
    await spotlight.updateSpotlight({ notices }, options);
    expect(native.removeAllItems).toHaveBeenCalledTimes(1);
    expect(native.replaceItems).toHaveBeenCalledTimes(1);
  });
});

it('reports a failed write and indexes everything on the next start', async () => {
  await updateSpotlight({ notices }, options);
  const error = new Error('Quota exceeded');
  Spotlight.updateItems.mockRejectedValueOnce(error);
  jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
  await updateSpotlight({ notices: notices.slice(1) }, options);
  expect(recordError).toHaveBeenCalledWith(error, 'Updating Spotlight');

  await restart(async (spotlight, native) => {
    await spotlight.updateSpotlight({ notices }, options);
    expect(native.removeAllItems).toHaveBeenCalledTimes(1);
    expect(native.replaceItems).toHaveBeenCalledTimes(1);
  });
});

it('forgets the saved index on logout and after a failed write', async () => {
  await updateSpotlight({ notices }, options);
  Spotlight.updateItems.mockRejectedValueOnce(new Error('Busy'));
  jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
  await updateSpotlight({ notices: notices.slice(1) }, options);
  expect(Storage.getItemSync(SPOTLIGHT_INDEXED_KEY)).toBe('{}');

  await updateSpotlight({ notices }, options);
  clearSpotlight();
  await updateSpotlight({}, options);
  expect(Storage.getItemSync(SPOTLIGHT_INDEXED_KEY)).toBeNull();
});
