<div align="center">

<img src="./docs/assets/logo.webp?v=2" alt="logo" width="128" height="128" />

<h1>learnX</h1>

清华大学网络学堂 App，以 React Native 构建。

App for Tsinghua University Web Learning, developed with React Native. ⚛️

**中文** · [English](#english)

<a href="https://github.com/robertying/learnX/releases" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/github/v/release/robertying/learnX?color=brightgreen" alt="GitHub release (latest SemVer)" height="20" width="auto"></a>
<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=iphone" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-ios-blue" alt="Platform iOS" height="20" width="auto"></a>
<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=ipad" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-ipados-blue" alt="Platform iPadOS" height="20" width="auto"></a>
<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=mac" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-macos-blue" alt="Platform macOS" height="20" width="auto"></a>
<a href="https://play.google.com/store/apps/details?id=io.robertying.learnx" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-android-red" alt="Platform Android" height="20" width="auto"></a>
<a href="https://github.com/robertying/learnX/releases" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-windows-0078d4" alt="Platform Windows" height="20" width="auto"></a>
<a href="https://github.com/robertying/learnX/releases" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-linux-orange" alt="Platform Linux" height="20" width="auto"></a>

<div align="center">
    <img src="./docs/screenshots/iphone.webp?v=1" alt="iphone screenshot" height="350" width="161" />
    <img src="./docs/screenshots/mac.webp?v=1" alt="mac screenshot" height="350" width="518" />
</div>

</div>

## 下载

支持 iOS / iPadOS 17.6、macOS 14.6、Android 10、Windows 10 及更高版本，以及 x64 / ARM64 的 Linux。

### iOS / iPadOS / macOS

<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=iphone" target="_blank" rel="noopener noreferrer">
    <img align="center" height=40 alt="App Store 下载" src="docs/assets/Download_on_the_App_Store_Badge_CNSC_RGB_blk_092917.svg" />
</a>
<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=mac" target="_blank" rel="noopener noreferrer">
    <img align="center" height=40 alt="Mac App Store 下载" src="docs/assets/Download_on_the_Mac_App_Store_Badge_CNSC_RGB_blk_092917.svg" />
</a>

### Android

- <a href="https://play.google.com/store/apps/details?id=io.robertying.learnx" target="_blank" rel="noopener noreferrer">
      <img align="center" height=52 alt="下载应用，请到 Google Play" src="docs/assets/google-play-badge.png" />
  </a>

- **[TUNA 镜像（推荐）](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/)**
  - 一般下载 `learnX-arm64-v8a-vX.X.X.apk`
  - 无法安装时，改用 `learnX-universal-vX.X.X.apk`

- [GitHub Releases](https://github.com/robertying/learnX/releases)

从 TUNA 镜像或 GitHub 安装的版本会在 App 内提示更新，并可直接下载安装。

### Windows / Linux

从 [TUNA 镜像（推荐）](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/)或 [GitHub Releases](https://github.com/robertying/learnX/releases) 下载，App 会自动更新。

- Windows（x64、ARM64）：下载 .exe 安装程序。安装程序没有签名，如果 Windows 提示“Windows 已保护你的电脑”，请点按“更多信息”，再点按“仍要运行”。
- Linux（x64、ARM64）：
  - Ubuntu 和 Debian：按设备架构下载 .deb 包（x64 设备选文件名带 `amd64` 的，ARM64 设备选带 `arm64` 的），然后用 `sudo apt install ./文件名.deb` 安装。不建议在 Ubuntu 上用 AppImage：Ubuntu 24.04 起，AppImage 无法启用 Chromium 沙盒。
  - 其他发行版：下载 AppImage，先用 `chmod +x` 加上执行权限，再直接运行。

## 功能

> 注意：本应用仅供清华大学学生使用。

课程公告、作业和文件，在 learnX 里一手掌握。有新内容发布、作业快截止时，learnX 会及时提醒你。

### 今天

- 打开就能看到今天的课程、快截止的作业和各门课的新内容

### 课程内容

- 随时查看老师发布的公告和附件
- 课程文件随时预览、下载，也能分享到其他应用
- 查看作业要求、截止时间、提交和批改情况；可直接提交作业，附件也能从其他应用分享过来
- 加载过的内容，没有网络也能看

### 通知与提醒

- 有新公告、新文件、新作业或出了成绩，第一时间通知你
- 作业截止前、上课前提醒你
- 课表和作业可同步到日历，在 iPhone、iPad 和 Mac 上作业也可同步到提醒事项

### 更多功能

- 小组件：作业截止、下一节课（iPhone、iPad 和 Android）
- 用聚焦搜索查找公告、作业和文件，或直接问 Siri 下一节课是什么（iPhone、iPad 和 Mac）
- 收藏、归档公告、作业和文件，收藏与网络学堂同步
- 屏蔽不需要的课程

## 隐私

你的账号和课程内容保存在你的设备上，除了清华大学的服务器，不会发到其他地方。唯一的例外是课程信息共享：开启后，learnX 会把本学期课程的公开信息上传到 courseX，但不会上传任何关于你本人的信息。详见[隐私政策](docs/PRIVACY_POLICY_CN.md)。

## 开发

开发环境的配置方法见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开源协议

以 MIT 许可证开源，但**不包含**下列情况：

- 您过去或者目前为清华大学信息化技术中心工作；
- 您的项目受到任何与清华大学有关的机构的经济资助。

如果上述任意条件成立，任何未经授权的对本项目中代码的使用将会被认为是侵权。上文中的“使用”包括对项目的源代码或衍生品制作拷贝、修改、重新分发，无论是否用作商业用途。

本项目中使用的开源项目则应用其自带的许可证。

---

## English

[中文](#下载) · **English**

> Note: learnX is for Tsinghua University students only.

### Download

Requires iOS / iPadOS 17.6, macOS 14.6, Android 10 or Windows 10 and later, or Linux on x64 / ARM64.

- **iPhone, iPad and Mac:** [App Store](https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115)
- **Android:** [Google Play](https://play.google.com/store/apps/details?id=io.robertying.learnx), the [TUNA Mirror (recommended)](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/) or [GitHub Releases](https://github.com/robertying/learnX/releases). From the mirror or GitHub, download `learnX-arm64-v8a-vX.X.X.apk`, or `learnX-universal-vX.X.X.apk` if it doesn't install; these versions update from inside the app.
- **Windows and Linux:** the [TUNA Mirror (recommended)](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/) or [GitHub Releases](https://github.com/robertying/learnX/releases). The app updates itself.
  - Windows (x64, ARM64): download the .exe installer. It's unsigned, so if Windows says "Windows protected your PC", choose "More info", then "Run anyway".
  - Ubuntu and Debian (x64, ARM64): download the .deb for your device (`amd64` in the file name for x64, `arm64` for ARM64) and install it with `sudo apt install ./<file>.deb`. Don't use the AppImage on Ubuntu: since Ubuntu 24.04, it can't turn on Chromium's sandbox.
  - Other Linux distributions (x64, ARM64): download the AppImage, make it executable with `chmod +x`, and run it.

### Features

learnX brings your Web Learning notices, assignments and files together, and tells you when something new is posted or a deadline is near.

- **Today:** the day's classes, upcoming deadlines and new items in every course
- **Course content:** notices with their attachments, file previews and downloads, assignment details, grading and submission, and offline reading
- **Notifications and reminders:** new notices, files, assignments and grades, deadline and class reminders, and calendar sync (plus Reminders on iPhone, iPad and Mac)
- **More:** widgets (iPhone, iPad and Android), Spotlight and Siri (iPhone, iPad and Mac), favorites synced with Web Learning, archiving, and hiding courses

### Privacy

Your account and course content stay on your device and are sent nowhere except Tsinghua's servers. The one exception is Course Information Sharing: when you turn it on, learnX uploads public information about your courses this semester to courseX, and nothing about you. See the [privacy policy](docs/PRIVACY_POLICY_EN.md).

### Development

See [CONTRIBUTING.md](CONTRIBUTING.md) to set up a development environment.

### License

MIT licensed, except for anyone who:

- works or has worked for the Computer and Information Management Center of Tsinghua University (清华大学信息化技术中心); or
- has a project funded by any institution affiliated with Tsinghua University.

For them, any use of code from this project without the author's explicit permission is copyright infringement. "Use" includes copying, modifying or redistributing the source code or any derivative of this project, for commercial or non-commercial purposes.

Open-source code used in this project remains under its own licenses.

## ICP 备案 ICP Filing

[浙ICP备20024838号-2A](https://beian.miit.gov.cn/)
