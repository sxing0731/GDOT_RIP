# Local Editing Guide

This folder is organized so the dashboard can be edited and republished locally.

## Main Folders

- `site/` is the GitHub Pages-ready website.
- `site/index.html` is the page shell.
- `site/assets/css/site.css` contains the dashboard styles.
- `site/assets/js/app.js` contains the dashboard JavaScript.
- `site/assets/data/onlineData.json` contains the dashboard data.
- `outputs/` stores generated deliverables (PPTX/XLSX/CSV/HTML) that were previously in the folder root.
- `extracts/` stores extracted text artifacts (state risk page extracts and scoring candidate lists).
- `scripts/` contains repeatable local PowerShell scripts.
- `pdf_downloads/` contains downloaded PDF sources.
- `csv_data/` contains CSV datasets and audit files.
- `html_outputs/` contains original HTML exports.

## Useful Commands

Run these commands from this project folder in PowerShell.

```powershell
.\scripts\organize_files.ps1
```

Rebuild `site/` from the original HTML export and split CSS, JS, and JSON into editable local files:

```powershell
.\scripts\prepare_site.ps1
```

Preview the site locally:

```powershell
.\scripts\preview_site.ps1
```

Then open `http://localhost:8000/`.

Publish the `site/` folder to an existing GitHub repository:

```powershell
.\scripts\publish_github_pages.ps1 -RemoteUrl "https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git"
```

After pushing, enable GitHub Pages in GitHub:

`Settings > Pages > Deploy from a branch > main > /root`
