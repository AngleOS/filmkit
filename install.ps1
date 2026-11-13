# Angle Filmkit installer for Windows (D-008).
#
#   irm https://raw.githubusercontent.com/AngleOS/filmkit/master/install.ps1 | iex
#   & ([scriptblock]::Create((irm …/install.ps1))) --yes --agents auto
#
# It checks Node >= 20.12 and ffmpeg, installs what's missing with winget (it asks first, unless --yes), then runs
# `filmkit setup` with the same arguments. Like install.sh, FILMKIT_PKG picks what npx runs: `github:AngleOS/filmkit`
# while the repo is private, `filmkit` once it's on npm.
# Everything runs in its own scope: under `irm | iex` an `exit` would close the user's PowerShell window, and its
# variables, functions and ErrorActionPreference would leak into their session.
& {
  $ErrorActionPreference = 'Stop'
  $pkg = if ($env:FILMKIT_PKG) { $env:FILMKIT_PKG } else { 'github:AngleOS/filmkit' }
  $yes = $args -contains '--yes' -or $args -contains '-y'

  function Step($text) { Write-Host '> ' -ForegroundColor Yellow -NoNewline; Write-Host $text }
  function Ask($question) {
    if ($yes) { return $true }
    $reply = Read-Host "$question [Y/n]"
    return -not ($reply -match '^[nN]')
  }
  function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
  function NodeOk {
    if (-not (Have node)) { return $false }
    return ((node -p "const [a, b] = process.versions.node.split('.').map(Number); +(a > 20 || (a === 20 && b >= 12))") 2>$null) -eq '1'
  }
  function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  }

  Write-Host ''
  Write-Host '  ANGLE FILMKIT' -ForegroundColor Yellow
  Write-Host '  Your agent makes the film.' -ForegroundColor DarkGray
  Write-Host ''

  if (-not (Have winget) -and (-not (NodeOk) -or -not (Have ffmpeg))) {
    throw 'winget is missing: install Node 20.12+ (https://nodejs.org) and ffmpeg (https://ffmpeg.org) yourself, then re-run.'
  }

  Step 'Node >= 20.12'
  if (NodeOk) { Write-Host "  node $(node -v)" -ForegroundColor DarkGray }
  else {
    if (-not (Ask "Node 20.12 or newer isn't installed. Install it now?")) { throw 'Filmkit needs Node 20.12+ (https://nodejs.org).' }
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    Refresh-Path
    if (-not (NodeOk)) { throw 'Node is still missing or too old: open a new terminal and re-run, or install it from https://nodejs.org.' }
  }

  Step 'ffmpeg'
  if (Have ffmpeg) { Write-Host '  ffmpeg found' -ForegroundColor DarkGray }
  else {
    if (-not (Ask "ffmpeg isn't installed (Filmkit mixes sound and encodes video with it). Install it now?")) { throw 'Filmkit needs ffmpeg (https://ffmpeg.org).' }
    winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
    Refresh-Path
    if (-not (Have ffmpeg)) { throw 'ffmpeg still is not on PATH: open a new terminal and re-run.' }
  }

  Step 'Setting up Filmkit'
  & npx -y $pkg setup @args
  if ($LASTEXITCODE) { throw "filmkit setup failed (exit $LASTEXITCODE)." }
} @args
