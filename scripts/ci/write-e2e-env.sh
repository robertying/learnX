#!/bin/bash
# CI only: write the made-up mock login the E2E builds and tests use into
# .env (the Android E2E build and flows in android.yml, the Electron web build
# and Playwright tests in electron.yml), so it's defined once. Never a release's:
# those inline the real mock login from the maintainer's .env, or from the
# repository's secrets.
set -euo pipefail

printf 'DUMMY_USERNAME=e2e\nDUMMY_PASSWORD=e2e\n' > .env
