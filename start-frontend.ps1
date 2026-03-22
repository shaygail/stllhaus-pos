# Start frontend development server
$frontendDir = "$PSScriptRoot\frontend"
Set-Location $frontendDir

Write-Host "Starting frontend on http://localhost:3000 ..."
npm run dev
