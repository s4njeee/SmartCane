# Free Metro ports and start Expo on a single predictable port.
$ports = 8081, 8082, 8083
foreach ($p in $ports) {
  Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 2

Set-Location $PSScriptRoot\..

Write-Host "Starting Expo on http://localhost:8081 (LAN)..." -ForegroundColor Cyan
Write-Host "If the phone still cannot connect, run: npm run start:tunnel" -ForegroundColor DarkYellow

npx expo start --go --clear --lan --port 8081