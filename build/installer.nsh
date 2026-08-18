!ifndef BUILD_UNINSTALLER
  !ifndef ONE_CLICK
    !include "LogicLib.nsh"
    !include "nsDialogs.nsh"

    Var DshDirectoryPage
    Var DshDirectoryEdit
    Var DshDirectorySearchAfter
    Var DshDirectoryAttached
    Var DshDirectoryNormalizationActive

    ; electron-builder declares its install-mode page before the directory page.
    ; MUI consumes this callback on that first page, so use it to start a short
    ; polling timer and attach to the directory edit control once that page exists.
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW DshDirectoryPageShow

    Function DshDirectoryPageShow
      ${NSD_CreateTimer} DshAttachDirectoryPage 50
    FunctionEnd

    Function DshAttachDirectoryPage
      ${If} $DshDirectoryAttached == "1"
        System::Call 'USER32::IsWindowVisible(p $DshDirectoryPage)i.r0'
        ${If} $0 == 0
          ; The user can navigate back to the install-mode page and then return.
          ; Keep the timer alive so the directory page can be attached again.
          StrCpy $DshDirectoryAttached "0"
          StrCpy $DshDirectoryPage 0
          StrCpy $DshDirectoryEdit 0
        ${Else}
          ; Keep polling while the directory page is visible. This also catches a
          ; manually entered parent path as soon as the edit control loses focus.
          Call DshNormalizeSelectedDirectory
          Return
        ${EndIf}
      ${EndIf}

      StrCpy $DshDirectorySearchAfter 0

      DshFindDirectoryPage:
      FindWindow $DshDirectoryPage "#32770" "" $HWNDPARENT $DshDirectorySearchAfter

      ${If} $DshDirectoryPage == 0
        Return
      ${EndIf}

      GetDlgItem $DshDirectoryEdit $DshDirectoryPage 1019

      ${If} $DshDirectoryEdit == 0
        ; MUI keeps earlier custom pages as hidden child dialogs. Continue until
        ; the child containing the actual directory edit control is found.
        StrCpy $DshDirectorySearchAfter $DshDirectoryPage
        Goto DshFindDirectoryPage
      ${EndIf}

      System::Call 'USER32::IsWindowVisible(p $DshDirectoryPage)i.r0'
      ${If} $0 == 0
        StrCpy $DshDirectorySearchAfter $DshDirectoryPage
        Goto DshFindDirectoryPage
      ${EndIf}

      ${NSD_OnChange} $DshDirectoryEdit DshDirectoryChanged
      StrCpy $DshDirectoryAttached "1"
      Call DshNormalizeSelectedDirectory
    FunctionEnd

    Function DshDirectoryChanged
      Pop $0
      Call DshNormalizeSelectedDirectory
    FunctionEnd

    Function DshNormalizeSelectedDirectory
      ${If} $DshDirectoryNormalizationActive == "1"
        Return
      ${EndIf}

      ; A Browse selection updates the edit while focus remains on the Browse
      ; button. Do not rewrite the path character-by-character when the user is
      ; typing directly into the edit control.
      System::Call 'USER32::GetFocus()p.r4'
      ${If} $4 == $DshDirectoryEdit
        Return
      ${EndIf}

      ${NSD_GetText} $DshDirectoryEdit $0

      ${If} $0 == ""
        Return
      ${EndIf}

      ; Keep the default path and an already-normalized custom path unchanged.
      StrLen $1 "${APP_FILENAME}"
      StrLen $2 $0
      ${If} $2 >= $1
        IntOp $4 $2 - $1
        StrCpy $3 $0 $1 $4
        ${If} $3 == "${APP_FILENAME}"
          Return
        ${EndIf}
      ${EndIf}

      ; The directory picker returns the selected parent directory. Make the
      ; application subdirectory visible immediately for every custom location.
      StrCpy $1 $0 1 -1
      ${If} $1 == "\"
        StrCpy $3 "$0${APP_FILENAME}"
      ${Else}
        StrCpy $3 "$0\${APP_FILENAME}"
      ${EndIf}

      StrCpy $DshDirectoryNormalizationActive "1"
      StrCpy $INSTDIR $3
      ${NSD_SetText} $DshDirectoryEdit $3
      StrCpy $DshDirectoryNormalizationActive "0"
    FunctionEnd
  !endif
!endif
