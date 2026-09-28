$ErrorActionPreference = 'Stop'
$toolRoot = Join-Path $env:LOCALAPPDATA 'PakTroopersTools\oss-cad-suite'
$setup = Join-Path $toolRoot 'environment.ps1'
if (-not (Test-Path -LiteralPath $setup)) { throw "OSS CAD Suite not found at $toolRoot" }
. $setup
Set-Location -LiteralPath $PSScriptRoot
$url = 'http://127.0.0.1:4173'
$ready = $false
try { $ready = (Invoke-WebRequest -Uri $url -TimeoutSec 2).StatusCode -eq 200 } catch { }
if (-not $ready) {
    $node = (Get-Command node -ErrorAction Stop).Source
    Start-Process -FilePath $node -ArgumentList (Join-Path $PSScriptRoot 'demo\server.js') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 30 -and -not $ready; $attempt++) {
        Start-Sleep -Milliseconds 250
        try { $ready = (Invoke-WebRequest -Uri $url -TimeoutSec 2).StatusCode -eq 200 } catch { }
    }
}
if (-not $ready) { throw 'PulseTrust server did not become ready' }
Write-Host "PulseTrust ready at $url"
Start-Process $url
