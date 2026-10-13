<#
 deploy.ps1 — safe deployment for the portfolio site on Hostinger.

 Workflow:
   1. Edit files under  public\
   2. Run:   powershell -ExecutionPolicy Bypass -File deploy.ps1
      The script tests the site LOCALLY first and only pushes to the
      live branch (hostinger-static) if every check passes.
   3. Optionally record the same change on main for history:
        git add -A ; git commit -m "describe the change" ; git push

 Rollback (if a deploy ever breaks the live site):
        deploy.ps1 -Rollback              list the last 10 deploys
        deploy.ps1 -Rollback -Commit SHA  instantly revert live site to SHA
#>
param(
  [string]$Message = "",
  [switch]$Rollback,
  [string]$Commit = ""
)

$Repo = $PSScriptRoot
$Site = Join-Path $Repo "public"
$Url  = "https://github.com/tassneem-ch/tassneem-portfolio.git"
$Live = "https://tassneem.chrif.net"

function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# ---------------- rollback mode ----------------
if ($Rollback) {
  git fetch origin hostinger-static --quiet
  if (-not $Commit) {
    Write-Host "Last deploys on hostinger-static (newest first):`n"
    git log --oneline -10 FETCH_HEAD
    Write-Host "`nRevert with:  deploy.ps1 -Rollback -Commit <sha>"
    exit 0
  }
  Write-Host "Rolling the live site back to $Commit ..."
  git push --force origin "${Commit}:hostinger-static"
  Write-Host "Done. Hostinger redeploys within 1-2 minutes." -ForegroundColor Green
  exit 0
}

# ---------------- 1. verify site files ----------------
Write-Host "==> Checking site files..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $Site "index.html"))) { Fail "public\index.html not found" }
if (-not (Test-Path (Join-Path $Site ".htaccess")))  { Fail "public\.htaccess not found" }

# every local href/src referenced by index.html must exist on disk
$html = Get-Content (Join-Path $Site "index.html") -Raw
if ($html -notmatch '</html>') { Fail "index.html looks truncated (no closing </html>)" }
$refs = [regex]::Matches($html, '(?:href|src)\s*=\s*"([^"]+)"') |
        ForEach-Object { $_.Groups[1].Value } |
        Where-Object { $_ -notmatch '^(https?:|mailto:|#|data:|javascript:)' }
foreach ($r in $refs) {
  $file = ($r -split '[#?]')[0]
  if (-not $file) { continue }
  $p = Join-Path $Site ($file -replace '/', '\')
  if (-not (Test-Path $p)) { Fail "index.html references '$r' but the file does not exist" }
}
Write-Host "    index.html OK, $($refs.Count) local references OK"

# ---------------- 2. local smoke test ----------------
Write-Host "==> Starting local server for a smoke test..." -ForegroundColor Cyan
$port = Get-Random -Minimum 9400 -Maximum 9900
$env:PORT = "$port"
$server = Start-Process node -ArgumentList "server.js" -PassThru -WindowStyle Hidden -WorkingDirectory $Repo
$failed = $false
try {
  Start-Sleep -Seconds 2
  foreach ($path in @("/", "/site.css", "/webfonts.css", "/site.js", "/assets/tasnim-portrait.png", "/assets/mark.svg", "/assets/fonts/quicksand-latin.woff2", "/assets/fonts/nunito-latin.woff2")) {
    $code = $null
    for ($i = 0; $i -lt 5 -and -not $code; $i++) {
      try { $code = (Invoke-WebRequest -Uri "http://localhost:$port$path" -UseBasicParsing -TimeoutSec 5).StatusCode }
      catch { Start-Sleep -Milliseconds 500 }
    }
    if ($code -eq 200) { Write-Host "    200  $path" -ForegroundColor Green }
    else { Write-Host "    FAIL ($code)  $path" -ForegroundColor Red; $failed = $true }
  }
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Remove-Item Env:PORT -ErrorAction SilentlyContinue
}
if ($failed) { Fail "Smoke test FAILED - nothing was pushed. Fix the issue and run again." }
Write-Host "    Smoke test passed." -ForegroundColor Green

# ---------------- 3. publish to hostinger-static ----------------
Write-Host "==> Publishing to hostinger-static..." -ForegroundColor Cyan
$tmp = Join-Path $env:TEMP "ths-deploy"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
git clone --quiet --depth 1 --branch hostinger-static $Url $tmp
robocopy $Site $tmp /MIR /XD .git /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Remove-Item -Recurse -Force $tmp; Fail "File sync failed (robocopy code $LASTEXITCODE)" }
$change = git -C $tmp status --porcelain
if (-not $change) {
  Remove-Item -Recurse -Force $tmp
  Write-Host "Nothing changed - the live site is already up to date." -ForegroundColor Green
  exit 0
}
if (-not $Message) { $Message = "deploy: update site $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
git -C $tmp add -A
git -C $tmp -c user.name="tassneem-ch" -c user.email="tassneem.ch@hotmail.com" commit --quiet -m $Message
git -C $tmp push --quiet origin hostinger-static
Remove-Item -Recurse -Force $tmp
Write-Host "    Pushed: $Message" -ForegroundColor Green

# ---------------- 4. confirm the live site ----------------
Write-Host "==> Waiting for Hostinger to redeploy (usually 1-2 min)..." -ForegroundColor Cyan
$stamp = Get-Date -Format yyyyMMddHHmmss
$ok = $false
for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep -Seconds 15
  try {
    $r = Invoke-WebRequest -Uri "$Live/?_=$stamp" -UseBasicParsing -TimeoutSec 15
    # content check (not just 200): the served HTML must reference the CURRENT
    # asset names, so a stale/edge-cached page can never pass as deployed.
    if ($r.StatusCode -eq 200 -and $r.Content -match '<html' -and $r.Content -match 'site\.css' -and $r.Content -notmatch 'styles\.css') {
      $css = (Invoke-WebRequest -Uri "$Live/site.css?_=$stamp" -UseBasicParsing -TimeoutSec 15).Content
      $js  = (Invoke-WebRequest -Uri "$Live/site.js?_=$stamp"  -UseBasicParsing -TimeoutSec 15).Content
      if ($css -match '--sakura' -and $js -match 'CHERRY BLOSSOM PETALS') { $ok = $true; break }
    }
  } catch { }
  Write-Host "    ...still deploying ($(($i+1)*15)s)" -ForegroundColor DarkGray
}
if ($ok) {
  Write-Host "`nLIVE - $Live  (hard-refresh with Ctrl+F5)" -ForegroundColor Green
} else {
  Write-Host "`nThe live site did not return 200 yet. Check hPanel, or roll back:" -ForegroundColor Yellow
  Write-Host "  deploy.ps1 -Rollback             (lists recent deploys)"
  Write-Host "  deploy.ps1 -Rollback -Commit <sha>"
}
