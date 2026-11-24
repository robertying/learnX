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
Maestro sends its own events. The helper only types ASCII.

`maestro-inner-display-tree.patch` keeps the whole app in the hierarchy on the open iPhone
Duo, whose tree left out every element right of a width, such as learnX's tab column. UIKit
gives the app's accessibility element the inner display's portrait size while the app runs in
landscape: `launchApp` loads the libraries `MAESTRO_IOS_INSERT_LIBRARIES` names into the app on
a simulator, and `scripts/e2e/e2e.sh` names `scripts/e2e/sim-ax-frame.m`, which gives the app
element the size of the screen it is on. The tree also keeps the bounds the app had when the
runner first read it, so `setFoldPosture` starts a new runner after moving the hinge. An app
already running without the libraries, such as Calendar, which the system keeps running in the
background for its widgets, is started again so it gets them; `simctl launch` would only bring
it to the front.

`maestro-inner-display-alerts.patch` places and answers a SpringBoard alert on the open iPhone
Duo. SpringBoard reports it in the inner display's unrotated portrait points while the app is in
landscape, so its frames are turned a quarter turn to where it shows. The runner's own tap
answering a notifications request would land on the main display, so it hands the tap to the
driver, which sends it through `scripts/e2e/sim-touch.swift`.

`maestro-fold-posture.patch` adds the
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

`maestro-look-alike-elements.patch` keeps a tap on its element when the screen moves first. A
tap right after a scroll waits for the element to stop moving, finding it in each new hierarchy by
its attributes, but elements that look alike, such as the switches of a settings page, which all
read 1 or 0, matched more than once: the element counted as gone and the tap landed where it had
been before the list settled, on another row. The patch tells them apart by the ids of the
elements that hold them, and gives an element found with `childOf` the whole screen it was found
on, as one found without it has, rather than a hierarchy of the element alone.

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

`maestro-pinch.patch` adds a `pinch` command, two fingers moving apart or together, on Android:

```yaml
- pinch:
    scale: 2 # what is under the fingers doubles; 0.5 halves it
    point: 50%,50% # the default; or pixels, as x,y
    duration: 500 # milliseconds, the default
```

The driver's instrumentation moves the two pointers with UiAutomator, since `adb shell input` and
`sendevent` (without root) send only one finger. The fingers sit side by side, at most 40% of the
screen's shorter side apart and less near a side edge, so a pinch in a split view's pane stays in
it. On iOS it fails as an unsupported command. A Maestro release can't read a flow with it at all,
so the one flow that pinches, `.maestro/pinch/zoom-pdf.yaml`, isn't among the flows `config.yaml`
runs: `scripts/e2e/e2e.sh android` runs it after them when the Maestro on `PATH` is a build of
`build.sh`'s with this patch, which `build.sh` lists in `learnx-patches` beside its `bin` folder.

Until a Maestro release includes all of them, build
it from source and put it first on `PATH`:

```sh
bin="$(scripts/e2e/maestro/build.sh <install folder> | tail -n 1)"
PATH="$bin:$PATH" scripts/e2e/e2e.sh ios
```

`build.sh` needs Xcode, JDK 17 and the Android SDK. It builds in a temporary clone of
Maestro's base commit, without history, and keeps only the installed tool in
the folder it's given (about 370 MB; the clone and its build outputs take
some 2 GB). To change the patches, give it a checkout to build in with
`MAESTRO_SOURCE` (its header says how).
