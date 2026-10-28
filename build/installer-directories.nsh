; Adapted from deepseek-ai/deepseek-harness/apps/desktop/scripts/installer-directories.nsh.
!include "LogicLib.nsh"
!include "${__FILEDIR__}\installer-errors.nsh"

Var dshFinalDirectory
Var dshNewDirectory
Var dshOldDirectory
Var dshOldMoved
Var dshNewMoved

!macro dshExtractPayload FILE
  !define DSH_EXTRACT_RETRY_LABEL dsh_extract_retry_${__LINE__}
  ${DSH_EXTRACT_RETRY_LABEL}:
  nsExec::ExecToStack '"$PLUGINSDIR\dsh-7za.exe" x -y -bd -bb0 "-o$INSTDIR" "${FILE}"'
  Pop $R0
  Pop $R1
  ${If} $R0 != 0
    !insertmacro dshRetryInstallError "Could not extract application files (7za exit code: $R0).$\r$\n$\r$\nDestination: $INSTDIR$\r$\n$R1$\r$\n$\r$\nCheck free disk space and write permissions, then choose Retry. Cancel stops installation." "应用文件解压失败（7za 退出码：$R0）。$\r$\n$\r$\n目标目录：$INSTDIR$\r$\n$R1$\r$\n$\r$\n请检查磁盘空间和目录写入权限，然后点击“重试”；“取消”将中止安装。" ${DSH_EXTRACT_RETRY_LABEL}
    Call dshRollbackDirectories
    SetErrorLevel 2
    Quit
  ${EndIf}
  !undef DSH_EXTRACT_RETRY_LABEL
!macroend

!macro dshStageApplication
  StrCpy $dshFinalDirectory $INSTDIR
  System::Call 'ole32::CoCreateGuid(g .r0) i .r1'
  ${If} $1 != 0
    !insertmacro dshInstallErrorText "Could not initialize installation (GUID error: $1). Please run the installer again." "无法初始化安装（GUID 错误码：$1），请重新运行安装程序。"
    MessageBox MB_OK|MB_ICONSTOP "$dshInstallError" /SD IDOK
    SetErrorLevel 2
    Quit
  ${EndIf}
  StrCpy $dshNewDirectory "$INSTDIR.new-$0"
  StrCpy $dshOldDirectory "$INSTDIR.old-$0"
  StrCpy $dshOldMoved ""
  StrCpy $dshNewMoved ""
  dsh_stage_mkdir_retry:
  ClearErrors
  CreateDirectory $dshNewDirectory
  ${If} ${Errors}
    !insertmacro dshRetryInstallError "Could not create the staging directory:$\r$\n$dshNewDirectory$\r$\n$\r$\nCheck free disk space and write permissions, then choose Retry. Cancel stops installation." "无法创建安装暂存目录：$\r$\n$dshNewDirectory$\r$\n$\r$\n请检查磁盘空间和目录写入权限，然后点击“重试”；“取消”将中止安装。" dsh_stage_mkdir_retry
    Call dshRollbackDirectories
    SetErrorLevel 2
    Quit
  ${EndIf}
  File /oname=$PLUGINSDIR\dsh-7za.exe "${DSH_SEVENZIP_PATH}"
  StrCpy $INSTDIR $dshNewDirectory
  SetOutPath $INSTDIR
  !insertmacro installApplicationFiles
  File /oname=7zip-installer-LICENSE.txt "${DSH_SEVENZIP_LICENSE_DIR}\LICENSE.txt"
  File /oname=7zip-installer-COPYING.txt "${DSH_SEVENZIP_LICENSE_DIR}\COPYING"
  !ifdef UNINSTALLER_ICON
    File /oname=uninstallerIcon.ico "${UNINSTALLER_ICON}"
  !endif
  StrCpy $INSTDIR $dshFinalDirectory
  SetOutPath $PLUGINSDIR
!macroend

Function .onGUIEnd
  Call dshCleanupDirectories
FunctionEnd

Function dshCleanupDirectories
  ${If} $dshFinalDirectory != ""
    Call dshRollbackDirectories
  ${EndIf}
FunctionEnd

; Rollback touches only this installer's unique staging and backup paths.
Function dshRollbackDirectories
  SetOutPath $PLUGINSDIR
  ${If} $dshNewMoved == "1"
    RMDir /r "\\?\$dshFinalDirectory"
    StrCpy $dshNewMoved ""
  ${EndIf}
  ${If} $dshOldMoved == "1"
    ClearErrors
    Rename $dshOldDirectory $dshFinalDirectory
    ${If} ${Errors}
      DetailPrint "Old application retained at $dshOldDirectory"
      Return
    ${EndIf}
    StrCpy $dshOldMoved ""
  ${EndIf}
  ${If} $dshNewDirectory != ""
    RMDir /r "\\?\$dshNewDirectory"
  ${EndIf}
  StrCpy $INSTDIR $dshFinalDirectory
FunctionEnd

Function dshPromoteDirectories
  ; SetOutPath keeps a directory handle open. Release it before either rename.
  SetOutPath $PLUGINSDIR
  ClearErrors
  ${If} ${FileExists} "$dshFinalDirectory\*.*"
    dsh_backup_retry:
    ClearErrors
    Rename $dshFinalDirectory $dshOldDirectory
    ${If} ${Errors}
      System::Call 'kernel32::GetLastError() i .R2'
      !insertmacro dshRetryInstallError "Could not back up the installed version (Windows error: $R2).$\r$\n$\r$\nSource: $dshFinalDirectory$\r$\nBackup: $dshOldDirectory$\r$\n$\r$\nClose the application and programs using this directory, then choose Retry. Cancel stops installation." "无法备份旧版本目录（Windows 错误码：$R2）。$\r$\n$\r$\n源目录：$dshFinalDirectory$\r$\n备份目录：$dshOldDirectory$\r$\n$\r$\n请关闭应用及占用该目录的程序，然后点击“重试”；“取消”将中止安装。" dsh_backup_retry
      Call dshRollbackDirectories
      SetErrors
      Return
    ${EndIf}
    StrCpy $dshOldMoved "1"
  ${Else}
    RMDir $dshFinalDirectory
  ${EndIf}
  dsh_promote_retry:
  ClearErrors
  Rename $dshNewDirectory $dshFinalDirectory
  ${If} ${Errors}
    System::Call 'kernel32::GetLastError() i .R2'
    !insertmacro dshRetryInstallError "Could not move the new version into place (Windows error: $R2).$\r$\n$\r$\nSource: $dshNewDirectory$\r$\nDestination: $dshFinalDirectory$\r$\n$\r$\nClose programs using these directories and check write permissions, then choose Retry. Cancel stops installation; any previous version is restored if possible." "无法将新版本移到正式安装目录（Windows 错误码：$R2）。$\r$\n$\r$\n源目录：$dshNewDirectory$\r$\n正式目录：$dshFinalDirectory$\r$\n$\r$\n请关闭占用目录的程序并检查写入权限，然后点击“重试”；“取消”将中止安装，并尝试恢复旧版本。" dsh_promote_retry
    Call dshRollbackDirectories
    SetErrors
    Return
  ${EndIf}
  StrCpy $dshNewMoved "1"
  SetOutPath $dshFinalDirectory
  ClearErrors
FunctionEnd

!macro dshFinishDirectories
  StrCpy $dshNewMoved ""
  ${If} $dshOldMoved == "1"
    RMDir /r "\\?\$dshOldDirectory"
    StrCpy $dshOldMoved ""
  ${EndIf}
!macroend
