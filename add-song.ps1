<#
.SYNOPSIS
  add-song.ps1 - add a song to "The Love Rewind" (unique filename, updates songs.js, pushes).

.DESCRIPTION
  Copies an MP3 into the /songs folder under a uniquely-named, URL-safe filename
  derived from the song title, appends the matching entry (with a `file:` field)
  to songs.js, commits, and (optionally) pushes to GitHub so the new song goes
  live on GitHub Pages automatically. Unique filenames also avoid stale-cache
  issues from reusing the same audio URLs.

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

# --- 1. build a unique, url-safe filename from the title -----------------------
function Slug([string]$s) {
  $s = $s.ToLower()
  $s = [regex]::Replace($s, '[^a-z0-9]+', '-')
  $s = $s.Trim('-')
  if ($s -eq "") { $s = "track" }
  return $s
}
$base = Slug $Title
$existingNames = @(Get-ChildItem -LiteralPath $songsDir -Filter *.mp3 -File | ForEach-Object { $_.BaseName })
$candidate = $base
$suffix = 0
while ($existingNames -contains $candidate) {
  $suffix++
  $candidate = "$base-$suffix"
}
$dest = Join-Path $songsDir ($candidate + ".mp3")

# --- 2. copy the mp3 -----------------------------------------------------------
Copy-Item -LiteralPath $From -Destination $dest
Write-Host "  + added  $dest"

# --- 3. escape title/artist and append to songs.js ------------------------------
function Esc([string]$s) {
  $s = $s -replace '\\', '\\\\'
  $s = $s -replace '"', '\"'
  return $s
}
$fileRef = 'songs/' + $candidate + '.mp3'
$line = '  { title: "' + (Esc $Title) + '", artist: "' + (Esc $Artist) + '", file: "' + $fileRef + '" },'

$content = Get-Content -LiteralPath $songsJs -Raw
$pattern = '(?ms)(\];\s*$)'
if ($content -notmatch $pattern) { throw "Could not find the closing ]; of SONGS in songs.js" }
$content = $content -replace $pattern, ($line + "`r`n" + '$1')
Set-Content -LiteralPath $songsJs -Value $content -NoNewline -Encoding UTF8
Write-Host "  + updated songs.js: $Title - $Artist  ->  $fileRef"

# --- 4. commit -----------------------------------------------------------------
Push-Location $root
try {
  git add -A | Out-Null
  git commit -m "Add song: $Title - $Artist" | Out-Null
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
