# Horticulture Wage Tracker

A lightweight installable web app for Mac and iPhone.

## Features
- Add workers and default wages
- Record daily horticulture work
- Automatic weekly totals
- Supervisor totals for Ajith and Dad
- Paid and pending tracking
- Edit and delete entries
- Export CSV
- JSON backup and restore
- Offline support after first load

## Run locally on Mac
1. Open Terminal in this folder.
2. Run: `python3 -m http.server 8080`
3. Open `http://localhost:8080` in Chrome or Safari.

## Install on iPhone
The app must be hosted on an HTTPS website. Open it in Safari, tap Share, then **Add to Home Screen**.

## Data storage
Data is saved inside the browser on each device. Use Backup Data and Restore Data to move records between devices. For automatic syncing, connect the app to a cloud database such as Firebase or Supabase.
