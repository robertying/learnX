# shellcheck shell=bash
# Sourced by the E2E scripts, which run from the repo root.

# Prints the value of key $1 in .env (the last one if it repeats), without
# surrounding quotes, or nothing. Read only the values a script needs, so
# nothing else in .env leaves it.
read_env() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}
