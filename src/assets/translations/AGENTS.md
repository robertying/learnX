# src/assets/translations

Every user-visible string is a key in `en.ts` and `zh.ts`, with the same keys in both. Native strings that JS doesn't draw (App Intents, menu bar commands, Siri phrases, permission prompts, widget names) are in the String Catalogs (`git ls-files '*.xcstrings'`; Siri phrases' Chinese is a `stringSet`, easy to miss) and Android's `res/values*/` resources. Each Chinese native string goes in both `zh-Hans` and `zh-Hant` (Android: `values-zh` and `values-b+zh+Hant`) with the same Simplified text, since Traditional Chinese locales don't fall back to Simplified and the JS side shows Simplified there too.

## English

- Title Case for titles, rows, buttons and menu items; sentence case for messages, captions, footers and toasts. That is how Apple platforms show them. Android (Material 3) and the Electron app (Windows' Fluent) write titles in sentence case too, and `t()` turns a Title Case string into it there (`helpers/sentenceCase`): write each string once, in Title Case, and add a name that keeps its capitals to `PROPER_NAMES` there.
- Lists of three or more take a serial comma ("Notices, assignments, and files"), as Apple's, Google's and Microsoft's style guides do.
- A string shown on its own starts with a capital letter, also after a " · " ("Fri, Nov 20 · Due in 3 hours"), so no code capitalizes a translated string. Only a piece filled into another string (`graduateSchedule`) starts lowercase.
- Only a button, row or menu item that asks to confirm a destructive action ends with an ellipsis, "…" in both languages ("Log Out…", "Delete…", "Discard Draft…"). Nothing else does: not other confirmations (Submit), pickers, share sheets or menus. Alert titles and buttons never do, so a label used both ways has an `…Ellipsis` key for the one that asks (`logout` / `logoutEllipsis`). The Mac menu bar's Settings… is the exception: a macOS command that opens a window ends with one.
- Errors start with "Couldn't …". Success toasts are short ("Deleted").
- Use the platform's own words: Log In / Log Out, OK, Full Screen, Show in Finder (Mac), Photo Library, Choose File, and "System Settings" for the OS settings app. Android never mentions Reminders.
- Archive's opposite is Unarchive (key `restore`). A grader's comment is "Grader Comments".
- Confirmation alerts name the action on their button (Log Out, Delete, Submit, Join, Continue), never "OK"; destructive actions use the destructive style.
- Permission prompts start with what the access is for ("Choose files to attach to an assignment submission.").
- Debug-only screens (Network Emulation, Allow Server Writes) stay in English and aren't translated.

## Chinese

- Write the Chinese first, as a Chinese speaker would say it, then the English; never translate a Chinese string word for word from the English.
- Use the Web Learning site's terms for its content: 公告 for notices (the system's notifications stay 通知), 已批改 for the graded status, 评语 for a grader's comment, 批阅 only in grader and graded-time lines. Say 截止时间 or 作业截止, not 截止日期. The app says 未读 where the site says 未浏览.
- Use the system's terms for system things: 筛选, 文稿, 访达, 照片图库, 系统设置.
- Address the user as 你, never 您, and call the app "learnX", not "App".
- An error says what failed with 失败 (登录失败, 作业同步失败：…), the pair of 成功 on success; 无法 is only for what learnX can't do (`如果learnX无法发送通知…`).
- Full-width punctuation (，。：) in Chinese text. A message ends with 。 when its English ends with a period.
- Never type a space between Chinese and Latin letters, digits or a `{placeholder}` (`今天{count}节课`, `允许learnX访问日历`, `北京时间{time}上课`). iOS and macOS draw a narrow gap there themselves, so a typed space shows too wide; the Electron app has Chromium draw it; Android draws none, so `t()` and the date helpers add the same gap there (`helpers/cjk`), and `web/systemText` does so for the text Windows and Linux show outside the Electron page (tray menu, notifications). Text that is never shown in the app is the exception: Markdown docs (the README, `docs/`, other `AGENTS.md` files), GitHub Releases notes and the store listings are read on GitHub, in the stores or as source, where no gap is drawn, so they type the space. Filled-in values (names, titles, file names) are left as they are, with a gap only where they meet the string's own text; quote a free-text value that sits against Chinese (`已保存“{name}”`). Tests check `zh.ts` and the String Catalogs.
- Write a date, time or duration the way iOS and Android do: `YYYY年M月D日`, `上午9:50`, `3小时前`, `第3周`. A date format keeps a space between the date, its weekday and its time (`YYYY年M月D日 dddd {time}`), and none between them and the words around it (`[补交截止]YYYY…`, `{time}[提交]`).
- Dates and times become text only through the formatters in `helpers/i18n` (a date format is a key ending in `Format`, which `t()` doesn't take). They follow the device's 12/24-hour setting and the app's language, and add the Android gap. Never call dayjs's `format`, `to` or `from` for text yourself.
