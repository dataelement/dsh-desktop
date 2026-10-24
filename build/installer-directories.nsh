; Adapted from deepseek-ai/deepseek-harness/apps/desktop/scripts/installer-directories.nsh.
!include "LogicLib.nsh"

Var dshFinalDirectory
Var dshNewDirectory
Var dshOldDirectory
Var dshOldMoved
Var dshNewMoved

!macro dshExtractPayload FILE
  nsExec::ExecToStack '"$PLUGINSDIR\dsh-7za.exe" x -y -bd -bb0 "-o$INSTDIR" "${FILE}"'
  Pop $R0
  Pop $R1
  ${If} $R0 != 0
    DetailPrint $R1
    Call dshRollbackDirectories
    SetErrorLevel 2
    Quit
  ${EndIf}
!macroend

!macro dshStageApplication
  StrCpy $dshFinalDirectory $INSTDIR
  System::Call 'ole32::CoCreateGuid(g .r0) i .r1'
  ${If} $1 != 0
    SetErrorLevel 2
    Quit
  ${EndIf}
  StrCpy $dshNewDirectory "$INSTDIR.new-$0"
  StrCpy $dshOldDirectory "$INSTDIR.old-$0"
  StrCpy $dshOldMoved ""
  StrCpy $dshNewMoved ""
  ClearErrors
  CreateDirectory $dshNewDirectory
  ${If} ${Errors}
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
    Rename $dshFinalDirectory $dshOldDirectory
    ${If} ${Errors}
      Call dshRollbackDirectories
      SetErrors
      Return
    ${EndIf}
    StrCpy $dshOldMoved "1"
  ${Else}
    RMDir $dshFinalDirectory
  ${EndIf}
  ClearErrors
  Rename $dshNewDirectory $dshFinalDirectory
  ${If} ${Errors}
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
