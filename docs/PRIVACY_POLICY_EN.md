# learnX Privacy Policy

Effective: November 2026

learnX is a free, open-source app for Tsinghua University's Web Learning, made by Rui Ying ("I"). This policy explains what information the app handles, where it goes, and the choices you have. The app's source code is public at [github.com/robertying/learnX](https://github.com/robertying/learnX), so you can check everything described here.

## In short

- Your Tsinghua username, password and course content stay on your device and are only sent to Tsinghua's own servers, unless you turn on Course Information Sharing (below).
- I don't run a server for learnX and don't collect your account, courses, notices, assignments, files or grades.
- Crash reports and basic usage statistics go to Google Firebase. They don't include your login or course content.
- Course Information Sharing (courseX) is off until you turn it on. When on, it uploads public information about your courses this semester, never information about you.

## Your Tsinghua account

To sign in, learnX asks for your Tsinghua username and password. When you sign in through Tsinghua's single sign-on page, learnX also keeps the device identifier that page uses to recognize a trusted device.

- They are stored in your device's secure storage (Keychain on iOS, iPadOS and macOS; Keystore-protected storage on Android). They are not included in backups and don't move to other devices.
- They are only sent to Tsinghua's servers (id.tsinghua.edu.cn and learn.tsinghua.edu.cn) to sign you in, including when the app refreshes in the background.
- Signing out deletes them from the device, along with the sign-in cookies for Tsinghua's sites.

## Your course content

learnX downloads your courses, notices, files, assignments, grades and class schedule from Web Learning and keeps them on your device so you can read them offline. Files you download are saved on your device. Actions you take, such as submitting an assignment or adding a favorite, are sent to Web Learning, just as on its website.

Your settings, archived and hidden items, and submission drafts are also kept only on your device. Signing out or deleting the app removes them.

## Device features

Each of these runs on your device and sends nothing to me:

- **Notifications.** learnX checks Web Learning in the background and posts notifications on your device for new content, grades, deadline changes, deadline reminders and class reminders. There is no push server.
- **Calendar and Reminders.** Only when you turn on sync, learnX adds your class schedule and assignments to the calendar or reminders list you choose. It reads the list of your calendars to let you choose one, and doesn't read your other events.
- **Widgets, Spotlight and Siri.** learnX shares upcoming deadlines, classes and recent items with its widgets, and on Apple devices adds notices, assignments and files to the system's on-device search index. You can remove them by turning the feature off or signing out.
- **Camera, photos and files.** learnX only reads a photo or file you pick or share to it, to attach it to an assignment submission. It saves images to your photo library only when you ask.

The system asks your permission before learnX can use notifications, calendars, reminders, the camera or your photos, and you can change these in your device's settings at any time.

## Course Information Sharing (courseX)

This feature is off by default. When you turn it on, learnX uploads information about your courses this semester to courseX ([tsinghua.app](https://tsinghua.app)), where anyone can see it: the course ID, number and section, Chinese and English names, the teacher's name and staff number, and the class times and locations.

No information about you is uploaded: not your name, student number, grades or anything else from your account, and the upload carries no identifier of you or your device. Turning the feature off stops further uploads. Course information already shared stays on courseX, since it describes the course, not you.

## Crash reports and usage statistics

learnX uses Google Firebase to find and fix problems:

- **Firebase Crashlytics** receives a report when the app crashes or hits an unexpected error. A report has the error and where in the code it happened, the app version, the device model, operating system version, free memory and disk space, the screen that was open, how the last background refresh went (how long it took and how many items it got), and a random installation identifier. Web addresses in reports have their query parts removed, and replies from Web Learning are left out, so reports don't carry your course content.
- **Firebase Analytics** counts app installs, opens and sessions, along with the app version, device model, operating system and the approximate region derived from your IP address.

learnX doesn't collect your advertising identifier, doesn't show ads, and doesn't track you across other apps or websites. Crash reports aren't sent from the demo account. Google keeps this data under its own retention settings and the [Firebase privacy information](https://firebase.google.com/support/privacy).

## Other connections

- The Android app checks the TUNA mirror at Tsinghua (mirrors.tuna.tsinghua.edu.cn) for new versions and downloads updates from it when you ask.
- The changelog opens learnX's releases page on GitHub, and links in notices open the sites they point to. Those sites have their own privacy policies.
- If you install learnX from the App Store or Google Play, Apple or Google handle the download under their own policies.

Like any website, each of these servers sees your IP address when the app connects to it.

## Children

learnX is meant for Tsinghua University students and isn't directed at children under 13.

## Changes to this policy

When this policy changes, the new version is posted on this page with a new effective date. You can see every past version in the project's history on GitHub.

## Contact

If you have any questions about this policy or want to ask about data held by Firebase, [email me](mailto:learnX@ruiying.io).
