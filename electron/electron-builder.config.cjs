// Packaging for Windows and Linux with electron-builder (phase 5 of the plan;
// not run yet). Builds are unsigned and labeled Experimental. Run from this
// folder after `pnpm electron` has exported the web build.
const { version } = require('../package.json');

/** @type {Record<string, unknown>} */
module.exports = {
  appId: 'io.robertying.learnX.electron',
  productName: 'learnX',
  copyright: `Copyright © ${new Date().getFullYear()} Rui Ying`,
  // The app's version, and what Windows shows as the file's description
  // (Task Manager) and its company.
  extraMetadata: {
    version,
    description: 'learnX',
    author: { name: 'Rui Ying' },
  },
  directories: { output: '../build/electron/dist', buildResources: 'icons' },
  files: [
    'main.cjs',
    'preload.cjs',
    'net.cjs',
    'fileStore.cjs',
    'secrets.cjs',
    'icons/icon.png',
    'icons/icon.ico',
    { from: '../build/electron/web', to: 'web' },
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64', 'arm64'] }],
    icon: 'icons/icon.ico',
    executableName: 'learnX',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    shortcutName: 'learnX',
    uninstallDisplayName: 'learnX',
    artifactName: 'learnX-Setup-${version}-${arch}.${ext}',
  },
  linux: {
    target: [{ target: 'AppImage', arch: ['x64', 'arm64'] }],
    icon: 'icons/icon.png',
    executableName: 'learnx',
    category: 'Education',
    synopsis: 'Tsinghua Web Learning',
    desktop: {
      entry: {
        Name: 'learnX',
        Comment: 'Tsinghua Web Learning',
        // The window's WM_CLASS, which Electron takes from the app's name.
        StartupWMClass: 'learnX',
      },
    },
  },
  publish: { provider: 'github', owner: 'robertying', repo: 'learnX' },
};
