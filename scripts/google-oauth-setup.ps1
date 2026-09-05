# One-time Google OAuth setup for SmartCane (Expo Go + Firebase, free tier)
Write-Host "SmartCane Google Sign-In Setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Enable Google in Firebase Authentication"
Start-Process "https://console.firebase.google.com/project/smartcane-ddedd/authentication/providers"
Write-Host "2. Copy the Web client ID (ends with .apps.googleusercontent.com)"
Write-Host "3. Add this redirect URI in Google Cloud OAuth credentials:"
Write-Host "   https://auth.expo.io/@sanjeeee/smartcane" -ForegroundColor Yellow
Start-Process "https://console.cloud.google.com/apis/credentials?project=smartcane-ddedd"
Write-Host ""
$clientId = Read-Host "Paste Web Client ID here (or press Enter to skip)"
if ($clientId -and $clientId -match "apps\.googleusercontent\.com") {
  $configPath = Join-Path $PSScriptRoot "..\constants\googleOAuth.ts"
  $content = Get-Content $configPath -Raw
  $content = $content -replace "export const googleWebClientId =[\s\S]*?';", "export const googleWebClientId =`n  '$clientId';"
  Set-Content $configPath $content -NoNewline
  Write-Host "Saved to constants/googleOAuth.ts — restart Expo (npx expo start -c)" -ForegroundColor Green
} else {
  Write-Host "Skipped file update. You can paste the ID in the app setup screen instead." -ForegroundColor DarkYellow
}