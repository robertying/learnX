import { Platform } from 'react-native';
import { nativeApplicationVersion } from 'expo-application';
import semverGt from 'semver/functions/gt';
import semverLte from 'semver/functions/lte';
import semverValid from 'semver/functions/valid';
import DeviceInfo from 'constants/DeviceInfo';
import type { TranslationKey } from 'helpers/i18n';
import type { SystemIconName } from 'helpers/systemIcons';
import packageJson from '../../package.json';

export type WhatsNewPlatform = 'ios' | 'mac' | 'android';

/** One row of a release's What's New. */
export interface Highlight {
  icon: SystemIconName;
  title: TranslationKey;
  body: TranslationKey;
  /**
   * The native app version this needs (a widget, an App Intent, a native
   * module). Left out when an over-the-air update to the JS can deliver it.
   */
  minNative?: string;
  /** Only shown on these; all of them when left out. iPadOS counts as `ios`. */
  platforms?: WhatsNewPlatform[];
}

export interface Release {
  /** The JS version (`package.json`) that brings these. */
  version: string;
  /**
   * At most `maxHighlights`, the biggest changes; the rest go in the
   * changelog.
   */
  highlights: Highlight[];
}

/**
 * The most rows a What's New lists, as in Apple's own sheets, so it stays
 * short enough to read at a glance.
 */
export const maxHighlights = 4;

/**
 * Hand-written highlights of feature releases, newest first. A release with
 * no entry here (a bug fix) shows no What's New.
 * Over-the-air updates change `package.json`'s version too, so an entry for
 * one shows on the first launch of its JS.
 */
export const releases: Release[] = [
  {
    version: '19.0.0',
    highlights: [
      {
        icon: 'today',
        title: 'whatsNew19TodayTitle',
        body: 'whatsNew19TodayBody',
      },
      {
        icon: 'widgets',
        title: 'whatsNew19WidgetsTitle',
        body: 'whatsNew19WidgetsBody',
        minNative: '19.0.0',
      },
      {
        icon: 'reminder',
        title: 'whatsNew19RemindersTitle',
        body: 'whatsNew19RemindersBody',
        minNative: '19.0.0',
      },
      {
        icon: 'search',
        title: 'whatsNew19SpotlightTitle',
        body: 'whatsNew19SpotlightBody',
        minNative: '19.0.0',
        platforms: ['ios', 'mac'],
      },
    ],
  },
];

export interface WhatsNewContext {
  /** The running JS version. */
  version: string;
  /** The installed app's own version, which over-the-air updates don't change. */
  nativeVersion: string | null;
  platform: WhatsNewPlatform;
}

export interface WhatsNew {
  version: string;
  highlights: Highlight[];
}

/** A version that semver can compare ("19.0" counts as "19.0.0"). */
const normalize = (version: string) =>
  semverValid(version) ?? semverValid(`${version}.0`) ?? '0.0.0';

/** The highlights of `release` that this install has. */
export const applicableHighlights = (
  release: Release,
  { nativeVersion, platform }: Omit<WhatsNewContext, 'version'>,
) =>
  release.highlights.filter(
    ({ minNative, platforms }) =>
      (!platforms || platforms.includes(platform)) &&
      (!minNative ||
        (nativeVersion !== null &&
          semverLte(normalize(minNative), normalize(nativeVersion)))),
  );

/**
 * The newest release up to the running version whose highlights this install
 * has, newer than `after` when given.
 */
export const findWhatsNew = (
  context: WhatsNewContext,
  after: string | null = null,
  list: Release[] = releases,
): WhatsNew | null => {
  const current = normalize(context.version);
  for (const release of list) {
    const version = normalize(release.version);
    if (semverGt(version, current)) {
      continue;
    }
    if (after && !semverGt(version, normalize(after))) {
      return null;
    }
    const highlights = applicableHighlights(release, context);
    if (highlights.length > 0) {
      return { version: release.version, highlights };
    }
  }
  return null;
};

/**
 * What's New to show on this launch: the newest release since the one last
 * seen, with what this install has of it. Skipping from 18 to 20 shows 20's
 * only; rolling back never shows an older one again, since `seen` only moves
 * forward (`setWhatsNewSeen`).
 */
export const whatsNewSince = (
  seen: string | null,
  context: WhatsNewContext,
  list: Release[] = releases,
): WhatsNew | null => {
  if (seen && !semverGt(normalize(context.version), normalize(seen))) {
    return null;
  }
  return findWhatsNew(context, seen, list);
};

/** This install's version and platform. */
export const whatsNewContext = (): WhatsNewContext => ({
  version: packageJson.version,
  nativeVersion: nativeApplicationVersion,
  platform: DeviceInfo.isMac()
    ? 'mac'
    : Platform.OS === 'android'
      ? 'android'
      : 'ios',
});

/** The title's version: "19" for 19.0.0, "19.1" for 19.1.0, else as is. */
export const displayVersion = (version: string) => {
  const [major, minor = '0', patch = '0'] = version.split('.');
  if (patch !== '0') {
    return version;
  }
  return minor === '0' ? major : `${major}.${minor}`;
};
