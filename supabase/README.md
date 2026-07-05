# Supabase setup for Calo

1. Create a project at https://supabase.com
2. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
3. Paste them into `src/config/supabase.ts`
4. Open **SQL Editor** in Supabase and run the full contents of `supabase/schema.sql`
5. In **Authentication → Providers**, ensure Email is enabled
6. Rebuild the app: `npm run ios` or `npm run android`

## Data stored in Supabase

| Table | Contents |
|-------|----------|
| `profiles` | Body stats, goals, daily target, reminder settings |
| `calorie_entries` | Meal logs |
| `custom_foods` | User-saved foods |
| `weight_entries` | Weekly weight check-ins |

All tables use Row Level Security so each user only sees their own data.

## Auth flow

`Auth` → `Onboarding` (first time) → `Main`

Sign out from **Profile → Account**.
