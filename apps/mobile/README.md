# QuickNotes Android beta

Expo SDK **58** · React Native **0.88** · React **19.3** · package ID `site.quicknotes.app.staging` · Android minimum API **24**. This is a private staging build. Production ID remains the proposed `site.quicknotes.app` and must be checked by the release owner before a production APK is created.

## Local setup

- Node.js 22.13+ and pnpm 10.34.9 (use the root lockfile).
- JDK 17, Android SDK Platform 37, Platform Tools (`adb`), Build Tools 37.0.0, NDK 27.1.12297006, and CMake 3.22.1. Connect an Android device or start an emulator for runtime checks.
- Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_ORIGIN` to the HTTPS staging app origin. For existing Quick Notes accounts, point a local test build at the canonical deployed API, `https://www.quicknotes.site`. Use an isolated staging database for creating test accounts. Restart Metro after changing the URL.
- From the repository root: `pnpm install --frozen-lockfile`, then `pnpm --filter @quicknotes/mobile start`.

## Test on Android with Expo Go

Install [Expo Go for SDK 58](https://expo.dev/go?device=true&platform=android&sdkVersion=58) on your phone. Connect it to the same Wi-Fi as the computer and run this from the repository root.

```sh
pnpm --filter @quicknotes/mobile exec expo start --go --lan
```

Scan Metro’s QR code inside Expo Go. If the first launch shows the developer menu, tap **Continue**, then close the menu to reach the editor. Guest mode works without an API origin. If the phone cannot reach Metro over Wi-Fi, stop the LAN server and rerun the command with `--tunnel` in place of `--lan`.

## Development and checks

```sh
pnpm --filter @quicknotes/mobile lint
pnpm --filter @quicknotes/mobile typecheck
pnpm dlx expo-doctor apps/mobile
pnpm --filter @quicknotes/mobile exec expo export --platform android --output-dir .expo-export
```

On Node.js 22.15 or newer, run `node --test apps/mobile/storage.test.mjs tests/cloud-*.test.mjs` from the repository root. The export command checks Metro's Android bundle without requiring an Android SDK. Use `pnpm --filter @quicknotes/mobile android` only with an installed emulator/device and Android SDK.

## Backend requirements

Apply `drizzle/0003_note_revisions.sql` via the normal migration command before deploying the updated API. The root app runs Better Auth `expo()` on the existing auth instance, keeping `nextCookies()` last. The server trusts `quicknotes-staging://` for the APK. To test Expo Go against a deployed staging API, set `QUICKNOTES_EXPO_GO_ORIGIN` on that API to the exact `exp://host:port` shown by Metro, then redeploy that API. Expo Go supplies that address instead of the APK scheme. A build without an API origin can open and export guest notes. The mobile client uses the existing `/api/auth` endpoint, Better Auth's Expo client, and SecureStore; account note calls forward the stored cookie only to the configured HTTPS API origin, omit ambient credentials, and reject redirects. The API also checks that the caller’s expected account matches the authenticated session.

Notes calls use the shared revision contract:

- `GET /api/notes` returns summaries with positive numeric revisions; `GET /api/notes/:id` returns the full snapshot.
- `PUT /api/notes/:id` sends `{ content, baseRevision }`; `null` creates, a number updates.
- `DELETE /api/notes/:id?baseRevision=N` is explicit and revision checked.
- Conflicts remain drafts on device; the user can keep a local copy or explicitly use the cloud snapshot.
- Cloud save never runs in the background. Guest and account drafts live in separate SQLite scopes.

## Data and privacy

SQLite stores local content, revisions, local edit sequences, and cached bodies. SecureStore stores only Better Auth session material. Android backup is disabled so account-scoped SQLite data cannot be restored without its device credentials. Export writes UTF-8 Markdown or plain text into the app cache and opens Android's share sheet. Password recovery opens the existing `/forgot-password` page in the browser.

## Local signed APK

A signed, bundled release APK is built locally; no Expo account or paid service is needed. Create and protect a **separate staging** keystore. Keep an encrypted backup outside this repository. Never reuse the staging key for production.

```sh
cd apps/mobile
keytool -genkeypair -v -keystore quicknotes-staging.keystore -alias quicknotes-staging \
  -keyalg RSA -keysize 2048 -validity 10000
export QUICKNOTES_ANDROID_KEYSTORE="$PWD/quicknotes-staging.keystore"
export QUICKNOTES_ANDROID_STORE_PASSWORD='…'
export QUICKNOTES_ANDROID_KEY_ALIAS='quicknotes-staging'
export QUICKNOTES_ANDROID_KEY_PASSWORD='…'
pnpm build:apk
```

The config plugin requires all four variables and wires them into generated Gradle release signing. It does not write passwords into generated files. The APK is `android/app/build/outputs/apk/release/app-release.apk`. Verify locally with `apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk`; record SHA-256, signing certificate, app ID, version code/name, size, Android SDK requirements, and build commit before sharing the beta. Increase `android.versionCode` for each in-place update using the same staging key. Set signing values only in the current shell or a protected secret manager. The ignored keystore file must never be committed.

Before building from a fresh checkout, run `pnpm install --frozen-lockfile`; `pnpm build:apk` runs `expo prebuild --clean` so native files are reproducibly generated from app config and the signing plugin. A local build requires JDK/Android SDK even though Metro export does not.

## Local verification

The SDK 58 upgrade passed an Android Expo Go smoke test covering launch, draft creation, Markdown preview, note switching, and opening a draft saved under SDK 55.

The earlier SDK 55 guest test APK was built and verified with Android Build Tools. On an Android 16 emulator, the APK installed, edited a note in airplane mode, restored it after a force-stop, opened Markdown preview and the plain-text export share sheet, and preserved the draft across a same-key update from version code 1 to 2. The web API also passed an isolated Postgres integration test for web signup, Expo-origin login, account matching, competing writes, delete, and restore.

## Beta checks still required

Use a physical Android device to verify standalone install and launch, restart persistence, an account created on web, cloud round-trip, guest import, offline draft/export, force-stop after “Saved on device,” and same-key update. Record model, Android version, build version, staging origin, install source, and results. Also test large text/TalkBack, keyboard selection and Back, previews and links, conflict/save races, session expiry, and A-to-B account switching. No staging credentials, hosted APK, or production release are included in this repository work.
