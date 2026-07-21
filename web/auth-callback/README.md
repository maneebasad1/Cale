# CALE auth redirect page

Supabase’s built-in email cannot use a custom template unless you set up **custom SMTP**.  
This page is a free workaround: the confirmation email opens this HTTPS page in the browser, then it redirects into the CALE app.

## Deploy (about 2 minutes)

### Option A — Netlify Drop (easiest)

1. Open [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire `web/auth-callback` folder onto the page
3. Copy your site URL, e.g. `https://random-name-123.netlify.app`
4. Your redirect URL is: `https://random-name-123.netlify.app/` (trailing slash optional)

### Option B — GitHub Pages

1. Create a repo and upload `index.html`
2. Enable Pages (Settings → Pages → deploy from branch)
3. URL will be like `https://youruser.github.io/repo-name/`

## After deploy

1. Paste the URL into `AUTH_WEB_REDIRECT_URL` in `src/config/supabase.ts`
2. In **Supabase → Authentication → URL Configuration**:
   - **Site URL** = your deployed HTTPS URL (same as above)
   - **Redirect URLs** = add that URL and `cale://**`
3. Rebuild the app and send a **new** confirmation email

## Flow

```
Email link → Supabase verify → your HTTPS page → cale://auth/callback → CALE app
```

No custom SMTP required.
