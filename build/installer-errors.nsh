!ifndef DSH_INSTALLER_ERRORS_INCLUDED
!define DSH_INSTALLER_ERRORS_INCLUDED
!include "LogicLib.nsh"

Var dshInstallError

; The installer language is available before any payload staging starts.
; Other installer languages use English until translations are provided.
!macro dshInstallErrorText EN ZH
  StrCpy $dshInstallError "${EN}"
  ${If} $LANGUAGE == 2052
    StrCpy $dshInstallError "${ZH}"
  ${EndIf}
  DetailPrint $dshInstallError
!macroend

; /SD prevents silent updater installs from waiting for invisible user input.
!macro dshRetryInstallError EN ZH RETRY_LABEL
  !insertmacro dshInstallErrorText "${EN}" "${ZH}"
  MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$dshInstallError" /SD IDCANCEL IDRETRY ${RETRY_LABEL}
!macroend

!endif
