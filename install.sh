#!/bin/sh
# Angle Filmkit installer for macOS and Linux (D-008).
#
#   curl -fsSL https://raw.githubusercontent.com/AngleOS/filmkit/master/install.sh | sh
#   curl -fsSL …/install.sh | sh -s -- --yes --agents auto --brand-url https://example.com
#
# It checks Node ≥ 20 and ffmpeg, installs what's missing with the system's package manager (it asks first, unless
# --yes), then runs `filmkit setup` with the same arguments. Setup registers Filmkit's MCP server with your agent tools,
# makes a studio, sets up your brand and makes a first film.
#
# FILMKIT_PKG picks what npx runs: `filmkit` once it's on npm. While the repo is private, it's `github:AngleOS/filmkit`,
# which needs your git credentials for GitHub. In that case, run this script from a clone, because raw.githubusercontent.com
# can't serve a private file to curl.
set -eu

FILMKIT_PKG=${FILMKIT_PKG:-github:AngleOS/filmkit}
NODE_MAJOR_MIN=20
YES=0
for a in "$@"; do [ "$a" = "--yes" ] || [ "$a" = "-y" ] && YES=1; done

# Pear on Night, when the terminal can show colour and nobody asked for none.
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${FORCE_COLOR:-}" != 0 ]; then
  P=$(printf '\033[38;2;227;239;38m'); D=$(printf '\033[2m'); B=$(printf '\033[1m'); R=$(printf '\033[0m')
else
  P=; D=; B=; R=
fi
say() { printf '%s\n' "$*"; }
step() { printf '%s▸%s %s\n' "$P" "$R" "$*"; }
die() { printf '%sfilmkit install:%s %s\n' "$B" "$R" "$*" >&2; exit 1; }

# /dev/tty exists even without a controlling terminal (an agent's subprocess), so open it to find out.
tty_ok() { (: < /dev/tty) 2> /dev/null; }

# Questions read from the terminal, not stdin, so they work when the script is piped from curl.
ask() {
  [ "$YES" = 1 ] && return 0
  tty_ok || die "$1 Re-run with --yes to accept, or install it yourself."
  printf '%s [Y/n] ' "$1" > /dev/tty
  read -r reply < /dev/tty || reply=
  case $reply in [nN]*) return 1 ;; *) return 0 ;; esac
}

have() { command -v "$1" > /dev/null 2>&1; }

pm() {
  if have brew; then echo brew
  elif have apt-get; then echo apt
  elif have dnf; then echo dnf
  elif have pacman; then echo pacman
  else echo none
  fi
}

sudo_if_needed() { if [ "$(id -u)" = 0 ]; then "$@"; elif have sudo; then sudo "$@"; else die "need root to run: $*"; fi; }

install_pkg() {  # install_pkg <what> <brew> <apt> <dnf> <pacman>
  case $(pm) in
    brew) brew install "$2" ;;
    apt) sudo_if_needed apt-get update -qq && sudo_if_needed apt-get install -y "$3" ;;
    dnf) sudo_if_needed dnf install -y "$4" || die "dnf couldn't install $4: for ffmpeg, enable RPM Fusion or install ffmpeg-free, then re-run" ;;
    pacman) sudo_if_needed pacman -Sy --needed --noconfirm "$5" ;;
    none) die "no package manager found to install $1: install it from its website, then re-run" ;;
  esac
}

node_ok() { have node && [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -ge "$NODE_MAJOR_MIN" ]; }

say ""
say "  ${P}${B}◢◣ ANGLE${R} ${P}FILMKIT${R}"
say "  ${D}Your agent makes the film.${R}"
say ""

step "Node ≥ $NODE_MAJOR_MIN"
if node_ok; then
  say "  ${D}node $(node -v)${R}"
else
  ask "Node $NODE_MAJOR_MIN or newer isn't installed. Install it now?" || die "Filmkit needs Node $NODE_MAJOR_MIN+ (https://nodejs.org)."
  case $(pm) in
    apt) # Debian/Ubuntu's own node is often too old: use NodeSource's current LTS.
      have curl || install_pkg curl curl curl curl curl
      curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo_if_needed sh -
      sudo_if_needed apt-get install -y nodejs ;;
    *) install_pkg node node nodejs nodejs nodejs ;;
  esac
  node_ok || die "Node is still older than $NODE_MAJOR_MIN after installing; install it from https://nodejs.org"
fi

step "ffmpeg"
if have ffmpeg; then
  say "  ${D}$(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f1-3)${R}"
else
  ask "ffmpeg isn't installed (Filmkit mixes sound and encodes video with it). Install it now?" || die "Filmkit needs ffmpeg (https://ffmpeg.org)."
  # Fedora ships ffmpeg-free; the full ffmpeg needs RPM Fusion.
  install_pkg ffmpeg ffmpeg ffmpeg ffmpeg-free ffmpeg
  have ffmpeg || die "ffmpeg still isn't on PATH after installing"
fi

step "Setting up Filmkit"
# Under `curl | sh` stdin is the spent script pipe, so setup's walkthrough reads the terminal instead.
if [ "$YES" = 0 ] && tty_ok; then exec npx -y "$FILMKIT_PKG" setup "$@" < /dev/tty; fi
exec npx -y "$FILMKIT_PKG" setup "$@"
