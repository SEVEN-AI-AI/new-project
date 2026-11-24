param(
  [string]$Message = "Publish site update",
  [string[]]$Paths = @("ad-system.js", "erp.html", "erp.css", "erp.js", "app.js", "styles.css", "static-api", "deploy_public.ps1", "DEPLOY_WORKFLOW.md", "dashboard_api.py", "sales_report_parser.py", "dashboard-common.js", "dashboard.css", "dashboard.js", "dashboard.html", "store-overview.html", "store-overview.js", "sku-orders.html", "sku-orders.js", "data-import.html", "data-import.js", "server.py")
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Server = "root@123.57.145.157"
$ServerDir = "/opt/new-project"
$PublicUrl = "http://123.57.145.157/erp.html"

Set-Location $RepoRoot

Write-Host "== Local repository ==" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "== Stage selected paths ==" -ForegroundColor Cyan
foreach ($Path in $Paths) {
  if (Test-Path $Path) {
    git add -- $Path
    Write-Host "added $Path"
  }
}

$staged = git diff --cached --name-only
if (-not $staged) {
  Write-Host "No staged changes. Nothing to deploy." -ForegroundColor Yellow
  exit 0
}

Write-Host ""
Write-Host "== Staged files ==" -ForegroundColor Cyan
$staged

Write-Host ""
Write-Host "== Commit and push ==" -ForegroundColor Cyan
git commit -m $Message
git push origin main

Write-Host ""
Write-Host "== Update server ==" -ForegroundColor Cyan
$remoteCommand = @"
set -e
cd $ServerDir
if [ -d .git ]; then
  git pull --ff-only origin main
else
  echo 'ERROR: /opt/new-project is not a git repository.'
  echo 'Run the server bootstrap command once, or ask Codex to deploy by scp.'
  exit 2
fi
echo 'Server updated.'
"@

ssh $Server $remoteCommand

Write-Host ""
Write-Host "Deploy finished. Open $PublicUrl and press Ctrl+Shift+R." -ForegroundColor Green
