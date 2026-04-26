#!/usr/bin/env sh
# Wrapper that resolves LD_LIBRARY_PATH on NixOS (Replit) so Playwright's
# bundled Chromium can find libgbm and libudev, which live in the Nix store
# rather than standard /usr/lib paths.
#
# On standard Linux/macOS/CI these libraries are already in the system path
# and this script is effectively a no-op beyond calling playwright test.

find_nix_lib() {
  # Usage: find_nix_lib <store-name-prefix> <libname>
  # Returns the directory containing <libname> in the first matching Nix store
  # package whose name contains <store-name-prefix>.
  prefix="$1"
  libname="$2"
  match=$(ls /nix/store 2>/dev/null | grep "$prefix" | head -1)
  if [ -n "$match" ]; then
    dir="/nix/store/$match/lib"
    if [ -f "$dir/$libname" ]; then
      printf "%s" "$dir"
    fi
  fi
}

MESA_LIB=$(find_nix_lib "mesa-libgbm" "libgbm.so.1")
UDEV_LIB=$(find_nix_lib "systemd-2" "libudev.so.1")

if [ -n "$MESA_LIB" ] || [ -n "$UDEV_LIB" ]; then
  EXTRA="${MESA_LIB}${MESA_LIB:+:}${UDEV_LIB}"
  export LD_LIBRARY_PATH="${EXTRA}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

exec pnpm exec playwright test "$@"
