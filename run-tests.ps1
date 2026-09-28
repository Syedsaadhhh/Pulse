$ErrorActionPreference = 'Stop'
$toolRoot = Join-Path $env:LOCALAPPDATA 'PakTroopersTools\oss-cad-suite'
$setup = Join-Path $toolRoot 'environment.ps1'
if (-not (Test-Path -LiteralPath $setup)) { throw "OSS CAD Suite not found at $toolRoot" }
. $setup
Set-Location -LiteralPath $PSScriptRoot
$buildDir = Join-Path $PSScriptRoot 'sim_build'
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
$sim = Join-Path $buildDir 'rtl_selfcheck.vvp'
& iverilog -g2005 -s rtl_selfcheck -o $sim (Join-Path $PSScriptRoot 'src\project.v') (Join-Path $PSScriptRoot 'test\rtl_selfcheck.v')
if ($LASTEXITCODE -ne 0) { throw 'Verilog compile failed' }
& vvp $sim
if ($LASTEXITCODE -ne 0) { throw 'RTL self-check failed' }
& yosys -Q -T -q -p "read_verilog src/project.v; hierarchy -check -top tt_um_syedsaadhhh_pulsetrust; synth -top tt_um_syedsaadhhh_pulsetrust; check -assert"
if ($LASTEXITCODE -ne 0) { throw 'Yosys synthesis check failed' }
Write-Host 'PASS Yosys synthesis and structural checks'
