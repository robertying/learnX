# Patched Maestro

Maestro's iOS driver shifts every element by the size difference between the
app and SpringBoard, and sends taps to the main display. That breaks two
setups:

- the iPhone Duo simulator open, where the app is on the inner display;
- iPadOS windowed apps, where the app is in a window smaller than the screen.

`maestro-display.patch` fixes the driver (upstream issue
mobile-dev-inc/Maestro#3623). `maestro-fold-posture.patch` adds the
`setFoldPosture` command from upstream PR mobile-dev-inc/Maestro#3621, so a
flow can set the iPhone Duo's hinge:

```yaml
- setFoldPosture: halfFold # closed, halfFold or flat
```
 Until a Maestro release includes both, build
it from source and put it first on `PATH`:

```sh
bin="$(scripts/maestro/build.sh | tail -n 1)"
PATH="$bin:$PATH" scripts/e2e.sh ios
```

`build.sh` needs Xcode and JDK 17 and clones Maestro to `~/repos/Maestro`.
Pass another folder named `Maestro` as its first argument to use that one.
