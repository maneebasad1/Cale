# Google Sign-In setup for Calo

Google Sign-In needs configuration in **Google Cloud**, **Supabase**, and the **app**.

---

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Go to **APIs & Services → OAuth consent screen**
   - Choose **External** (or Internal for workspace)
   - Fill app name, support email, save
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**

Create **three** OAuth clients:

### A) Web application (required)
- **Application type:** Web application
- **Authorized redirect URIs:** add your Supabase callback URL:
  ```
  https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
  ```
  (Find exact URL in Supabase → Authentication → Providers → Google)

Copy the **Client ID** → this is `GOOGLE_WEB_CLIENT_ID` in `src/config/supabase.ts`

### B) iOS (for iPhone app)
- **Application type:** iOS
- **Bundle ID:** `com.caloapp`

Copy the **Client ID** → `GOOGLE_IOS_CLIENT_ID` in `src/config/supabase.ts`

### C) Android (for Android app)
- **Application type:** Android
- **Package name:** `com.cale`
- **SHA-1 certificate fingerprint:** get debug SHA-1:
  ```bash
  keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
  Copy the **SHA-1** line into Google Cloud.

---

## 2. Supabase Dashboard

1. **Authentication → Providers → Google**
2. Turn **Enable Sign in with Google** ON
3. Paste from Google Cloud **Web application** client:
   - **Client ID**
   - **Client Secret**
4. Save

The trigger in `schema.sql` still creates a profile row when a new user signs up (email or Google).

---

## 3. App config

Edit `src/config/supabase.ts`:

```typescript
export const GOOGLE_WEB_CLIENT_ID = '123456789-xxxx.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '123456789-yyyy.apps.googleusercontent.com';
```

Use the **Web** client ID for `GOOGLE_WEB_CLIENT_ID` (not the iOS/Android one).

---

## 4. iOS URL scheme (required for Google on iPhone)

1. Take your **iOS Client ID**, e.g.  
   `123456789-abcd.apps.googleusercontent.com`
2. Reverse it for the URL scheme:  
   `com.googleusercontent.apps.123456789-abcd`
3. In Xcode → **CalTrack** target → **Info** → **URL Types** → add:
   - **URL Schemes:** `com.googleusercontent.apps.123456789-abcd`

Or add to `ios/CalTrack/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.YOUR_IOS_CLIENT_PREFIX</string>
    </array>
  </dict>
</array>
```

---

## 5. Rebuild native apps

```bash
cd ios && pod install && cd ..
npm run ios
# or
npm run android
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `DEVELOPER_ERROR` on Android | Wrong SHA-1 or package name in Google Cloud |
| iOS opens Google then fails | Missing URL scheme in Info.plist |
| `Invalid token` in Supabase | Web Client ID must match what Supabase Google provider uses |
| No Google button in app | Set `GOOGLE_WEB_CLIENT_ID` in `supabase.ts` |

After setup, the auth screen shows **Continue with Google** below the email form.
