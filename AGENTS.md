# AGENTS.md

## Running and testing the app

- `pnpm start` runs Metro, `pnpm ios` / `pnpm android` build and launch the app.
- `pnpm typecheck` and `pnpm lint` must pass before committing.

## Logging in with mock data

You can log into the app without a real Tsinghua account. The `.env` file at
the repo root contains `DUMMY_USERNAME` and `DUMMY_PASSWORD`. Enter these on
the login screen and the app loads mock data from `src/data/mock.ts` instead
of calling the real learn.tsinghua.edu.cn backend (see `src/screens/Login.tsx`).

- Use these credentials for UI verification, screenshots, and manual testing.
- In mock mode, network sync and some features (e.g. course information
  sharing) are skipped or disabled.
- Do not print or commit the values in `.env`.
