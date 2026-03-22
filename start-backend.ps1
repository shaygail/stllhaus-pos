# Kill anything already on port 8000
$portPid = (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($portPid) { 
    Stop-Process -Id $portPid -Force; 
    Write-Host "Killed previous process on port 8000" 
}

$venvPython = "$PSScriptRoot\.venv\Scripts\python.exe"
$backendDir = "$PSScriptRoot\backend"
Set-Location $backendDir

# Set PYTHONPATH to include the backend directory
$env:PYTHONPATH = $backendDir

Write-Host "Starting backend on http://0.0.0.0:8000 ..."
Write-Host "Using Python: $venvPython"
Write-Host "Backend directory: $backendDir"

& $venvPython -m uvicorn app.main:app --host 0.0.0.0 --port 8000
