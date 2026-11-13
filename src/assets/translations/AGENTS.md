# src/assets/translations

Every user-visible string is a key in `en.ts` and `zh.ts`, with the same keys in both. Native strings that JS doesn't draw are in the String Catalogs: `ios/learnX/Localizable.xcstrings` (App Intent dialogs, menu bar commands), `ios/learnX/AppShortcuts.xcstrings` (Siri phrases; the Chinese ones are a `stringSet`, easy to miss), `ios/learnX/InfoPlist.xcstrings` (permission prompts), `ios/ExpoWidgetsTarget/Localizable.xcstrings` (widget names), and Android's `res/values*/` resources.

## English

- Title Case for titles, rows, buttons and menu items; sentence case for messages, captions, footers and toasts.
- A row, menu item or sheet choice that needs another step before it acts (a confirmation, picker, share sheet or menu of choices) ends with an ellipsis, "…" in both languages ("Log Out…", "删除…"); one that acts at once or opens a screen doesn't, and neither do toolbar buttons or a screen's main button (Submit, Log In). Alert titles and buttons never do, so a label used both ways has an `…Ellipsis` key for the row (`logout` / `logoutEllipsis`).
- Errors start with "Couldn't …". Success toasts are short ("Deleted").
- Use the platform's own words: Log In / Log Out, OK, Full Screen, Show in Finder (Mac), Photo Library, Choose File, and "System Settings" for the OS settings app. Android never mentions Reminders.
- Archive's opposite is Unarchive (key `restore`). A grader's comment is "Grader Comments".
- Confirmation alerts name the action on their button (Log Out, Delete, Submit, Join, Continue), never "OK"; destructive actions use the destructive style.
- Permission prompts start with what the access is for ("Choose files to attach to an assignment submission.").
- Debug-only screens (Network Emulation, Allow Server Writes) stay in English and aren't translated.

## Chinese

- Use the Web Learning site's terms for its content: 公告 for notices (the system's notifications stay 通知), 已批改 for the graded status, 评语 for a grader's comment, 批阅 only in grader and graded-time lines. Say 截止时间 or 作业截止, not 截止日期. The app says 未读 where the site says 未浏览.
- Use the system's terms for system things: 筛选, 文稿, 访达, 照片图库, 系统设置.
- Address the user as 你, never 您, and call the app "learnX", not "App".
- Full-width punctuation (，。：) in Chinese text. A message ends with 。 when its English ends with a period.
- Put a space between Chinese and Latin letters or numbers (`{count} 条未读公告`).
- Times of day follow the device's 12/24-hour setting. A date format (a key ending in `Format`) writes `{time}` where the time goes, and `t()` fills it with `timeFormat()` from `helpers/i18n`; code formatting a time alone uses `timeFormat()`, never `HH:mm`.
