# Auth setup — passwordless email OTP

CALE uses **email OTP** (8-digit code from Supabase). No password or confirmation link required in the app.

---

## 1. Supabase email template (required)

OTP emails use the **Magic Link** template (not Confirm signup).

1. Set up **custom SMTP** in Supabase (e.g. [Resend](https://resend.com) — free tier works).
   - **Project Settings → Authentication → SMTP**
2. Open **Authentication → Email Templates → Magic Link**
3. Switch to **Source** and paste [`email-templates/magic-link-otp.html`](./email-templates/magic-link-otp.html):

```html
<h2>Your CALE sign-in code</h2>

<p>Enter this code in the app to sign in:</p>

<p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">
  {{ .Token }}
</p>

<p style="color: #666; font-size: 14px;">
  This code expires in 1 hour.
</p>
```

Important: use `{{ .Token }}` for the code. If the template uses `{{ .ConfirmationURL }}`, users get a link instead of a code.

4. **Authentication → Providers → Email**
   - Enable Email provider
   - You can **disable Confirm email** (not needed for OTP sign-in)

---

## 2. URL configuration (optional for OTP)

OTP is entered in the app, so deep links are not required for sign-in. You can leave Site URL as your project default or `cale://auth/callback` if you use Google Sign-In.

---

## 3. Google Sign-In

See [GOOGLE_SIGNIN.md](./GOOGLE_SIGNIN.md). Play Store builds need the **Play App Signing** SHA-1 in Google Cloud.

---

## App flow

1. User enters email → **Continue**
2. Supabase emails 8-digit code
3. User enters code → **Verify code**
4. Session created; app opens

Resend is limited to once every 60 seconds (Supabase default).

---

## Checklist

- [ ] Custom SMTP configured in Supabase
- [ ] Magic Link template uses `{{ .Token }}`
- [ ] Confirm email disabled (optional)
- [ ] Play App Signing SHA-1 in Google Cloud (if using Google Sign-In on Play Store)
