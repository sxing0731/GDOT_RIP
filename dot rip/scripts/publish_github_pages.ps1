param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl,

  [string]$SiteDir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'site'),
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
  $gitPath = 'C:\Program Files\Git\cmd\git.exe'
  if (-not (Test-Path -LiteralPath $gitPath)) {
    throw 'Git is not available. Install Git for Windows or reopen the terminal after installation.'
  }
  $git = $gitPath
} else {
  $git = $git.Source
}

if (-not (Test-Path -LiteralPath (Join-Path $SiteDir 'index.html'))) {
  throw "Could not find site index.html in $SiteDir"
}

Push-Location $SiteDir
try {
  if (-not (Test-Path -LiteralPath '.git')) {
    & $git init
  }

  & $git checkout -B $Branch

  $existingRemote = (& $git remote) -contains 'origin'
  if ($existingRemote) {
    & $git remote set-url origin $RemoteUrl
  } else {
    & $git remote add origin $RemoteUrl
  }

  & $git add .
  & $git commit -m 'Publish DOT RIP dashboard'
  & $git push -u origin $Branch

  Write-Host "Pushed $SiteDir to $RemoteUrl on branch $Branch"
  Write-Host 'Enable GitHub Pages in repository Settings > Pages, source: Deploy from a branch, branch: main, folder: /root.'
} finally {
  Pop-Location
}
