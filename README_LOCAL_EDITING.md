# GDOT_RIP Local Editing Guide

This folder is the working package for the GDOT_RIP dashboard.

## Current Structure

- `site/` is the live GDOT_RIP dashboard source used for hosting. It is not a separate Git project.
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
- The project should be managed from this folder as one GDOT_RIP project. Do not keep a nested `.git` folder inside `site/`.

## Notes

- Keep only one dashboard HTML: `site/index.html`.
- `index.html` at this folder root redirects to `site/` for GitHub Pages root access.
- The old `html_outputs/` folder is not required in the current hosted flow.

## Local Preview

Run from the GDOT_RIP project folder:

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

## Git Project

Use this folder as the single local project for GDOT_RIP. The `site/` folder is only the static website source that GitHub Pages deploys.

If this folder is still inside a larger Desktop repository, avoid also tracking `site/` as its own repository. Keeping both creates multiple project entries that all point to the same GDOT_RIP work.
