# Local Editing Guide

This folder is the working package for the DOT RIP dashboard.

## Current Structure

- `site/` is the live dashboard source used for hosting.
- `site/index.html` is the only HTML page to keep for the dashboard.
- `site/assets/css/site.css` contains styles.
- `site/assets/js/app.js` contains dashboard logic.
- `site/assets/data/` contains JSON data used by the page.
- `outputs/` stores generated deliverables (PPTX/XLSX/CSV).
- `extracts/` stores extracted text artifacts (state risk page extracts and scoring candidate lists).
- `pdf_downloads/` stores downloaded plan PDFs.
- `csv_data/` stores audit/source CSV files.
- `scripts/` stores helper PowerShell scripts.
- `.github/workflows/pages.yml` deploys GitHub Pages via GitHub Actions.

## Notes

- Keep only one dashboard HTML: `site/index.html`.
- `index.html` at this folder root redirects to `site/` for GitHub Pages root access.
- The old `html_outputs/` folder is not required in the current hosted flow.

## Local Preview

Run from this project folder:

```powershell
.\scripts\preview_site.ps1
```

Then open `http://localhost:8000/`.

## Optional Maintenance Scripts

Organize loose root files by extension:

```powershell
.\scripts\organize_files.ps1
```

Rebuild `site/` from a source export HTML (legacy workflow):

```powershell
.\scripts\prepare_site.ps1
```

## GitHub Pages

This repo is configured for GitHub Actions deployment (not branch-folder deployment).

In GitHub:

- `Settings > Pages > Build and deployment > Source = GitHub Actions`

## Sync To GDOT_RIP (dot rip folder only)

From the parent repo root (`C:\Users\xings\Desktop`), after committing changes:

```powershell
git subtree split --prefix="dot rip" main
git push gdot <SPLIT_COMMIT>:main --force
```

Where `gdot` points to `https://github.com/sxing0731/GDOT_RIP.git`.
