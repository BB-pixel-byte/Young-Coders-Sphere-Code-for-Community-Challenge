# ChoreMap frontend dev server (works without global Node.js install)
$nodePath = Join-Path $PSScriptRoot ".tools\node"
if (-not (Test-Path "$nodePath\node.exe")) {
    Write-Host "Node.js not found in .tools\node"
    Write-Host "Install Node.js from https://nodejs.org (LTS), then close and reopen your terminal."
    Write-Host "Or ask your teammate to run the setup once on this machine."
    exit 1
}

$env:Path = "$nodePath;" + $env:Path
Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host ""
Write-Host "Starting ChoreMap at http://localhost:5173" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

npm run dev
