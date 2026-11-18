# src/services

Code that talks to the system and to servers outside `data/source`. The Electron app's own services are `.web` variants or named for Electron (`electron/AGENTS.md`).

## Surfaces

- `services/surfaces` keeps what learnX shows outside the app (widgets, reminders, Spotlight, App Intents, the system calendar and Reminders, courseX sharing) in step with its data. `watchSurfaces()` runs from `index.js`, so it runs in every JS runtime (the app, the background task, Android's notification action task); it follows the cached data, user data and settings, and `refreshSurfaces()` updates each output whose inputs changed, one run at a time. Code the system may stop soon after (the background sync, notification actions) awaits `refreshSurfaces()`; logout calls `clearSurfaces()`.
- Don't call the widget, Spotlight, reminder, calendar or courseX functions from screens or hooks: change the data and the surfaces follow. To add an output, add an entry to `surfaces` with its dependencies and update function.
- An output's update throws or rejects when it fails, rather than swallowing its own errors: `refreshSurfaces` reports it and runs it again with the next refresh. Calendar write failures also reach the app (`subscribeSurfaceErrors`) as a toast. The calendar and Reminders outputs also check for entries the user deleted (`missing`) and write them again, at most about once a minute and never with a permission prompt.

## Downloads

- Downloaded files are kept by ids, never names (`services/files/downloads`), since course names follow the app's language and a path built from one would break after a language change. A download is written to a partial folder and moved in only once it is whole, so a file in the downloads folder is always complete.
- People get files out through Downloads › Export (`services/files/export`), which writes readable names into a folder they pick. The Mac app may write only where people pick (the user-selected read-write entitlement), so saving there always goes through the system's save panel. The app's Documents folder isn't shown in Files or Finder: it holds the app's databases, not files for people.
