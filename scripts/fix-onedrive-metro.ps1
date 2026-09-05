# Keep node_modules on this PC. OneDrive cloud placeholders crash Metro TreeFS.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host 'Stopping Metro on 8081-8083...' -ForegroundColor Cyan
foreach ($p in 8081, 8082, 8083) {
  Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 1

$localRoot = Join-Path $env:LOCALAPPDATA 'SmartCane'
$localNm = Join-Path $localRoot 'node_modules'
$projectNm = Join-Path $root 'node_modules'

New-Item -ItemType Directory -Force -Path $localRoot | Out-Null

function Test-LocalJunction {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $false }
  $item = Get-Item $Path -Force
  return $item.LinkType -eq 'Junction'
}

if (Test-LocalJunction $projectNm) {
  Write-Host 'node_modules already points at a local folder. Skipping move.' -ForegroundColor Green
} else {
  Write-Host 'Copying node_modules out of OneDrive to:' -ForegroundColor Cyan
  Write-Host $localNm
  if (Test-Path $localNm) {
    Remove-Item $localNm -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $localNm | Out-Null

  robocopy $projectNm $localNm /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
  if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed with exit code $LASTEXITCODE"
  }

  Write-Host 'Replacing OneDrive node_modules with a local junction...' -ForegroundColor Cyan
  Remove-Item -LiteralPath $projectNm -Recurse -Force
  $linkCmd = 'mklink /J "' + $projectNm + '" "' + $localNm + '"'
  cmd.exe /c $linkCmd
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to create node_modules junction.'
  }
  Write-Host 'Created local junction for node_modules.' -ForegroundColor Green
}

$caches = @((Join-Path $root '.expo'), (Join-Path $localNm '.cache'))
foreach ($cache in $caches) {
  if (Test-Path $cache) {
    Remove-Item $cache -Recurse -Force -ErrorAction SilentlyContinue
  }
}
Write-Host 'Cleared Metro/.expo cache.' -ForegroundColor Green

Write-Host ''
Write-Host 'Done. Start Expo with:' -ForegroundColor Cyan
Write-Host '  npx expo start --go --clear --port 8081'
