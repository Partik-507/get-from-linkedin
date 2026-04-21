# Packaging VivaVault — Desktop & Mobile

This guide explains how to ship VivaVault as a real **desktop app** (Windows / macOS / Linux) and a **native mobile app** (Play Store / App Store).

> The web app already runs offline thanks to the service worker (`public/sw.js`) and IndexedDB persistence. The packaging steps below wrap that same web build inside a native shell.

---

## 1. Desktop App (Electron)

**What you get:** A real `.exe` (Windows), `.app` (macOS) or `.AppImage` (Linux) that launches like any installed program and works fully offline once first opened.

### One-time setup (already done in this repo)
- ✅ `vite.config.ts` builds with relative paths (required for `file://` loading inside Electron).
- ✅ `electron/main.cjs` — main process file.
- ✅ `capacitor.config.ts` — already in repo (used for mobile, see §2).

### Steps to build on **your own machine**

> Lovable's sandbox cannot ship `.exe` files. You must run these on your local Windows / macOS / Linux machine.

1. Click **GitHub → Connect to GitHub** in the Lovable top-right, then push.
2. Clone the repo locally and run:
   ```bash
   npm install
   npm install --save-dev electron @electron/packager
   npm run build
   ```
3. Add this to your local `package.json` `scripts`:
   ```json
   "electron": "electron electron/main.cjs",
   "electron:package:win":   "npx @electron/packager . VivaVault --platform=win32  --arch=x64 --out=electron-release --overwrite",
   "electron:package:mac":   "npx @electron/packager . VivaVault --platform=darwin --arch=x64 --out=electron-release --overwrite",
   "electron:package:linux": "npx @electron/packager . VivaVault --platform=linux  --arch=x64 --out=electron-release --overwrite"
   ```
4. Test it: `npm run electron`
5. Package it for your OS:
   ```bash
   npm run electron:package:win   # produces electron-release/VivaVault-win32-x64/VivaVault.exe
   ```
6. Distribute the resulting folder (zip it, or wrap in an installer with `electron-builder` later).

### Cross-compiling
`@electron/packager` can target other OSes from any machine by changing `--platform`. macOS `.dmg` requires a real Mac.

---

## 2. Mobile App (Capacitor → Play Store / App Store)

**What you get:** A native Android `.apk`/`.aab` and iOS `.ipa` you can submit to the stores. The same React UI runs inside a `WebView`, with full access to native phone features through Capacitor plugins.

### One-time setup (already done in this repo)
- ✅ `capacitor.config.ts` with appId `app.lovable.04520665efff45e69c707c0c38ad61d2`.
- ✅ Hot-reload pointed at the Lovable preview URL (so you can iterate live on your phone while developing).

### Steps to build on **your own machine**

1. **Export to GitHub** from Lovable, then clone locally.
2. Install Capacitor + the platforms you want:
   ```bash
   npm install
   npm install @capacitor/core
   npm install --save-dev @capacitor/cli
   npm install @capacitor/android @capacitor/ios
   ```
3. Build the web bundle:
   ```bash
   npm run build
   ```
4. Add the native platforms (only the first time):
   ```bash
   npx cap add android
   npx cap add ios          # macOS only
   ```
5. Sync your latest web build into the native projects:
   ```bash
   npx cap sync
   ```
6. Run on a device or emulator:
   ```bash
   npx cap run android      # needs Android Studio
   npx cap run ios          # needs Xcode (macOS only)
   ```
7. Open the native project in its IDE to produce a release build for the store:
   ```bash
   npx cap open android     # → Android Studio → Build → Generate Signed Bundle/APK
   npx cap open ios         # → Xcode → Product → Archive
   ```

### Re-syncing after changes
Every time you `git pull` updates from Lovable:
```bash
npm install
npm run build
npx cap sync
```

### Going to production
For a real store-ready build, **remove or comment out** the `server.url` line in `capacitor.config.ts` so the app loads the bundled `dist/` instead of the Lovable preview URL.

---

## 3. Offline support

Both desktop & mobile builds inherit the web app's offline stack:
- `public/sw.js` — service worker caches HTML/CSS/JS.
- IndexedDB — used by Notes OS, Focus Mode assets, Canvas, and Resources.
- `localStorage` — UI preferences (theme, dock position, etc).

No additional configuration is required for offline mode to work in either packaged target.

---

## 4. Read more
- Lovable's official guide: https://lovable.dev/blog/2025-03-25-native-mobile-apps-with-capacitor
- Capacitor docs: https://capacitorjs.com/docs
- Electron Packager: https://github.com/electron/packager
