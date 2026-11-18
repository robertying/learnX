# Patched Maestro

Maestro's iOS driver shifts every element by the size difference between the
app and SpringBoard, and sends taps to the main display. That breaks two
setups:

- the iPhone Duo simulator open, where the app is on the inner display;
- iPadOS windowed apps, where the app is in a window smaller than the screen.

`maestro-display.patch` fixes the positions (upstream issue
mobile-dev-inc/Maestro#3623), but no event XCUITest makes reaches the inner
display. Xcode 27's simulators take touches and keys from `dtuhidd`, a daemon
inside the simulator, which names the display each touch is for.
`maestro-sim-touch.patch` sends taps, long presses, swipes, typing and erasing
through `scripts/e2e/sim-touch.swift`, which talks to it, whenever a display
other than the main one is lit. `scripts/e2e/e2e.sh` builds the helper and
names it in `MAESTRO_IOS_SIM_TOUCH`; without it, or on the main display,
Maestro sends its own events. The helper only types ASCII. `maestro-fold-posture.patch` adds the
`setFoldPosture` command from upstream PR mobile-dev-inc/Maestro#3621, so a
flow can set the iPhone Duo's hinge:

```yaml
- setFoldPosture: halfFold # closed, halfFold or flat
```

`maestro-hierarchy-fallback.patch` fixes the hierarchy of a screen whose
accessibility tree is 60 or more levels deep, such as a notice on iPhone. The
driver then snapshots each child on its own, but it took the nth `.other`
descendant instead of the nth child. The first one is UIKit's empty touch
fallback view, so an app with one window came back with only the status bar.
After a login the keyboard's window happened to hide this, so it showed up
only when a flow started with the app already logged in.

`maestro-tiny-elements.patch` makes Maestro skip an element under 8 points
across or high. UIKit leaves copies of a sheet's bar buttons outside the
sheet, too small to see or tap: the file picker's Cancel is 7×7 points on an
iPhone and one point wide on the closed iPhone Duo, whose bars sit at the
side. Maestro matched the copy first, and the tap did nothing.

`maestro-springboard-alerts.patch` adds an alert SpringBoard shows over the
app to the hierarchy, on top. Such an alert (an app asking to send
notifications, as the system Calendar does on a simulator's first launches;
Save Password after a login) isn't in the app's tree, and the app stays the
foreground app while it shows, so flows couldn't see or answer it and their
taps landed under it. A notifications request is answered as `launchApp`'s
permissions say, as the driver already did when SpringBoard was in front.

`maestro-instrumentation-shell.patch` runs the Android driver's
instrumentation (`am instrument`) in the foreground of its adb shell. Run in
the background, the shell exited at once and stayed a zombie while Maestro
kept its stream open, and on API 29 emulators Android's llkd kills adbd once
a child has been a zombie for 10 minutes: every session longer than that lost
the device (the `android-min` profile, from `08-settings` on).

Until a Maestro release includes all of them, build
it from source and put it first on `PATH`:

```sh
bin="$(scripts/e2e/maestro/build.sh <folder>/Maestro | tail -n 1)"
PATH="$bin:$PATH" scripts/e2e/e2e.sh ios
```

`build.sh` needs Xcode and JDK 17. It takes the Maestro checkout as its
argument (or `MAESTRO_DIR`), a folder named `Maestro`, and clones Maestro
there if it doesn't exist.
