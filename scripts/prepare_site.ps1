param(
  [string]$SourceHtml = (Join-Path (Split-Path -Parent $PSScriptRoot) 'html_outputs\DOT_RIP_online_outputs_tools_dashboards.html'),
  [string]$SiteDir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'site')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $SourceHtml)) {
  throw "Could not find source HTML: $SourceHtml"
}

New-Item -ItemType Directory -Force -Path $SiteDir | Out-Null
Copy-Item -LiteralPath $SourceHtml -Destination (Join-Path $SiteDir 'index.html') -Force

& (Join-Path $PSScriptRoot 'localize_site_assets.ps1') -SiteDir $SiteDir

Write-Host "Prepared editable static site at $SiteDir"
