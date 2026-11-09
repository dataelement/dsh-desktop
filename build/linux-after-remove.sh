#!/bin/sh
# Debian postrm hook: drop the executable link and the AppArmor profile
# installed for the packaged app. This script replaces electron-builder's
# default postrm, which is why the alternative is unregistered here.
set -u

if command -v update-alternatives >/dev/null 2>&1; then
  update-alternatives --remove-all dsh-desktop >/dev/null 2>&1 || true
else
  rm -f /usr/bin/dsh-desktop
fi

profile_name=dsh-desktop
profile_path="/etc/apparmor.d/$profile_name"

if [ -f "$profile_path" ]; then
  if command -v apparmor_parser >/dev/null 2>&1; then
    apparmor_parser -R "$profile_path" >/dev/null 2>&1 || true
  fi
  rm -f "$profile_path"
fi

exit 0
