#!/bin/sh
# Debian postrm hook: drop the AppArmor profile installed for the packaged app.
# Unloading is best effort — a system without AppArmor never had the profile.
set -u

profile_name=dsh-desktop
profile_path="/etc/apparmor.d/$profile_name"

if [ -f "$profile_path" ]; then
  if command -v apparmor_parser >/dev/null 2>&1; then
    apparmor_parser -R "$profile_path" >/dev/null 2>&1 || true
  fi
  rm -f "$profile_path"
fi

exit 0
