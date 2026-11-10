import { Platform } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';
import {
  applicableHighlights,
  displayVersion,
  findWhatsNew,
  maxHighlights,
  type Release,
  releases,
  whatsNewContext,
  whatsNewSince,
} from 'helpers/whatsNew';
import packageJson from '../../../package.json';
import en from 'assets/translations/en';

const list: Release[] = [
  {
    version: '20.0.0',
    highlights: [
      { icon: 'afternoon', title: 'welcomeTitle', body: 'welcomeTitle' },
      {
        icon: 'widgets',
        title: 'welcomeTitle',
        body: 'welcomeTitle',
        minNative: '20.0.0',
      },
    ],
  },
  {
    version: '19.1.0',
    highlights: [
      {
        icon: 'search',
        title: 'welcomeTitle',
        body: 'welcomeTitle',
        minNative: '19.1.0',
        platforms: ['ios', 'mac'],
      },
    ],
  },
  {
    version: '19.0.0',
    highlights: [
      { icon: 'afternoon', title: 'welcomeTitle', body: 'welcomeTitle' },
    ],
  },
];

const ios = (version: string, nativeVersion = version) => ({
  version,
  nativeVersion,
  platform: 'ios' as const,
});

describe('whatsNewSince', () => {
  it('shows the release an update brings', () => {
    expect(whatsNewSince('18.0.3', ios('19.0.0'), list)?.version).toBe(
      '19.0.0',
    );
  });

  it('shows nothing for a bug-fix release with no highlights', () => {
    expect(whatsNewSince('19.0.0', ios('19.0.1'), list)).toBeNull();
  });

  it('shows a release missed before a bug fix', () => {
    expect(whatsNewSince('18.0.3', ios('19.0.1'), list)?.version).toBe(
      '19.0.0',
    );
  });

  it('shows only the newest release when several were skipped', () => {
    expect(whatsNewSince('18.0.3', ios('20.0.0'), list)?.version).toBe(
      '20.0.0',
    );
  });

  it('shows nothing again once seen, or after a rollback', () => {
    expect(whatsNewSince('20.0.0', ios('20.0.0'), list)).toBeNull();
    expect(whatsNewSince('20.0.0', ios('19.1.0'), list)).toBeNull();
  });

  it('shows an over-the-air release, leaving out what needs a newer app', () => {
    const shown = whatsNewSince('19.1.0', ios('20.0.0', '19.1.0'), list);
    expect(shown?.version).toBe('20.0.0');
    expect(shown?.highlights.map(h => h.icon)).toEqual(['afternoon']);
  });

  it('falls back to an older release when none of a newer one applies', () => {
    // 19.1's only row is for Apple platforms.
    expect(
      whatsNewSince(
        '18.0.0',
        { version: '19.1.0', nativeVersion: '19.1.0', platform: 'android' },
        list,
      )?.version,
    ).toBe('19.0.0');
  });

  it('shows a new install the current release', () => {
    expect(whatsNewSince(null, ios('19.0.0'), list)?.version).toBe('19.0.0');
  });
});

describe('applicableHighlights', () => {
  it('needs the native version when a row names one', () => {
    expect(
      applicableHighlights(list[0], {
        nativeVersion: null,
        platform: 'android',
      }),
    ).toHaveLength(1);
    expect(
      applicableHighlights(list[0], { nativeVersion: '20.0', platform: 'mac' }),
    ).toHaveLength(2);
  });
});

describe('platforms', () => {
  it('leaves out rows for other platforms', () => {
    const android = { nativeVersion: '19.1.0', platform: 'android' as const };
    expect(applicableHighlights(list[1], android)).toEqual([]);
    expect(
      applicableHighlights(list[1], { ...android, platform: 'mac' }),
    ).toHaveLength(1);
    // So Android falls back to the release before.
    expect(
      whatsNewSince('18.0.0', { version: '19.1.0', ...android }, list)?.version,
    ).toBe('19.0.0');
  });

  it('keeps Spotlight out of the Android 19 highlights', () => {
    const titles = (platform: 'ios' | 'android') =>
      applicableHighlights(
        releases.find(r => r.version === '19.0.0')!,
        {
          nativeVersion: '19.0.0',
          platform,
        },
      ).map(h => h.title);
    expect(titles('ios')).toContain('whatsNew19SpotlightTitle');
    expect(titles('android')).not.toContain('whatsNew19SpotlightTitle');
  });

  it('describes this install', () => {
    const os = Platform.OS;
    expect(whatsNewContext()).toMatchObject({
      version: packageJson.version,
      platform: 'ios',
    });
    const isMac = jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    expect(whatsNewContext().platform).toBe('mac');
    isMac.mockRestore();
    Platform.OS = 'android';
    expect(whatsNewContext().platform).toBe('android');
    Platform.OS = os;
  });
});

describe('versions', () => {
  it('reads short and unreadable versions', () => {
    // "20.0" is 20.0.0
    expect(whatsNewSince('19.1', ios('20.0'), list)?.version).toBe('20.0.0');
    // An unreadable native version has none of the native rows.
    expect(
      applicableHighlights(list[0], { nativeVersion: 'beta', platform: 'ios' }),
    ).toHaveLength(1);
    // An unreadable seen version counts as never seen.
    expect(whatsNewSince('unknown', ios('19.0.0'), list)?.version).toBe(
      '19.0.0',
    );
  });
});

describe('findWhatsNew', () => {
  it('finds the newest release up to the running version', () => {
    expect(findWhatsNew(ios('19.5.0'), null, list)?.version).toBe('19.1.0');
    expect(findWhatsNew(ios('18.0.0'), null, list)).toBeNull();
  });
});

describe('displayVersion', () => {
  it('drops zeros at the end', () => {
    expect(displayVersion('19.0.0')).toBe('19');
    expect(displayVersion('19.1.0')).toBe('19.1');
    expect(displayVersion('19.1.2')).toBe('19.1.2');
  });

  it('reads a short version as its missing parts zero', () => {
    expect(displayVersion('19')).toBe('19');
    expect(displayVersion('19.2')).toBe('19.2');
  });
});

describe('whatsNewSince the shipped releases', () => {
  it('picks from the releases the app ships with', () => {
    const context = {
      version: releases[0].version,
      nativeVersion: releases[0].version,
      platform: 'ios' as const,
    };
    expect(whatsNewSince(null, context)).toEqual(
      findWhatsNew(context, null, releases),
    );
  });
});

describe('releases', () => {
  it('lists newest first, with translated rows', () => {
    const versions = releases.map(release => release.version);
    expect([...versions].sort().reverse()).toEqual(versions);
    for (const { highlights } of releases) {
      expect(highlights.length).toBeGreaterThan(0);
      expect(highlights.length).toBeLessThanOrEqual(maxHighlights);
      for (const { title, body } of highlights) {
        expect(en[title]).toBeTruthy();
        expect(en[body]).toBeTruthy();
      }
    }
  });
});
