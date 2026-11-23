# Gawing APK ang Audit Dashboard (via GitHub)

Hindi mo kailangan ng Android Studio o computer na malakas — GitHub ang gagawa ng APK.

## A. Gumawa ng GitHub account at repo
1. Pumunta sa https://github.com at mag-sign up / log in.
2. Click **+** (taas-kanan) → **New repository**.
3. Repository name: `audit-dashboard`
4. Piliin ang **Private** (nasa loob ng repo ang signing key ng app, huwag gawing public).
5. Huwag lagyan ng check ang "Add a README". Click **Create repository**.

## B. I-upload ang mga file
Sa bagong repo, click **uploading an existing file**, tapos i-drag ang LAHAT ng laman ng
`apk-project` folder (i-unzip muna ang `apk-project.zip`):

- `www/index.html`  ← ang dashboard mo
- `package.json`
- `capacitor.config.json`
- `.gitignore`
- `app-debug.keystore`
- `scripts/patch-gradle.py`
- `resources/README.txt`
- `.github/workflows/build-apk.yml`  ← **importante**

Tip: kapag hindi tumatanggap ng folder na nagsisimula sa tuldok (`.github`) ang phone/browser mo,
gamitin ang **Add file → Create new file**, i-type `.github/workflows/build-apk.yml` bilang pangalan,
at i-paste ang laman ng file.

Click **Commit changes**.

## C. Hintayin ang build (mga 4–7 minuto)
1. Buksan ang tab na **Actions** sa repo.
2. Makikita mo ang "Build Android APK" na tumatakbo (dilaw). Hintayin maging ✅ berde.
   Kung ❌ pula, buksan ang run, kopyahin ang error sa pulang step at ipadala sa akin.
3. Kung hindi kusang tumakbo: Actions → **Build Android APK** → **Run workflow**.

## D. I-download ang APK
Dalawang paraan:
- **Mabilis:** Actions → i-click ang pinakabagong run → sa baba, **Artifacts** → `AuditedAccounts-APK`
  (zip ito; i-extract para makuha ang `AuditedAccounts.apk`).
- **Mas madali sa phone:** gumawa ng Release. Sa repo: **Releases → Create a new release** →
  Tag: `v1.0` → **Create new tag** → Publish. Pagkatapos ng build, lalabas ang
  `AuditedAccounts.apk` sa Release; i-tap lang para i-download.

## E. I-install sa Android
1. Ilipat/i-download ang APK sa phone.
2. I-tap ang file. Kapag hinihingi, payagan ang **Install unknown apps** para sa browser/Files app.
3. I-tap **Install**. (Kung may "Play Protect" warning, piliin **Install anyway** — normal ito sa app na hindi galing Play Store.)
4. Buksan ang **Audited Accounts**, ilagay ang Web app URL sa Settings kung hindi pa naka-set.

## F. Pag-update ng app sa susunod
1. Palitan ang `www/index.html` sa GitHub (open file → ✏️ edit, o Upload na may parehong pangalan).
2. Commit → awtomatikong gagawa ng bagong APK (Actions).
3. I-install ang bagong APK **sa ibabaw** ng luma. Hindi mawawala ang data/pending edits
   dahil pareho ang signing key (`app-debug.keystore`).
   Para tumaas ang version number para sa update, palitan ang `versionCode 1` sa
   `scripts/patch-gradle.py` kung kailangan (hindi kailangan para sa sideload).

## G. Opsyonal: sariling icon
Maglagay ng `icon.png` (1024×1024) sa folder na `resources/`, i-commit. Awtomatikong gagawa ng icon ang build.

## Mga dapat tandaan
- Ito ay **debug-signed APK** para sa personal/internal na gamit (hindi para sa Play Store).
- Kailangan pa rin ng internet para mag-sync sa Google Sheet; gumagana pa rin ang offline queue.
- Ang mga feature na gumagamit ng browser download/share (export/save file, `navigator.share`,
  `window.open`) ay minsan iba ang kilos sa loob ng Android WebView. Kapag may hindi gumana
  (hal. export), sabihin sa akin kung alin at aayusin ko gamit ang Capacitor plugins.
