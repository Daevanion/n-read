# Spare

Spare scans a folder on your computer and sorts it into three piles:

- **Optional** — caches, reinstallable dependencies, build output, logs, junk files, and extra copies of a file. These are the ones that are usually safe to remove.
- **Review** — installers, archives, large media, and downloads that have been sitting for 90 days or more.
- **Keep** — documents, source code, version history, and anything Spare does not recognize.

Nothing is deleted until you select it and type `remove`. Files labeled Keep cannot be deleted from Spare.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The first view is a sample closet of placeholder files, so you can practice before pointing Spare at a real folder. Use Home, Downloads, or Desktop, or paste any folder path. System folders such as `/usr` and `/etc` are refused.

Restore the sample with the button on the page after you delete from it.

## How a label is chosen

Optional:

- Cache directories such as `.cache`, `__pycache__`, and `Caches` inside `Library` or `AppData`
- `node_modules`, virtual environments, and `site-packages`
- `.next`, and `dist` / `build` / `coverage` / `out` only when a project file sits beside them
- `target` only beside Cargo or Maven/Gradle files
- Logs, `.tmp` / `.bak` files, and `.DS_Store`
- A later identical copy of a file (the older copy stays)

Review:

- Installers (`.dmg`, `.exe`, `.msi`, `.pkg`, and similar)
- Archives and disk images
- Video at least 50 MB, audio at least 30 MB, images at least 25 MB
- Other files in Downloads that have not been touched for 90 days

A folder named `build` or `Caches` in your documents is left alone. Unrecognized files stay in Keep.

## Tests

```bash
npm test
```
