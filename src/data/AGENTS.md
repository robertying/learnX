# src/data

## Stores

- Settings (only the user's choices), the calendar sync's bookkeeping, what the user has seen, and the user's own data (archives, hidden courses, course order, server actions not sent yet) are Zustand stores persisted to `expo-sqlite/kv-store`. Storage is synchronous, so the stores hold their saved state as soon as they are imported, also in the background task. Read them with their `use…` hooks in components and `get…` functions elsewhere; change them through the exported functions, not `setState` from screens.
- Every persisted store is listed in `accountStores` (`data/accountData`) with how it's emptied, and a test fails for one that isn't, so logging out or switching accounts never leaves one behind.
- When the persisted shape of a store changes, bump its `version` in `src/data/storeVersions.json` and add a `migrate`. Keep `merge` filling in defaults for keys added later, so a key added without a bump is read by older code too. The file counts as native code for over-the-air updates: a store that finds a newer version than its code knows starts from its defaults, and expo-updates can go back to an older bundle (a rollback), so a version bump ships in a store release (root `AGENTS.md`, "Over-the-air updates").
- `src/data/legacy.ts` imports once what 18.0.x saved in AsyncStorage, before the UI shows. Don't remove it while users can still upgrade from 18.0.x. `scripts/e2e/e2e-upgrade.sh` tests that import end to end (`.maestro/AGENTS.md`): run it after changing `data/legacy`, `data/credentials`, `data/install` or a store's persisted shape.
- The saved data belongs to one account, recorded as `dataOwner` apart from the credentials, which some logins don't keep. A successful login as anyone else drops all of it first (`clearAccountData`, the same steps as logout), so a new account never starts with the previous one's data; logging in again as the same user keeps it.

## Server data

- Server data is in TanStack Query. The content lists are fetched course by course through one shared limiter; a course that fails keeps its cached items, and a list fails only when every course does. thu-learn-lib's per-item requests (an assignment's detail, a notice's attachment) are opt-in and costly, so they're fetched only for items that are new or whose list entry changed; refreshing one course fetches them all again.
- A course's name is picked by the app's language (`localizedCourseName`), never kept from the language it was fetched in, and `restoreQueryCache` renames the cached copies when the language changed since.
- Each query is saved to its own SQLite row and loaded back before the UI shows (`restoreQueryCache`), so lists show cached data before the login finishes and offline. A list changed in place (an item marked read or favorited) is saved soon after, batched with other changes (`saveQuerySoon`), since a list is written whole. Queries run only while logged in.
- Only the fields listed in `data/types/state` are kept of each item; add a field there to use it. Bump `QUERY_CACHE_VERSION` when a response's shape changes.
- Server times are Beijing time, and thu-learn-lib gives them as ISO 8601 strings with the offset, so `dayjs()` reads the right moment in any time zone. Compare them as moments (`helpers/serverTime`), not as strings.

### Submissions

- A file shared to learnX for a submission waits in `data/pendingAssignment` (not persisted) until the first submission screen takes it, so it attaches to one assignment only.
- A submission is sent the way the website's submit page sends it: the whole answer as HTML every time, since the server replaces the submitted one with it.

## Favorites and server actions

- Favorites are the website's (我的收藏); archives and hidden courses stay on the device, as the website has nothing like them.
- Everything that changes the account goes through one queue of server actions (`data/serverActions`). An action is shown right away, saved (one per item: the last wins) and sent when it can be; waiting actions, and ones the server took after a fetch started, are laid over every response, so a refresh never undoes them. A network error keeps the action; repeated HTTP errors drop it. Debug builds keep favorite changes queued until "Allow Server Writes" is on. To add a kind, add it to `ServerAction` and `actionChange` and give it a handler.
- Marking a notice read loads its page. An expired session answers with the login page and status 200, which thu-learn-lib takes as expired: it logs in again and loads the page once more, so the action isn't counted as done on the login page.

## Timetable

- The timetable comes from the registrar's calendar (`getCalendar`), which is fragile: it fails for long ranges and now and then for no clear reason, so it's asked for one week at a time, one request at a time, and a week that fails keeps what was last fetched for it. Only this week and later are ever read, so past weeks are forgotten as new ones are fetched. A week never fetched is worked out from each course's `timeAndLocation`, the class period times and the term's first day, with a note that holidays and moved classes may be missing. Calendar entries only name their course, so they're matched to courses by name.
- The timetable follows Beijing days, also on a device in another time zone: classes are picked by the Beijing day, and shown in the device's zone. Week 1 starts on the Monday of the term's first day, or the Monday after it when that day is a weekend.

## Background sync

- The background task (`services/background.ts`) refetches the current semester's content with the same per-course fetches as the screens, diffs it with the cache (`data/contentDiff.ts`) and notifies what the user turned on. A list that wasn't cached before or failed to fetch reports no changes, so the first sync isn't all new. While the app is open, only changes the unread markers don't show are notified. Everything found goes into the notified ledger before posting, so nothing is posted twice.
- On iOS and Mac it runs as a background app refresh task (our `expo-background-task` patch), whose identifier must stay in `BGTaskSchedulerPermittedIdentifiers` in `ios/learnX/Info.plist`: this project doesn't run config plugins, and without it every schedule fails with `notPermitted`.

## Login and session

- With a saved login the main UI stays up when a login fails: only the user's "Log in again" shows the login screen. `loginFailureOf` (`helpers/errors`) tells a failed login apart: `offline` (no answer), `serverError` (the servers answered with an error), `badCredential` (a wrong password, as after a change on the website), `untrustedDevice` (the SSO server no longer trusts the saved device fingerprint and asks for a second factor) or `failed`. Each has its own status row and toast. `hooks/useReLogin` retries offline logins and server errors on their own backoffs (`helpers/loginRetry`) and on return to the app; a refused login (`badCredential`, `untrustedDevice`) isn't tried again by itself, from pull to refresh or from the login page's saved-login button, so a changed password can't lock the account, and only a new password or SSO's second factor gets past it. The refusal is saved with the login (`data/credentials`), so a background sync or the next launch doesn't try it either: thu-learn-lib's credential provider (`data/source`) rejects with it without a request. In case it was a passing answer, the app in the foreground tries the saved login once more a day later, never a background task; a login that goes through, or a new one saved, forgets it. Coming back after a while checks the session with thu-learn-lib's `ensureSession` instead of a full login.
- A login waits only for the server. The saved login shows the main UI at once, and the lists fetch only once the login is done, so anything else it waited for (the keychain, the system clearing widgets, Spotlight and reminders, which can take minutes) would leave the lists empty meanwhile. Lists with nothing yet show a spinner while the login or the semester they wait for is under way (`useFirstLoad`).
- Work that needs a session but isn't a login (the background sync, a calendar sync, a notification action) calls `ensureSession` in `data/source`, never `loginWithFingerPrint`. Every Web Learning request goes through thu-learn-lib, which logs in again by itself when a request finds the session expired: handle session expiry and request errors there, in the library, never with a retry or a check of a request's own. Classify errors with `helpers/errors`.
- `data/source` makes one thu-learn-lib helper per JS runtime, so its logins never overlap, and clears the SSO cookies before every SSO login. When a request finds the login refused (a wrong password or an untrusted device), the session ends with that failure, whichever request found it, so the lists say why and offer "Log in again".
- Coming back to the app is handled in one place, `hooks/useReLogin`, in order: an over-the-air update, the session, the waiting server actions, then the stale lists that are mounted.
- Opening a notice or downloading a file marks it read in the cached list right away, also in later responses of the same session, so the Unread filter and counts change before the next refresh and a fetch already under way doesn't undo it.

## Mocks

### Mock login

The app can be used without a real Tsinghua account: enter `DUMMY_USERNAME` / `DUMMY_PASSWORD` from the repo-root `.env` on the login screen and it talks to an emulated server instead of learn.tsinghua.edu.cn. Use it for UI verification, screenshots and manual testing.

- These two values are not real credentials, so they can be typed and shown freely. Keep the live test login in `.env` out of logs and commits.
- `dataSource` (`data/source`) is the one place that picks the real or the emulated server (`data/mockSource.ts`), by the account the session's login named. Add a request the app wraps to `AppSource` and both sources, rather than checking for the mock account elsewhere. The emulated server answers after a network-like delay, emulates failures and session expiry, and keeps favorites and read notices in memory only. Course information sharing talks to courseX directly and isn't emulated.
- Test runs control the emulated server with launch arguments, applied before the first render (`services/launchOptions.ts`, which lists them). Android takes them only in debug and E2E builds, so other apps can't set them in a store build. Debug and E2E builds also take `learnx://mock-network?latency=…&failure=…` while running, for a test that needs the launch's login and catch-up over before the server slows down (`TodayUITests`).
- Debug builds have a Debug page (the wrench button in Today's header) with Network Emulation, Allow Server Writes and notification tools. Its choices reset when the JS reloads.
- The mock login is saved like a real one, so relaunches, failed logins and logging in again can be tested too. Typing it on the login screen again starts over from the mock data.

### Mock data

- `src/data/mock.ts` computes dates relative to now: keep new entries relative and free of sensitive info (emails, phone numbers, student IDs, URLs).
- It is meant to cover every UI state and to be good enough for store screenshots: real course names, made-up but plausible people's names (never real people), and items in every state. The emulated server answers in the language the app asks for, with English texts in `src/data/mockEnglish.ts`: a new item in `mock.ts` needs its English there. Like Web Learning, it never translates what teachers write, so a course taught in English stays English in both languages.
- Attachments and files download real sample files from `mock-files/` (from `main` on GitHub, so a new sample only works once merged). `mock-files/generate.py` rebuilds them; add a sample there rather than linking to outside files.
- Assignment submission is disabled after the deadline, so keep some mock deadlines in the future.
- The mock semester starts a fixed number of weeks before now (`mockSemesterStart`), so the current week is always the same, and the emulated timetable is worked out from the mock courses' class times.
