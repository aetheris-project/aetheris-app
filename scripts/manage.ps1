# =============================================================================
# Aetheris - Stack manager for Windows (Docker Desktop)
# =============================================================================
# PowerShell equivalent of scripts/manage.sh. Every subcommand maps to a
# `docker compose` call, so the same workflows work on Windows and Linux.
#
# Usage (from the repository root):
#   powershell -ExecutionPolicy Bypass -File scripts\manage.ps1 status
#   powershell -ExecutionPolicy Bypass -File scripts\manage.ps1 start
#   powershell -ExecutionPolicy Bypass -File scripts\manage.ps1 stop
#   powershell -ExecutionPolicy Bypass -File scripts\manage.ps1 restart
#   powershell -ExecutionPolicy Bypass -File scripts\manage.ps1 down
#   powershell -ExecutionPolicy Bypass -File scripts\manage.ps1 logs [-Tail 300] [-Follow]
#   powershell -ExecutionPolicy Bypass -File scripts\manage.ps1 pull
#
# The stack targets the SQLite compose file when AETHERIS_DB_MODE=sqlite is
# set in .env (or with -Sqlite), otherwise the full PostgreSQL stack.
# =============================================================================

param(
  [Parameter(Position = 0)]
  [ValidateSet("status", "start", "stop", "restart", "down", "logs", "pull")]
  [string]$Command = "status",

  [int]$Tail = 200,
  [switch]$Follow,
  [switch]$Sqlite,
  [switch]$Help
)

$ErrorActionPreference = "Stop"

function Show-Help {
  Write-Host "Aetheris stack manager (Windows)" -ForegroundColor Green
  Write-Host "  status   - show container states (docker compose ps)"
  Write-Host "  start    - bring the stack up (docker compose up -d)"
  Write-Host "  stop     - stop containers, keep volumes (docker compose stop)"
  Write-Host "  restart  - stop then start the stack"
  Write-Host "  down     - stop containers and remove volumes (docker compose down -v)"
  Write-Host "  logs     - print the last -Tail lines; use -Follow to tail live"
  Write-Host "  pull     - refresh all images (docker compose pull)"
  Write-Host ""
  Write-Host "Options: -Tail <n>  -Follow  -Sqlite  -Help"
}

function Resolve-ComposeFile {
  $envFile = Join-Path (Get-Location) ".env"
  $useSqlite = $Sqlite
  if (-not $useSqlite -and (Test-Path $envFile)) {
    $modeLine = Select-String -Path $envFile -Pattern '^AETHERIS_DB_MODE=' -ErrorAction SilentlyContinue
    if ($modeLine -and $modeLine.Line.Trim().ToLower().Contains("sqlite")) {
      $useSqlite = $true
    }
  }
  if ($useSqlite) {
    return "docker-compose.sqlite.yml"
  }
  return "docker-compose.yml"
}

if ($Help) {
  Show-Help
  exit 0
}

$compose = Resolve-ComposeFile
if (-not (Test-Path $compose)) {
  Write-Host "ERROR: $compose not found - run this script from the repository root." -ForegroundColor Red
  exit 1
}

$baseArgs = @("compose", "-f", $compose)

switch ($Command) {
  "status" { docker @baseArgs ps }
  "start"  { docker @baseArgs up -d }
  "stop"   { docker @baseArgs stop }
  "restart" {
    docker @baseArgs stop
    docker @baseArgs up -d
  }
  "down"   { docker @baseArgs down -v --remove-orphans }
  "pull"   { docker @baseArgs pull }
  "logs" {
    if ($Follow) {
      docker @baseArgs logs -f --tail $Tail --timestamps
    } else {
      docker @baseArgs logs --tail $Tail --timestamps
    }
  }
  default  { Show-Help }
}
