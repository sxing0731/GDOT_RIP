param(
  [string]$SiteDir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'site')
)

$ErrorActionPreference = 'Stop'

$indexPath = Join-Path $SiteDir 'index.html'
if (-not (Test-Path -LiteralPath $indexPath)) {
  throw "Could not find $indexPath"
}

$cssDir = Join-Path $SiteDir 'assets\css'
$jsDir = Join-Path $SiteDir 'assets\js'
$dataDir = Join-Path $SiteDir 'assets\data'
New-Item -ItemType Directory -Force -Path $cssDir, $jsDir, $dataDir | Out-Null

$html = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8

$styleMatch = [regex]::Match($html, '(?s)<style>\s*(.*?)\s*</style>')
if (-not $styleMatch.Success) {
  throw 'Could not find inline <style> block.'
}

$scriptMatches = [regex]::Matches($html, '(?s)<script(?!\s+type="application/json").*?>\s*(.*?)\s*</script>')
if ($scriptMatches.Count -ne 1) {
  throw "Expected one application script block, found $($scriptMatches.Count)."
}

$jsonMatches = [regex]::Matches($html, '(?s)<script\s+type="application/json"\s+id="([^"]+)">\s*(.*?)\s*</script>')
if ($jsonMatches.Count -eq 0) {
  throw 'Could not find inline JSON data blocks.'
}

$css = $styleMatch.Groups[1].Value.Trim()
$js = $scriptMatches[0].Groups[1].Value.Trim()

$themeSwitchMarkup = @'
<button id="themeToggle" class="theme-toggle" type="button" role="switch" aria-checked="true" aria-label="Switch theme">
        <span class="theme-label theme-label-day">Day</span>
        <span class="theme-track" aria-hidden="true"><span class="theme-thumb"></span></span>
        <span class="theme-label theme-label-night">Night</span>
      </button>
'@

foreach ($jsonMatch in $jsonMatches) {
  $id = $jsonMatch.Groups[1].Value
  $json = $jsonMatch.Groups[2].Value.Trim()
  Set-Content -LiteralPath (Join-Path $dataDir "$id.json") -Value $json -Encoding UTF8
}

$loader = @'
let onlineData = [];
let defsData = [];
let usMapPaths = [];

async function loadDashboardData() {
  const [online, defs, mapPaths] = await Promise.all([
    fetch("assets/data/onlineData.json").then(r => r.json()),
    fetch("assets/data/defsData.json").then(r => r.json()),
    fetch("assets/data/usMapPaths.json").then(r => r.json())
  ]);
  onlineData = online;
  defsData = defs;
  usMapPaths = mapPaths;
}
'@

$js = [regex]::Replace(
  $js,
  '^\s*const onlineData = JSON\.parse\(document\.getElementById\("onlineData"\)\.textContent\);\s*const defsData = JSON\.parse\(document\.getElementById\("defsData"\)\.textContent\);\s*const usMapPaths = JSON\.parse\(document\.getElementById\("usMapPaths"\)\.textContent\);',
  $loader.Trim()
)

$js = [regex]::Replace(
  $js,
  '\s*init\(\);\s*$',
  @'

loadDashboardData()
  .then(init)
  .catch(err => {
    console.error("Failed to load dashboard data", err);
    document.body.insertAdjacentHTML("afterbegin", "<p class=\"data-error\">Could not load local dashboard data.</p>");
  });
'@
)

$js = $js.Replace(
  'if (btn) btn.textContent = isDark ? "Day Theme" : "Dark Theme";',
  @'
if (btn) {
        btn.classList.toggle("is-night", isDark);
        btn.classList.toggle("is-day", !isDark);
        btn.setAttribute("aria-checked", String(isDark));
      }
'@.Trim()
)
$js = $js.Replace('applyTheme(localStorage.getItem("dotRipTheme") || "day");', 'applyTheme(localStorage.getItem("dotRipTheme") || "dark");')

$css = $css.Replace(
  '.theme-toggle { min-height:34px; border:1px solid var(--line); border-radius:5px; padding:7px 11px; background:var(--blue2); color:var(--ink); font-weight:700; cursor:pointer; white-space:nowrap; }',
  @'
.theme-toggle { min-height:34px; border:1px solid var(--line); border-radius:999px; padding:5px 8px; background:var(--blue2); color:var(--ink); font-weight:700; cursor:default; white-space:nowrap; display:inline-flex; align-items:center; gap:8px; }
    .theme-label { font-size:12px; line-height:1; color:var(--muted); min-width:32px; text-align:center; }
    .theme-track { width:42px; height:22px; border-radius:999px; background:var(--line); position:relative; box-shadow:inset 0 0 0 1px rgba(0,0,0,.08); }
    .theme-thumb { position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:var(--panel); box-shadow:0 1px 4px rgba(0,0,0,.28); transition:transform .18s ease; }
    .theme-toggle.is-day .theme-label-day, .theme-toggle.is-night .theme-label-night { color:var(--ink); }
    .theme-toggle.is-night .theme-track { background:var(--blue); }
    .theme-toggle.is-night .theme-thumb { transform:translateX(20px); }
'@.Trim()
)
$css = $css.Replace(
  '      .button-cell { grid-column:auto; } main { padding:10px; } header { padding:14px; }',
  @'
      .button-cell { grid-column:auto; } main { padding:10px; } header { padding:14px; }
      .header-inner { align-items:stretch; flex-direction:column; }
      .theme-toggle { align-self:flex-start; }
'@.TrimEnd()
)

Set-Content -LiteralPath (Join-Path $cssDir 'site.css') -Value $css -Encoding UTF8
Set-Content -LiteralPath (Join-Path $jsDir 'app.js') -Value $js -Encoding UTF8

$html = $html.Remove($styleMatch.Index, $styleMatch.Length).Insert($styleMatch.Index, '<link rel="stylesheet" href="assets/css/site.css" />')
$html = [regex]::Replace($html, '(?s)<button\s+id="themeToggle".*?</button>', $themeSwitchMarkup.Trim())

$jsonMatches = [regex]::Matches($html, '(?s)<script\s+type="application/json"\s+id="([^"]+)">\s*(.*?)\s*</script>')
for ($i = $jsonMatches.Count - 1; $i -ge 0; $i--) {
  $match = $jsonMatches[$i]
  $id = $match.Groups[1].Value
  $replacement = "<script type=""application/json"" id=""$id"" src=""assets/data/$id.json""></script>"
  $html = $html.Remove($match.Index, $match.Length).Insert($match.Index, $replacement)
}

$scriptMatches = [regex]::Matches($html, '(?s)<script(?!\s+type="application/json").*?>\s*(.*?)\s*</script>')
$html = $html.Remove($scriptMatches[0].Index, $scriptMatches[0].Length).Insert($scriptMatches[0].Index, '<script src="assets/js/app.js"></script>')

Set-Content -LiteralPath $indexPath -Value $html -Encoding UTF8

Write-Host "Localized site assets under $SiteDir"
