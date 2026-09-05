# Fix Metro EINVAL readlink from OneDrive cloud placeholders.
# Targets the known broken package first (fast), then optional broader scan.

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host 'Stopping Metro on 8081-8083...' -ForegroundColor Cyan
foreach ($p in 8081, 8082, 8083) {
  Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 1

function Materialize-File([string]$path) {
  $bytes = [System.IO.File]::ReadAllBytes($path)
  $tmp = "$path.__local"
  [System.IO.File]::WriteAllBytes($tmp, $bytes)
  [System.IO.File]::Delete($path)
  [System.IO.File]::Move($tmp, $path)
}

function Materialize-Dir([string]$dir) {
  if (-not (Test-Path $dir)) { return 0 }
  $n = 0
  Get-ChildItem $dir -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      Materialize-File $_.FullName
      $n++
    }
  }
  return $n
}

$targets = @(
  "$root\node_modules\expo\node_modules\ci-info",
  "$root\node_modules\ci-info"
)

$total = 0
foreach ($t in $targets) {
  $total += Materialize-Dir $t
}
Write-Host ("Materialized {0} file(s) in known packages." -f $total) -ForegroundColor Green

if (Test-Path "$root\.expo") {
  Remove-Item "$root\.expo" -Recurse -Force
  Write-Host 'Cleared .expo cache.' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Done. Start Expo with:' -ForegroundColor Cyan
Write-Host '  npx expo start --clear'
