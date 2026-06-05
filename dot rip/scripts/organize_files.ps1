param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$folders = @{
  '.pdf' = 'pdf_downloads'
  '.csv' = 'csv_data'
  '.html' = 'html_outputs'
  '.htm' = 'html_outputs'
}

foreach ($folder in $folders.Values | Select-Object -Unique) {
  $target = Join-Path $rootPath $folder
  if (-not (Test-Path -LiteralPath $target)) {
    New-Item -ItemType Directory -Path $target | Out-Null
  }
}

$files = Get-ChildItem -LiteralPath $rootPath -File | Where-Object {
  $folders.ContainsKey($_.Extension.ToLowerInvariant())
}

foreach ($file in $files) {
  $destDir = Join-Path $rootPath $folders[$file.Extension.ToLowerInvariant()]
  $dest = Join-Path $destDir $file.Name

  if (Test-Path -LiteralPath $dest) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $ext = $file.Extension
    $i = 1
    do {
      $dest = Join-Path $destDir ("{0}_{1}{2}" -f $base, $i, $ext)
      $i++
    } while (Test-Path -LiteralPath $dest)
  }

  Move-Item -LiteralPath $file.FullName -Destination $dest
}

Get-ChildItem -LiteralPath $rootPath -Directory |
  Where-Object { $_.Name -in @('pdf_downloads', 'csv_data', 'html_outputs') } |
  ForEach-Object {
    [PSCustomObject]@{
      Folder = $_.Name
      Count = (Get-ChildItem -LiteralPath $_.FullName -File | Measure-Object).Count
    }
  } |
  Format-Table -AutoSize
