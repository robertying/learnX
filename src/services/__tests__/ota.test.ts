import * as Updates from 'expo-updates';
import { kvStorage } from 'data/storage';
import { OTA_AWAY_MS, updateOnReturn } from 'services/ota';
import { RELOAD_LINKS_KEY, setWindowLink } from 'services/windows';

beforeEach(() => {
  jest.replaceProperty(Updates, 'isEnabled', true);
});

describe('updateOnReturn', () => {
  it('checks for an update after an hour in the background', async () => {
    jest
      .mocked(Updates.checkForUpdateAsync)
      .mockResolvedValueOnce({ isAvailable: true } as Awaited<
        ReturnType<typeof Updates.checkForUpdateAsync>
      >);

    await expect(updateOnReturn(OTA_AWAY_MS, false)).resolves.toBe(false);
    await Promise.resolve();

    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('does nothing after a short break', async () => {
    await expect(updateOnReturn(OTA_AWAY_MS - 1000, true)).resolves.toBe(false);

    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('starts a downloaded update after an hour in the background, keeping what the window shows', async () => {
    setWindowLink(undefined, 'learnx://notice/n1');
    jest.mocked(Updates.reloadAsync).mockImplementationOnce(async () => {
      expect(JSON.parse(kvStorage.getItem(RELOAD_LINKS_KEY) as string)).toEqual(
        { '': 'learnx://notice/n1' },
      );
    });

    await expect(updateOnReturn(OTA_AWAY_MS, true)).resolves.toBe(true);

    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('carries on when the update cannot start, without keeping the links', async () => {
    jest
      .mocked(Updates.reloadAsync)
      .mockRejectedValueOnce(new Error('no update'));

    await expect(updateOnReturn(OTA_AWAY_MS, true)).resolves.toBe(false);
    expect(kvStorage.getItem(RELOAD_LINKS_KEY)).toBeNull();
  });

  it('keeps running when the server cannot be reached', async () => {
    jest
      .mocked(Updates.checkForUpdateAsync)
      .mockRejectedValueOnce(new Error('offline'));

    await updateOnReturn(OTA_AWAY_MS, false);
    await Promise.resolve();

    expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('does nothing when updates are off (debug builds)', async () => {
    jest.replaceProperty(Updates, 'isEnabled', false);

    await expect(updateOnReturn(OTA_AWAY_MS, true)).resolves.toBe(false);

    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });
});
