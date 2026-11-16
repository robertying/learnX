# The Electron app (Windows, later Linux)

An experimental, best-effort build: an Electron app around a React Native Web build of the app's own code. Mobile releases never wait on it and its checks aren't required. Phase 1 of the plan (the app runs and the mock login reaches Today) is done; the live login's SSO page, the Fluent UI, desktop services (files, notifications, tray) and packaging come in later phases.

## Running it

- `pnpm electron` exports the web build (`expo export -p web`) to `build/electron/web` and opens it in Electron; `--skip-export` reuses the last export. The first run downloads Electron itself into this package's `node_modules`: `pnpm install` skips Electron's download script (`allowBuilds` in `pnpm-workspace.yaml`), so mobile installs never fetch it.
- In development everything Electron writes stays in `build/electron/data` and `--use-mock-keychain` keeps `safeStorage` out of the macOS keychain. Electron still leaves `~/Library/Preferences/com.github.Electron.plist` and a LaunchServices entry for `node_modules/electron/dist/Electron.app` on a Mac (and a packaged build would add folders named learnX or `io.robertying.learnXElectron` under `~/Library`): remove them with `defaults delete com.github.Electron`, deleting the file, and `lsregister -u <that path>`.
- `--capture <dir>` lets the page save window captures (`await learnx.capture('name')`, `webContents.capturePage` with background throttling off). Pass `-- --remote-debugging-port=9222` to drive the window over the Chrome DevTools Protocol.
- `LEARNX_LAUNCH_OPTIONS` (JSON) gives the app a test run's launch options (`src/services/launchOptions`) as its root props, as Android's launch extras do. The live test login (`liveUsername`, `liveFingerprint`) also needs `TEST_LOGIN=1` for the export.

## Main process

- `main.cjs` names the app learnX (`app.setName`, `productName`), with the app id `io.robertying.learnXElectron` (`setAppUserModelId` on Windows), named as a top-level target like `io.robertying.learnXTests`: `io.robertying.learnX.<name>` is for the iOS app's extensions, and the iOS bundle id is the Mac Catalyst app's. It serves the web build from `app://learnx/` with a content security policy, keeps the window on the app (links open in the browser), and registers nothing with the system.
- The page runs sandboxed and context-isolated; `preload.cjs` exposes `window.learnx`, and every IPC handler checks that the call comes from `app://learnx/`.
- `net.cjs`: requests to Tsinghua's sites (and courseX) run here with `net.request` and the window session's cookies, following redirects itself to record the final URL (Electron's `net.fetch` leaves `Response.url` empty). Other hosts, and redirects to them, are refused.
- `fileStore.cjs`: key-value storage as one file per key under the app's data folder, written through a temporary file. `secrets.cjs` keeps the saved login in it encrypted with `safeStorage`, and refuses to save where the system has no encryption.
- `electron-builder.config.cjs` is the packaging config (NSIS for Windows, AppImage for Linux, unsigned); electron-builder itself isn't installed until packaging (phase 5).
- Tests are in `__tests__`, run by Jest's `tooling` project and typed by `scripts/tsconfig.json`.

## The page (`src/web`)

- Web variants use platform extensions (`.web.ts`, `.web.tsx`), which Metro picks over the iOS file. Metro tries every platform for one extension before the next, so a `.web.tsx` file loses to a `.ts` base file: give a variant the base file's extension (`modules/toast/index.web.ts` re-exports `src/web/packages/toast.tsx`).
- `index.web.js` renders the app into the page; `polyfills.web.js` sends the page's http(s) requests through the main process (`web/fetch`) and fills in `PlatformColor` and `DynamicColorIOS` as CSS variables that follow the system's appearance (`web/systemColors`, from the palette in `theme/electron`).
- Packages with no web build, or one that can't run there, resolve to the files `src/web/aliases.json` names, on web only (`metro.config.js`): expo-sqlite's kv-store, expo-secure-store and the cookie manager on the bridge, and minimal stand-ins (`src/web/packages`) for SwiftUI views and modifiers, the native tab bar (a bottom bar, as Android's), react-native-pdf, react-native-share, expo-notifications and expo-file-system. They're tested in `src/web/__tests__` with a fake bridge (`test-utils/mocks/electronBridge`).
- What `index.js` starts that has no meaning here yet (notification actions, the background sync, surfaces) has no-op `.web.ts` variants until phase 4.
