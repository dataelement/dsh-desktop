#!/bin/sh
# Debian postinst hook. dpkg runs it as root, and it does two things the Linux
# package cannot express on its own:
#
#  1. Restore the SUID root helper Chromium prefers. The packaged tree is built
#     by an unprivileged user, so `chrome-sandbox` arrives as mode 0755 owned by
#     that user; Chromium treats such a helper as broken and aborts with "The
#     SUID sandbox helper binary was found, but is not configured correctly".
#     This is what google-chrome-stable does in its own postinst.
#  2. Install the AppArmor profile that lets the app create the user namespace
#     Chromium's fallback sandbox needs. Ubuntu 23.10 and newer deny user
#     namespace creation to unconfined programs
#     (kernel.apparmor_restrict_unprivileged_userns=1), so an install whose SUID
#     helper is missing or unusable would otherwise abort with "No usable
#     sandbox!".
#
# Every failure path stays silent and exits 0: a package that cannot adjust the
# sandbox must still install.
set -u

# fpm runs this script from the generated postinst, whose arguments are dpkg's
# ("configure"), so only an absolute existing directory is trusted.
app_dir="${1:-}"
case "$app_dir" in
  /*) ;;
  *) app_dir="" ;;
esac
if [ -z "$app_dir" ] || [ ! -d "$app_dir" ]; then
  app_dir=""
  for candidate in "/opt/DSH Desktop" "/opt/dsh-desktop"; do
    if [ -d "$candidate" ]; then
      app_dir="$candidate"
      break
    fi
  done
fi
[ -n "$app_dir" ] || exit 0

executable="$app_dir/dsh-desktop"

if [ -f "$app_dir/chrome-sandbox" ]; then
  chown root:root "$app_dir/chrome-sandbox" 2>/dev/null || true
  chmod 4755 "$app_dir/chrome-sandbox" 2>/dev/null || true
fi

# Without AppArmor, or without the 4.0 ABI that knows the `userns` rule, there is
# nothing else to install — those systems do not restrict user namespaces either.
profile_name=dsh-desktop
profile_path="/etc/apparmor.d/$profile_name"
if [ ! -x "$executable" ] || [ ! -d /etc/apparmor.d ] || [ ! -f /etc/apparmor.d/abi/4.0 ]; then
  exit 0
fi

template="$app_dir/resources/dsh-desktop.apparmor"
if [ -f "$template" ]; then
  sed "s|@EXECUTABLE@|$executable|g" "$template" > "$profile_path" 2>/dev/null || exit 0
else
  cat > "$profile_path" 2>/dev/null <<EOF || exit 0
abi <abi/4.0>,
include <tunables/global>

profile $profile_name "$executable" flags=(unconfined) {
  userns,

  include if exists <local/$profile_name>
}
EOF
fi

chmod 0644 "$profile_path" 2>/dev/null || true

if command -v apparmor_parser >/dev/null 2>&1; then
  # -W writes the compiled cache; -r reloads a profile that is already loaded.
  apparmor_parser -r -W "$profile_path" >/dev/null 2>&1 || true
fi

exit 0
