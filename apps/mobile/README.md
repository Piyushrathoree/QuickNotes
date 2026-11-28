# Quick Notes for Android

Expo SDK **58** · React Native **0.88** · React **19.3** · package ID `site.quicknotes.app` · Android minimum API **24**. The app keeps the `quicknotes-staging://` scheme for compatibility with the deployed account API.

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

A signed, bundled release APK can be built locally without an Expo account. Use the existing release keystore for updates. For a first release, create a dedicated key with a unique password and keep an encrypted backup outside this repository.

```sh
pnpm install --frozen-lockfile
EXPO_PUBLIC_API_ORIGIN=https://www.quicknotes.site pnpm --filter @quicknotes/mobile build:apk
```

Load `QUICKNOTES_ANDROID_KEYSTORE` (absolute path), `QUICKNOTES_ANDROID_KEY_ALIAS`, `QUICKNOTES_ANDROID_STORE_PASSWORD`, and `QUICKNOTES_ANDROID_KEY_PASSWORD` into the build environment before running the commands. Keep signing credentials outside Git. The APK is `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`. Verify it with `apksigner verify --print-certs` and record the file's SHA-256, package ID, version, and source commit. Increase `android.versionCode` for each in-place update and sign it with the same key.

The build command regenerates the Android project with `expo prebuild --clean`. Install the verified `quicknote.apk` on a phone before publishing it as a GitHub release asset. To enable the website download, set `QUICKNOTES_ANDROID_APK_URL` to the published HTTPS asset URL and redeploy the web app.

## Local verification

The SDK 58 upgrade passed an Android Expo Go smoke test covering launch, draft creation, Markdown preview, note switching, and opening a draft saved under SDK 55.

The earlier SDK 55 guest test APK was built and verified with Android Build Tools. On an Android 16 emulator, the APK installed, edited a note in airplane mode, restored it after a force-stop, opened Markdown preview and the plain-text export share sheet, and preserved the draft across a same-key update from version code 1 to 2. The web API also passed an isolated Postgres integration test for web signup, Expo-origin login, account matching, competing writes, delete, and restore.

## Device checks before publishing

Use a physical Android device to verify standalone install and launch, restart persistence, an account created on web, cloud round-trip, guest import, offline draft/export, and same-key updates. Also test large text/TalkBack, keyboard selection and Back, previews and links, conflict/save races, session expiry, and account switching.
