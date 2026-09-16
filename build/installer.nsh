!ifndef BUILD_UNINSTALLER
  !ifndef ONE_CLICK
    !include "LogicLib.nsh"
    !include "nsDialogs.nsh"

    Var DshDirectoryPage
    Var DshDirectoryEdit
    Var DshDirectoryNormalizationActive

    ; MUI invokes this after the assisted installer's directory page is ready.
    ; Normalize a selected drive root immediately so the page does not reject it
    ; before electron-builder's later install-time sanitization can run.
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW DshDirectoryPageShow

    Function DshDirectoryPageShow
      FindWindow $DshDirectoryPage "#32770" "" $HWNDPARENT
      GetDlgItem $DshDirectoryEdit $DshDirectoryPage 1019
      ${NSD_OnChange} $DshDirectoryEdit DshDirectoryChanged
      Call DshNormalizeDriveRoot
    FunctionEnd

    Function DshDirectoryChanged
      Pop $0
      Call DshNormalizeDriveRoot
    FunctionEnd

    Function DshNormalizeDriveRoot
      ${If} $DshDirectoryNormalizationActive == "1"
        Return
      ${EndIf}

      ${NSD_GetText} $DshDirectoryEdit $0
      StrLen $1 $0

      ; Accept both forms produced by typing or the Windows folder picker:
      ; "D:" and "D:\". Any non-root directory is left untouched.
      ${If} $1 == 2
        StrCpy $2 $0 1 1
        ${If} $2 != ":"
          Return
        ${EndIf}
        StrCpy $3 "$0\${APP_FILENAME}"
      ${ElseIf} $1 == 3
        StrCpy $2 $0 1 1
        ${If} $2 != ":"
          Return
        ${EndIf}
        StrCpy $2 $0 1 2
        ${If} $2 != "\"
          Return
        ${EndIf}
        StrCpy $3 "$0${APP_FILENAME}"
      ${Else}
        Return
      ${EndIf}

      StrCpy $DshDirectoryNormalizationActive "1"
      StrCpy $INSTDIR $3
      ${NSD_SetText} $DshDirectoryEdit $3
      StrCpy $DshDirectoryNormalizationActive "0"
    FunctionEnd

    ; Auto-create the installation directory tree before install begins.
    ; This allows users to type any path (e.g. D:\dsh-desktop) directly
    ; without needing to pre-create parent folders first.
    !define MUI_PAGE_CUSTOMFUNCTION_LEAVE DshEnsureInstDirExists

    Function DshEnsureInstDirExists
      CreateDirectory "$INSTDIR"
    FunctionEnd

    ; Accept any directory path the user types, even if it does not exist yet.
    ; Without this override NSIS rejects non-existent paths before the user
    ; can click Next.
    !macro preInit
    !macroend
    Function .onVerifyInstDir
      ; Always pass — we create the directory in DshEnsureInstDirExists.
    FunctionEnd

    ; Enable Win32 long paths (260+ char limit bypass) on Windows 10/11
    ; to avoid ENOENT errors on deeply nested workspace or plugin paths.
    ;
    ; Add Windows Defender exclusions for the install and data directories.
    ; Without this, Defender scans every one of the ~44,000 JS/Node files on
    ; first launch, which can take 60–120 s on some machines before the Harness
    ; becomes ready. Adding the paths here means new files extracted during
    ; install are already covered before the user ever double-clicks the app.
    ;
    ; PowerShell is always present on Windows 10/11. -ErrorAction SilentlyContinue
    ; means a non-elevated install (where the Defender API requires admin) fails
    ; silently rather than aborting — the app still runs, just with the first-
    ; launch scan. Re-running the installer as admin adds the exclusions.
    !macro customInstall
      WriteRegDWORD HKLM "SYSTEM\CurrentControlSet\Control\FileSystem" "LongPathsEnabled" 1
      ; Direct attempt (succeeds if installer was executed as Administrator)
      nsExec::ExecToLog 'powershell.exe -NonInteractive -NoProfile -ExecutionPolicy Bypass -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue; Add-MpPreference -ExclusionPath \"$APPDATA\dsh-desktop\" -ErrorAction SilentlyContinue"'
      ; When running non-elevated (default user install), invoke elevated PowerShell via runas to apply Defender exclusions and enable LongPaths in HKLM.
      ; If UAC is accepted, Defender exclusion takes effect and avoids scanning 20,000+ files on first launch.
      ${IfNot} ${Silent}
        ExecShell "runas" 'powershell.exe' '-NonInteractive -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue; Add-MpPreference -ExclusionPath \"$APPDATA\dsh-desktop\" -ErrorAction SilentlyContinue; Set-ItemProperty -Path \"HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem\" -Name \"LongPathsEnabled\" -Value 1 -ErrorAction SilentlyContinue"'
      ${EndIf}
      ; CHECK_APP_RUNNING force-kills the previous process, so will-quit never
      ; clears the session marker. Same-version overwrite would otherwise look
      ; like an unclean-exit. Delete is a no-op when the file is absent.
      Delete "$APPDATA\dsh-desktop\desktop-service\session.json"
    !macroend
  !endif
!endif

