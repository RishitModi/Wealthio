# Wealthio - Start All Services
# Run from the project root:  .\start-all.ps1
# Press Ctrl+C in this window to stop all services.

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "  ===== Wealthio - Starting Services =====" -ForegroundColor Cyan
Write-Host ""

# Kill any stale processes on our ports before starting
$ports = @(8080, 8001, 5173)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -ne 0 }
        foreach ($procId in $pids) {
            Write-Host "  Killing stale process on port $port (PID $procId)..." -ForegroundColor DarkYellow
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Milliseconds 500
    }
}

$script:childProcesses = @()

function Cleanup {
    Write-Host ""
    Write-Host "  Shutting down all services..." -ForegroundColor Yellow
    foreach ($proc in $script:childProcesses) {
        try {
            if (!$proc.HasExited) {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $proc.Id } | ForEach-Object {
                    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                }
            }
        } catch { }
    }
    Write-Host "  All services stopped." -ForegroundColor Green
}

Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null

# 1. Spring Boot Backend
Write-Host "  [1/3] Starting Spring Boot backend..." -ForegroundColor Green
$springCmd = "Set-Location '$ROOT\backend'; .\mvnw spring-boot:run"
$springProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $springCmd -PassThru
$script:childProcesses += $springProc
Write-Host "        PID $($springProc.Id) | http://localhost:8080" -ForegroundColor DarkGray

# 2. ML Service (FastAPI)
Write-Host "  [2/3] Starting ML service (FastAPI)..." -ForegroundColor Magenta
$mlCmd = "Set-Location '$ROOT\backend\ml-service'; & '.\venv\Scripts\Activate.ps1'; uvicorn main:app --reload --port 8001"
$mlProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $mlCmd -PassThru
$script:childProcesses += $mlProc
Write-Host "        PID $($mlProc.Id) | http://localhost:8001" -ForegroundColor DarkGray

# 3. Frontend (Vite)
Write-Host "  [3/3] Starting frontend (Vite)..." -ForegroundColor Yellow
$frontCmd = "Set-Location '$ROOT\frontend'; npm run dev"
$frontProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontCmd -PassThru
$script:childProcesses += $frontProc
Write-Host "        PID $($frontProc.Id) | http://localhost:5173" -ForegroundColor DarkGray

# Summary
Write-Host ""
Write-Host "  All 3 services launched!" -ForegroundColor Cyan
Write-Host "  Spring Boot  -> http://localhost:8080" -ForegroundColor Green
Write-Host "  ML Service   -> http://localhost:8001" -ForegroundColor Magenta
Write-Host "  Frontend     -> http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C here to stop everything." -ForegroundColor DarkGray
Write-Host ""

# Keep alive - Ctrl+C triggers cleanup
try {
    while ($true) {
        Start-Sleep -Seconds 3
    }
} finally {
    Cleanup
}
