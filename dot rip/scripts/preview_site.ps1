param(
  [string]$SiteDir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'site'),
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath (Join-Path $SiteDir 'index.html'))) {
  throw "Could not find site index.html in $SiteDir"
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  $python = Get-Command py -ErrorAction SilentlyContinue
}

if (-not $python) {
  throw 'Python is required for preview. Install Python or use another static file server.'
}

Write-Host "Serving $SiteDir at http://localhost:$Port/"
Push-Location $SiteDir
try {
  & $python.Source -m http.server $Port
} finally {
  Pop-Location
}
