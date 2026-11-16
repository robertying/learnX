// Where the packaged app finds its updates: the newest GitHub release tagged
// `electron-v<version>`. learnX's mobile releases are tagged `v<version>` in
// the same repo and are its "Latest" release, which electron-updater's own
// GitHub provider would read, so this one picks Electron's releases by tag
// from the repo's release feed (releases.atom, which isn't held to the API's
// hourly limit), then reads the release's update file (latest.yml on Windows,
// latest-linux.yml or latest-linux-arm64.yml on Linux) as the generic
// provider does.

/** The tag prefix of the Electron app's releases. */
const TAG_PREFIX = 'electron-v';

/** A release version (x.y.z, no pre-release) as numbers, or null. */
const parseVersion = (/** @type {string} */ text) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  return match ? match.slice(1).map(Number) : null;
};

/** Whether version `a` is newer than `b`. */
const newer = (/** @type {number[]} */ a, /** @type {number[]} */ b) => {
  const i = a.findIndex((part, j) => part !== b[j]);
  return (
    i !== -1 && /** @type {number} */ (a[i]) > /** @type {number} */ (b[i])
  );
};

/**
 * The newest `electron-v<x.y.z>` tag a release feed links to, or null. Tags
 * with a pre-release part are left out.
 *
 * @param {string} feed
 * @returns {string | null}
 */
const latestElectronTag = feed => {
  /** @type {{ tag: string; version: number[] } | null} */
  let best = null;
  for (const [, tag] of feed.matchAll(
    /\/releases\/tag\/([^"'<>/?#\s]+)["']/g,
  )) {
    const name = decodeURIComponent(/** @type {string} */ (tag));
    const version = name.startsWith(TAG_PREFIX)
      ? parseVersion(name.slice(TAG_PREFIX.length))
      : null;
    if (version && (!best || newer(version, best.version))) {
      best = { tag: name, version };
    }
  }
  return best?.tag ?? null;
};

/**
 * A provider class for electron-updater's `custom` provider, built on its
 * `Provider` base and helpers (`electron-updater/out/providers/Provider`).
 * `url` is the repo's page (https://github.com/robertying/learnX), or a test
 * server that serves the same paths.
 *
 * @param {any} providerModule
 */
const createReleasesProvider = providerModule => {
  const { Provider, parseUpdateInfo, resolveFiles } = providerModule;

  return class ElectronReleasesProvider extends Provider {
    /**
     * @param {{ url: string }} options
     * @param {any} updater
     * @param {any} runtimeOptions
     */
    constructor(options, updater, runtimeOptions) {
      super(runtimeOptions);
      this.updater = updater;
      this.repoUrl = new URL(options.url.replace(/\/*$/, '/'));
      /** Where the newest release's files are, once found. */
      this.baseUrl = this.repoUrl;
    }

    async getLatestVersion() {
      const feed = await this.httpRequest(
        new URL('releases.atom', this.repoUrl),
        { accept: 'application/atom+xml, application/xml' },
      );
      const tag = latestElectronTag(feed ?? '');
      if (!tag) {
        throw Object.assign(
          new Error(`No ${TAG_PREFIX}* release in ${this.repoUrl}`),
          { code: 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND' },
        );
      }
      this.baseUrl = new URL(
        `releases/download/${encodeURIComponent(tag)}/`,
        this.repoUrl,
      );
      const channelFile = `${this.getDefaultChannelName()}.yml`;
      const channelUrl = new URL(channelFile, this.baseUrl);
      return parseUpdateInfo(
        await this.httpRequest(channelUrl),
        channelFile,
        channelUrl,
      );
    }

    /** @param {any} updateInfo */
    resolveFiles(updateInfo) {
      return resolveFiles(updateInfo, this.baseUrl);
    }
  };
};

module.exports = { TAG_PREFIX, createReleasesProvider, latestElectronTag };
