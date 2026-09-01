<#
.SYNOPSIS
  add-song.ps1 - add a song to "The Love Rewind" (auto-numbers, updates songs.js, pushes).

.DESCRIPTION
  Copies an MP3 into the /songs folder with the next number, appends the matching
  entry to songs.js, commits, and (optionally) pushes to GitHub so the new song
  goes live on GitHub Pages automatically.

  Songs are appended so the file number always matches the playlist position.

.EXAMPLE
  .\add-song.ps1 -Title "Thinking Out Loud" -Artist "Ed Sheeran" -From "C:\desktop\track.mp3" -Token "ghp_..."
.EXAMPLE
  .\add-song.ps1 -Title "The Scientist" -Artist "Coldplay" -From "C:\desktop\sci.mp3" -SkipPush
#>
param(
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$Artist,
  [Parameter(Mandatory = $true)][string]$From,
  [string]$Token = "",
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$songsDir = Join-Path $root "songs"
$songsJs  = Join-Path $root "songs.js"

# --- 0. sanity checks ---------------------------------------------------------
if (-not (Test-Path -LiteralPath $songsDir)) { throw "songs folder not found: $songsDir" }
if (-not (Test-Path -LiteralPath $songsJs))  { throw "songs.js not found: $songsJs" }
if (-not (Test-Path -LiteralPath $From))     { throw "MP3 not found: $From" }
if ([System.IO.Path]::GetExtension($From) -notmatch '^\.mp3$') { throw "File must be an MP3 (got: $From)" }

# --- 1. next number (append-only keeps positional mapping valid) ---------------
$existing = @(Get-ChildItem -LiteralPath $songsDir -Filter *.mp3 -File)
$next = $existing.Count + 1
$dest = Join-Path $songsDir ("{0:D2}.mp3" -f $next)
if (Test-Path -LiteralPath $dest) { throw "Target file already exists: $dest (playlist/file numbering out of sync?)" }

# --- 2. copy the mp3 -----------------------------------------------------------
Copy-Item -LiteralPath $From -Destination $dest
Write-Host "  + added  $dest"

# --- 3. escape title/artist and append to songs.js ------------------------------
function Esc([string]$s) {
  $s = $s -replace '\\', '\\\\'
  $s = $s -replace '"', '\"'
  return $s
}
$line = '  { title: "' + (Esc $Title) + '", artist: "' + (Esc $Artist) + '" },'

$content = Get-Content -LiteralPath $songsJs -Raw
$pattern = '(?ms)(\];\s*$)'
if ($content -notmatch $pattern) { throw "Could not find the closing ]; of SONGS in songs.js" }
$content = $content -replace $pattern, ($line + "`r`n" + '$1')
Set-Content -LiteralPath $songsJs -Value $content -NoNewline -Encoding UTF8
Write-Host "  + updated songs.js with #${next}: $Title - $Artist"

# --- 4. commit -----------------------------------------------------------------
Push-Location $root
try {
  git add -A | Out-Null
  git commit -m "Add song $($next.ToString('00')): $Title - $Artist" | Out-Null
  Write-Host "  + committed"
}
finally { Pop-Location }

# --- 5. push -------------------------------------------------------------------
if ($SkipPush) {
  Write-Host "`nDone (Skipped push). Run: git push origin main"
  exit 0
}

$remote = (git -C $root config --get remote.origin.url).Trim()

if ($Token) {
  $tokenUrl = $remote -replace '^https://(?=[^/@]+@)?github.com/', ('https://x-access-token:{0}@github.com/' -f $Token)
  if ($tokenUrl -eq $remote) { throw "Unsupported remote URL format: $remote" }
  git -C $root remote set-url origin $tokenUrl | Out-Null
  try {
    git -C $root push origin main
    Write-Host "`n  + pushed to GitHub"
  }
  finally {
    git -C $root remote set-url origin $remote | Out-Null
  }
} else {
  Write-Host "`nPushing with stored credentials (no token given)..."
  git -C $root push origin main
  if ($LASTEXITCODE -ne 0) {
    Write-Host "`nPush failed - no git credentials. Re-run with -Token (e.g. add-song.ps1 -Title ... -Token ghp_...)"
  }
}
