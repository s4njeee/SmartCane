# Run as Administrator. Or use open-firewall.bat instead.

$ruleName = "Expo Metro Bundler"
Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule

New-NetFirewallRule -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 8081-8099 `
  -Profile Any `
  -Enabled True

$nodePath = "$env:ProgramFiles\nodejs\node.exe"
if (Test-Path $nodePath) {
  Get-NetFirewallRule -DisplayName "Node.js Expo" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  New-NetFirewallRule -DisplayName "Node.js Expo" `
    -Direction Inbound `
    -Action Allow `
    -Program $nodePath `
    -Profile Any `
    -Enabled True
}

Write-Host "Firewall updated for all network types."
Write-Host "iPhone: Settings -> Expo Go -> turn ON Local Network"
Write-Host "Then run: npm start"
