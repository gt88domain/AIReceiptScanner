# Native Email Verification with ngrok

This guide explains how to test the native sign-up email verification flow on a real device or iOS simulator by exposing your local server through `ngrok`.

## Why `localhost` does not work

When the native app signs up a user, the server sends an email verification link that looks like this:

```text
http://localhost:3001/api/auth/verify-email?token=...&callbackURL=easystarter-native%3A%2F%2F%2Fcallback
```

That link is correct for local server development, but it does not work from a phone email client because:

- `localhost:3001` points to the phone itself, not your computer
- the email verification link must be reachable from outside your machine
- the verification endpoint must redirect back to the native app scheme after success

To fix this, expose your local server with an HTTPS tunnel and make both the server and the native app use the same public URL.

## Important: Expo Go vs development build

Before testing this flow, make sure you understand the runtime difference:

### Expo Go

Expo Go is fine for:

- UI development
- basic API debugging
- form testing

Expo Go is usually **not suitable** for this email verification callback flow because:

- your project uses a custom app scheme: `easystarter-native://`
- Expo Go does not register your app's custom scheme as a native installed app
- tapping `easystarter-native:///callback` from Mail or Safari usually cannot reopen your project inside Expo Go

### `npx expo run:ios`

`npx expo run:ios` is the recommended option for this scenario because it:

- builds and installs your app as a native iOS app
- registers the custom scheme from `app.json`
- allows `easystarter-native:///callback` to open the installed app
- behaves much closer to a production auth callback flow

If you need to validate the full email verification redirect, prefer `npx expo run:ios` over Expo Go.

## Prerequisites

- The local server runs on port `3001`
- The native app runs through Expo
- You have an ngrok account
- You installed the ngrok CLI
- For iOS callback testing, you use `npx expo run:ios` or another development build

## 1. Start the local server

From the repo root:

```bash
pnpm dev:server
```

Confirm the server is available locally at:

```text
http://localhost:3001
```

## 2. Start an ngrok tunnel

If this is your first time using ngrok, add your auth token first:

```bash
ngrok config add-authtoken <your-ngrok-token>
```

Then expose port `3001`:

```bash
ngrok http 3001
```

ngrok will print a public HTTPS URL similar to:

```text
https://abc123.ngrok-free.app
```

Use the HTTPS URL, not the HTTP URL.

## 3. Update the server development URL

Edit `apps/server/.dev.vars` and update `SERVER_URL`:

```env
SERVER_URL=https://abc123.ngrok-free.app
```

Keep `WEBSITE_URL` as-is unless you also need to expose the web app.

## 4. Update the native app API URL

Edit `apps/native/.env.local` and update `EXPO_PUBLIC_SERVER_API_URL`:

```env
EXPO_PUBLIC_SERVER_API_URL=https://abc123.ngrok-free.app
```

This ensures:

- the native app sends sign-up requests to the public ngrok URL
- the server generates verification emails with the same public base URL
- the verification endpoint can redirect back to `easystarter-native:///callback`

## 5. Start the native app

Choose one of the following options.

### Option A: Recommended for email callback testing

Use a native iOS build:

```bash
cd apps/native
npx expo run:ios
```

Use this option when you need to verify that tapping the email link returns to the app through:

```text
easystarter-native:///callback
```

### Option B: Expo Go

Use Expo Go only if you want to test general app flows:

```bash
cd apps/native
pnpm dev
```

or:

```bash
cd apps/native
npx expo start --lan
```

If local network discovery is unstable, try:

```bash
cd apps/native
npx expo start --tunnel
```

Do not rely on Expo Go to validate the final `easystarter-native:///callback` redirect.

## 6. Restart processes after env changes

Environment files are only read on startup, so restart all affected processes after changing env values.

At minimum, restart:

```bash
pnpm dev:server
```

And restart either:

```bash
cd apps/native
npx expo run:ios
```

or:

```bash
cd apps/native
pnpm dev
```

If Expo is already running, stop it fully and start it again.

## 7. Test the full verification flow

1. Open the native app on a real device or iOS simulator
2. Register with a new email address
3. Open the verification email
4. Tap the verification link
5. Verify that the link opens the public ngrok URL first
6. Verify that the browser redirects back into the native app via `easystarter-native:///callback`

## Expected verification URL shape

After the configuration change, the email link should look like this:

```text
https://abc123.ngrok-free.app/api/auth/verify-email?token=...&callbackURL=easystarter-native%3A%2F%2F%2Fcallback
```

That is the correct shape for native email verification.

## Troubleshooting

### The email still contains `http://localhost:3001`

Check the following:

- `apps/server/.dev.vars` contains the ngrok HTTPS URL
- you restarted `pnpm dev:server`
- the running server process is the one using the updated env file

### The native app still calls `http://localhost:3001`

Check the following:

- `apps/native/.env.local` contains the ngrok HTTPS URL
- you restarted Expo after editing the env file
- the app bundle was rebuilt with the updated environment variable

### Tapping `easystarter-native:///callback` does not open the app

Check the following:

- you are using `npx expo run:ios` or another development build
- you are not relying on Expo Go for custom scheme callback testing
- the app scheme is still `easystarter-native`
- the native app is installed and can handle `easystarter-native:///callback`
- the Better Auth Expo integration is enabled in both the server and the native client

### The browser opens the verification page but does not return to the app

Check the following:

- the verification URL contains `callbackURL=easystarter-native%3A%2F%2F%2Fcallback`
- the installed app matches the configured scheme
- the app was rebuilt after native configuration changes

### The ngrok domain changed

Free ngrok domains often change when you restart the tunnel. When that happens, update both files again:

- `apps/server/.dev.vars`
- `apps/native/.env.local`

Then restart both processes.

## Files involved

- `apps/server/.dev.vars`
- `apps/native/.env.local`
- `apps/server/src/lib/auth.ts`
- `apps/native/lib/auth/auth.client.ts`
- `apps/native/configs/app-config.ts`
- `apps/native/app.json`

## Summary

For native email verification, `localhost` only works for requests made from your own machine. Email links must use a public URL that the phone can open. Using `ngrok` gives your local server a public HTTPS address, which allows the verification link to work end-to-end and still redirect back into the native app. For the callback step itself, use `npx expo run:ios` or another development build instead of Expo Go.
