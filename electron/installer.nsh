; Part of the NSIS installer and uninstaller (packageConfig.cjs, `nsis.include`).

; Always for the current user, never in Program Files: updates then install
; without elevation (on quit too), as Start at login writes the current
; user's registry.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

; Uninstalling, not updating: what learnX keeps outside its install folder
; goes too. Start at login's Run entry (named after the app id, Electron's
; default) and the switch Task Manager keeps for it, learnX's data (the saved
; login, settings, cached data, downloads and the browser profile with its
; cookies; main.cjs keeps them in %LOCALAPPDATA%\learnX) and the updates
; electron-updater downloaded. `deleteAppDataOnUninstall` removes what
; Electron may still write in %APPDATA%\learnX.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "io.robertying.learnXElectron"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "io.robertying.learnXElectron"
    RMDir /r "$LOCALAPPDATA\learnX"
    RMDir /r "$LOCALAPPDATA\learnx-electron-updater"
  ${endIf}
!macroend
