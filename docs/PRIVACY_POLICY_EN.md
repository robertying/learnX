# learnX Privacy Policy

Effective: November 2026

learnX is a free, open-source app for Tsinghua University's Web Learning, made by Rui Ying ("I"). This policy explains what information the app handles, where it goes, and the choices you have. The app's source code is public at [github.com/robertying/learnX](https://github.com/robertying/learnX), so you can check everything described here.

## In short

- Your Tsinghua username, password, and course content stay on your device and are only sent to Tsinghua's own servers, unless you turn on Course Information Sharing (below).
- I don't collect your account, courses, notices, assignments, files, or grades. When the app checks my update server for updates, it doesn't send them either (see Other connections).
- Crash reports and basic usage statistics go to Google Firebase (not from the Windows and Linux app). They don't include your login or course content.
- Course Information Sharing (courseX) is off until you turn it on. When on, it uploads public information about your courses this semester, never information about you.

## Your Tsinghua account

To log in, learnX asks for your Tsinghua username and password. When you log in through the Tsinghua ID login page, learnX also keeps the device identifier that page uses to recognize a trusted device.

- They are stored in your device's secure storage (Keychain on iOS, iPadOS, and macOS; Keystore-protected storage on Android). They are not included in backups and don't move to other devices.
- The Windows and Linux app encrypts them with the system's protection for your account (Windows Data Protection; on Linux, your keyring through the Secret Service or KWallet) and keeps them in its data folder on your computer: on Windows in your local profile, which doesn't move to other PCs. On Linux without a keyring it doesn't save them, and you log in each time. A backup of your home folder may include the encrypted copy.
- They are only sent to Tsinghua's servers (id.tsinghua.edu.cn and learn.tsinghua.edu.cn) to log you in, including when the app refreshes in the background.
- Logging out deletes them from the device, along with the login cookies for Tsinghua's sites.

## Your course content

learnX downloads your courses, notices, files, assignments, grades, and class schedule from Web Learning and keeps them on your device so you can read them offline. Files you download are saved on your device. Actions you take, such as submitting an assignment or adding a favorite, are sent to Web Learning, just as on its website.

Your settings, archived and hidden items, and submission drafts are also kept only on your device. Logging out or deleting the app removes them.

On Windows, uninstalling learnX removes everything it kept: your saved login, settings, cached content, downloaded files, and its Start at Login entry. On Linux, deleting the AppImage or removing the package leaves learnX's data folder (`~/.config/learnX`), with your encrypted login and downloaded files: log out first, or delete that folder yourself.

## Device features

Each of these runs on your device and sends nothing to me:

- **Notifications.** learnX checks Web Learning in the background and posts notifications on your device for new content, grades, deadline changes, deadline reminders, and class reminders. There is no push server.
- **Calendar and Reminders.** Only when you turn on sync, learnX adds your class schedule and assignments to the calendar or reminders list you choose. It reads the list of your calendars to let you choose one, and doesn't read your other events.
- **Widgets, Spotlight, and Siri.** learnX shares upcoming deadlines, classes, and recent items with its widgets, and on Apple devices adds notices, assignments, and files to the system's on-device search index. You can remove them by turning the feature off or logging out.
- **Camera, photos, and files.** learnX only reads a photo or file you pick or share to it, to attach it to an assignment submission. It saves images to your photo library only when you ask.

The system asks your permission before learnX can use notifications, calendars, reminders, the camera, or your photos, and you can change these in your device's settings at any time. Windows and Linux don't ask before an app shows notifications: turn them off in learnX's settings or in the system's notification settings. The Windows and Linux app has no widgets, search index, calendar sync, camera, or photo library; it exports your schedule and deadlines as a calendar file you save where you choose.

## Course Information Sharing (courseX)

This feature is off by default. When you turn it on, learnX uploads information about your courses this semester to courseX ([tsinghua.app](https://tsinghua.app)), where anyone can see it: the course ID, number, and section, Chinese and English names, the teacher's name and staff number, and the class times and locations.

No information about you is uploaded: not your name, student number, grades, or anything else from your account, and the upload carries no identifier of you or your device. Turning the feature off stops further uploads. Course information already shared stays on courseX, since it describes the course, not you.

## Crash reports and usage statistics

The iOS, iPadOS, macOS, and Android apps use Google Firebase to find and fix problems; the Windows and Linux app sends no crash reports or usage statistics:

- **Firebase Crashlytics** receives a report when the app crashes or hits an unexpected error. A report has the error and where in the code it happened, the app version, the device model, operating system version, free memory and disk space, the screen that was open, how the last background refresh went (how long it took and how many items it got), and a random installation identifier. Web addresses in reports have their query parts removed, and replies from Web Learning are left out, so reports don't carry your course content.
- **Firebase Analytics** counts app installs, opens, and sessions, along with the app version, device model, operating system, and the approximate region derived from your IP address.

learnX doesn't collect your advertising identifier, doesn't show ads, and doesn't track you across other apps or websites. Crash reports aren't sent from the demo account. Google keeps this data under its own retention settings and the [Firebase privacy information](https://firebase.google.com/support/privacy).

## Other connections

- The iOS, iPadOS, macOS, and Android apps check my update server (ota.tsinghua.app) for updates to the app's code when they start, and when you come back to them after an hour or more away, and download an update when there is one. A check carries the app's version and platform, the update it's running, and a random installation identifier, and, if the app quit with an error the last time it ran, that error. It carries nothing from your account or courses.
- The Android app checks the TUNA mirror at Tsinghua (mirrors.tuna.tsinghua.edu.cn) for new versions and downloads updates from it when you ask. The Windows and Linux app checks the same mirror for new versions while it runs and downloads them in the background: the Windows app and the AppImage install them for you, and the .deb opens them in the system's installer when you choose to install from Settings.
- The changelog opens learnX's releases page on GitHub, and links in notices open the sites they point to. Those sites have their own privacy policies.
- If you install learnX from the App Store or Google Play, Apple or Google handle the download under their own policies.

Like any website, each of these servers sees your IP address when the app connects to it.

## Children

learnX is meant for Tsinghua University students and isn't directed at children under 13.

## Changes to this policy

When this policy changes, the new version is posted on this page with a new effective date. You can see every past version in the project's history on GitHub.

## Contact

If you have any questions about this policy or want to ask about data held by Firebase, [email me](mailto:learnX@ruiying.io).
