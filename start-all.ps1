# ─────────────────────────────────────────────────────────────────
#  Wealthio — Start All Services
#  Run from the project root:  .\start-all.ps1
#  Press Ctrl+C in this window to stop all services.
# ─────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║       Wealthio — Starting Services       ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Track spawned processes so we can kill them on exit
$script:childProcesses = @()

function Cleanup {
    Write-Host ""
    Write-Host "  Shutting down all services..." -ForegroundColor Yellow
    foreach ($proc in $script:childProcesses) {
        try {
            if (!$proc.HasExited) {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                # Also kill the entire process tree
                Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $proc.Id } | ForEach-Object {
                    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                }
            }
        } catch { }
    }
    Write-Host "  All services stopped." -ForegroundColor Green
}

# Register cleanup on script exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null

# ── 1. Spring Boot Backend ──────────────────────────────────────
Write-Host "  [1/3] Starting Spring Boot backend..." -ForegroundColor Green
$springProc = Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Wealthio — Spring Boot (8080)'; Set-Location '$ROOT\backend'; .\mvnw spring-boot:run"
) -PassThru
$script:childProcesses += $springProc
Write-Host "        → PID $($springProc.Id) | http://localhost:8080" -ForegroundColor DarkGray

# ── 2. ML Service (FastAPI) ─────────────────────────────────────
Write-Host "  [2/3] Starting ML service (FastAPI)..." -ForegroundColor Magenta
$mlProc = Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Wealthio — ML Service (8001)'; Set-Location '$ROOT\backend\ml-service'; & '.\venv\Scripts\Activate.ps1'; uvicorn main:app --reload --port 8001"
) -PassThru
$script:childProcesses += $mlProc
Write-Host "        → PID $($mlProc.Id) | http://localhost:8001" -ForegroundColor DarkGray

# ── 3. Frontend (Vite) ──────────────────────────────────────────
Write-Host "  [3/3] Starting frontend (Vite)..." -ForegroundColor Yellow
$frontProc = Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Wealthio — Frontend (5173)'; Set-Location '$ROOT\frontend'; npm run dev"
) -PassThru
$script:childProcesses += $frontProc
Write-Host "        → PID $($frontProc.Id) | http://localhost:5173" -ForegroundColor DarkGray

# ── Summary ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ┌──────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "  │  All 3 services launched!                 │" -ForegroundColor Cyan
Write-Host "  │                                           │" -ForegroundColor Cyan
Write-Host "  │  Spring Boot  → http://localhost:8080     │" -ForegroundColor Green
Write-Host "  │  ML Service   → http://localhost:8001     │" -ForegroundColor Magenta
Write-Host "  │  Frontend     → http://localhost:5173     │" -ForegroundColor Yellow
Write-Host "  │                                           │" -ForegroundColor Cyan
Write-Host "  │  Press Ctrl+C here to stop everything.    │" -ForegroundColor DarkGray
Write-Host "  └──────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# Keep this script alive — Ctrl+C triggers cleanup
try {
    while ($true) {
        # Check if any child process has died
        foreach ($proc in $script:childProcesses) {
            if ($proc.HasExited) {
                $name = switch ($proc.Id) {
                    $springProc.Id { "Spring Boot" }
                    $mlProc.Id     { "ML Service"  }
                    $frontProc.Id  { "Frontend"    }
                    default        { "Unknown"     }
                }
                Write-Host "  ⚠ $name (PID $($proc.Id)) has stopped." -ForegroundColor Red
            }
        }
        Start-Sleep -Seconds 3
    }
} finally {
    Cleanup
}
