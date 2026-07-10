# CALE — Features & Design

> **CALE** (repo: CalTrack) is a React Native calorie-tracking app built around a local-first architecture, personalized daily targets, and a warm food-inspired design system called **Nori & Saffron**.

**Tagline:** *Track what you eat. Hit your goals.*

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Core Features](#core-features)
3. [Navigation & Screens](#navigation--screens)
4. [Design System](#design-system)
5. [User Flows](#user-flows)
6. [Data & Architecture](#data--architecture)
7. [Platform Features](#platform-features)
8. [Tech Stack](#tech-stack)

---

## Product Overview

CALE helps users log what they eat, stay within a personalized calorie target, and review progress over time. The app is designed to feel calm and food-forward — not like a clinical diet tracker.

| Attribute | Detail |
|-----------|--------|
| **Platforms** | iOS & Android (React Native) |
| **Architecture** | Local-first — writes to device storage immediately, syncs to cloud in the background |
| **Backend** | Supabase (auth, profiles, entries, custom foods, weight history) |
| **Offline** | Core logging, targets, and built-in food database work without network |
| **Entry point** | `App.tsx` → Auth → Onboarding → Main tabs |

---

## Core Features

### Authentication

- **Email & password** — sign in and sign up via Supabase Auth
- **Google Sign-In** — native OAuth via `@react-native-google-signin/google-signin`, exchanged for a Supabase session
- **Sign out** — clears Google session and local entity store
- **Delete account** — two-step confirmation; calls `delete_own_account()` RPC to remove all user data and the auth record
- **Setup gate** — if Supabase is not configured, shows setup instructions instead of the auth form

### Onboarding (5-step wizard)

New users complete a guided setup that calculates their daily calorie target.

| Step | Screen | What it collects |
|------|--------|------------------|
| 1 | Body Metrics | Weight (kg/lb), height (cm/ft-in) |
| 2 | Personal Info | Age, gender (male/female) |
| 3 | Activity | Activity level (5 options) |
| 4 | Goal | Goal type — lose, gain, or **maintain** — plus goal weight |
| 5 | Summary | Review targets, estimated weekly change, confirm |

**Target calculation** uses the Mifflin–St Jeor BMR formula with activity multipliers:

| Activity level | Multiplier |
|----------------|------------|
| Sedentary | 1.2 |
| Lightly active | 1.375 |
| Moderately active | 1.55 |
| Very active | 1.725 |
| Extra active | 1.9 |

Calorie adjustment is based on ~7,700 kcal per kg of body weight change, with capped weekly rates. Minimum daily floors: **1,500 kcal** (male), **1,200 kcal** (female). Maintain-goal users get a target equal to maintenance calories with zero adjustment.

### Home — Today Dashboard

The primary screen for daily tracking.

- **Progress ring** — signature circular calorie indicator (see [Design System](#progress-ring))
- **Streak badge** — consecutive days with at least one logged entry
- **7-day average** — trailing calorie average for context
- **Weight check-in banner** — prompts when no weight has been logged in 7+ days
- **Today's entries** — grouped by meal (breakfast, lunch, dinner, snack)
- **My Foods shortcut** — quick access to saved custom foods
- **FAB (+)** — add a new entry
- **Pull-to-refresh** — triggers sync queue drain
- **Sync status indicator** — compact pending/attention state

### Food Logging

Flexible entry creation with two modes:

| Mode | Description |
|------|-------------|
| **Food** | Search and select from the food database |
| **Custom** | Manually enter calories |

Additional logging features:

- **Meal chip selector** — breakfast, lunch, dinner, snack
- **Multi-food add** — select multiple foods in one save (non-edit mode)
- **Quick calorie chips** — preset buttons for fast manual entry
- **Frequent foods row** — surfaces commonly logged items for one-tap re-log
- **Inline custom food creation** — navigate to Add Custom Food and return with prefilled data
- **Edit & delete** — modify or remove existing entries
- **Meal reminder cancellation** — logging a meal today cancels that meal's reminder notification

### Food Database

Three-tier search with deduplication by food name (case-insensitive):

| Source | Priority | Details |
|--------|----------|---------|
| **My Foods** | Highest | User-saved custom foods, unlimited |
| **Built-in Asian foods** | Medium | 72 items across Chinese, Japanese, Korean, Indian, Thai, Vietnamese, Filipino, Middle Eastern, and general categories |
| **USDA FoodData Central** | Lowest | Live API search (≥2 chars, Foundation + SR Legacy, max 30 merged results) when API key is configured |

Users can manage custom foods from **My Foods** — view, add, and delete saved items.

### History & Analytics

Two views for reviewing past days:

**Calendar view**
- Color-coded days: nori green (on/under target), chili red (over target)
- Daily calorie totals on each cell
- Today highlighted; future dates disabled
- Tap a day to open day detail

**Summary view**
- Week or month period stats
- Bar chart (`CalorieBarChart`) and summary panel (`HistorySummaryPanel`)
- Average, total, and on-target day counts

**Day detail**
- Full entry list for a selected date
- Add, edit, or delete entries
- **Copy day** — copy all entries from a past day to today

### Profile & Settings

The Profile tab replaces a traditional settings screen. Sub-screens:

| Screen | Purpose |
|--------|---------|
| Profile Home | Avatar, name, email, daily target, sync status, navigation menu |
| Body | Weight, height, age, gender, activity — recalculates targets on save |
| Goals | Goal type and goal weight |
| Weight | Log, view, and delete weight history; updates profile weight |
| Notifications | Per-meal reminder toggles and test notification |

Account actions (sign out, delete account) live on Profile Home with confirmation dialogs.

### Streaks

Tracks consecutive days with at least one logged calorie entry. If today has no entries yet, the streak counts backward from yesterday.

### Weight Tracking

- One weight entry per day (upsert by date)
- Weekly check-in prompt on the Home screen
- Weight history with delete support
- Synced to Supabase `weight_entries` table

### Meal Reminders

Powered by **Notifee** (`@notifee/react-native`).

| Meal | Default time |
|------|--------------|
| Breakfast | 8:00 AM |
| Lunch | 12:30 PM |
| Dinner | 7:00 PM |

- Per-meal enable/disable toggles
- Test notification support
- Android notification channel: `calo-daily-reminder`
- Preferences stored in profile as `mealReminders` JSONB and synced to Supabase
- Reminders auto-cancel when the corresponding meal is logged that day

### Cloud Sync (Local-first)

All data writes follow the same pattern:

```
User action → AsyncStorage (immediate) → Sync queue → Supabase (background)
```

| Behavior | Detail |
|----------|--------|
| **Conflict policy** | Last-write-wins via client UUID upserts |
| **Drain triggers** | Every 45 seconds, on app foreground, on network reconnect |
| **Hydration** | Pulls remote data when local store is empty for an authenticated user |
| **User switch** | Clears local cache when a different user signs in |
| **Status states** | `synced` · `pending` · `needsAttention` (after 10 failed retries) |

Core logging works fully offline. Sync requires authentication and network.

### Android Home Screen Widget

**"CALE Today"** — a resizable home screen widget showing:

- Calories left or over target
- Eaten vs. target
- Current streak
- Today's date

The widget adapts to size (tiny, wide-short with side panel, tall stacked layout) and shifts to chili red when over target. Tapping opens the app on the Home screen.

> iOS does not have a widget implementation. The JS bridge no-ops on non-Android platforms.

---

## Navigation & Screens

```
RootNavigator
├── Auth                    → AuthScreen
├── Onboarding              → OnboardingNavigator
│   ├── BodyMetrics
│   ├── PersonalInfo
│   ├── Activity
│   ├── Goal
│   └── Summary
└── Main                    → MainNavigator
    ├── Tabs (bottom tabs)
    │   ├── Home            → HomeScreen
    │   ├── History         → HistoryNavigator
    │   │   ├── HistoryCalendar
    │   │   └── DayDetail { date }
    │   └── Profile         → ProfileNavigator
    │       ├── ProfileHome
    │       ├── ProfileBody
    │       ├── ProfileGoals
    │       ├── ProfileWeight
    │       └── ProfileNotifications
    ├── AddEntry { date, entryId?, prefillFood? }
    ├── AddCustomFood { selectOnSave?, returnDate?, returnEntryId? }
    └── MyFoods
```

**App flow:** Auth → Onboarding (if incomplete) → Main

**Tab icons:** Home, Calendar, Person (Ionicons)

**Total screens:** 17 across auth, onboarding, home, entry, foods, history, and profile.

---

## Design System

### Philosophy — "Nori & Saffron"

CALE's visual identity draws from warm food tones. The palette avoids generic fitness-green and alarm-red diet aesthetics in favor of nori green, saffron gold, and chili oil red — colors that feel natural in a food context.

- **Warm surfaces** — steam gray background, porcelain white cards
- **Editorial typography** — Source Serif 4 for display, DM Sans for UI
- **Progress as food metaphor** — the ring reads like looking down into a filling bowl
- **Semantic color shifts** — nori (on track) → saffron (near target) → chili (over target)

### Color Palette

| Token | Hex | Role |
|-------|-----|------|
| `primary` / `nori` | `#317F36` | Brand green, on-track progress, success |
| `primaryLight` | `#3D9A44` | Lighter brand green |
| `primaryDark` | `#27662C` | Darker brand green |
| `saffron` / `warning` | `#D9A21B` | Accent, near-target state (~90–100%) |
| `background` / `steam` | `#F3F2EF` | App background |
| `surface` / `porcelain` | `#FFFFFF` | Cards, headers |
| `text` / `ink` | `#1C1B19` | Primary text |
| `textSecondary` / `stone` | `#8A8680` | Secondary text, captions |
| `border` / `line` | `#E5E3DE` | Dividers, borders |
| `error` / `chili` | `#C2512A` | Over target, destructive actions |
| `chipBg` / `noriMute` | `#E8F3E9` | Muted green backgrounds |
| `saffronMute` | `#F8F0D8` | Muted gold backgrounds |
| `chiliMute` | `#F8E8E0` | Muted red backgrounds |

**Android splash screen:** `#317F36` (brand green)

### Typography

Two font families, loaded from `assets/fonts/`:

| Style | Font | Size / Line Height | Usage |
|-------|------|-------------------|-------|
| `hero` | Source Serif 4 Bold | 40 / 48 | Large display moments |
| `display` | Source Serif 4 Bold | 28 / 34 | Screen titles |
| `title` | Source Serif 4 Semibold | 22 / 28 | Section headings |
| `heading` | DM Sans Semibold | 18 / 24 | Subsection headings |
| `body` | DM Sans Regular | 16 / 22 | Body copy |
| `bodyMedium` | DM Sans Medium | 16 / 22 | Emphasized body |
| `label` | DM Sans Semibold | 14 / 18 | Form labels, buttons |
| `caption` | DM Sans Medium | 13 / 18 | Supporting text |
| `overline` | DM Sans Semibold | 12 / 16 | Uppercase labels |

### Spacing & Radii

**Spacing scale**

| Token | Value |
|-------|-------|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `xxl` | 40 |

**Border radii**

| Token | Value |
|-------|-------|
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 20 |
| `pill` / `full` | 999 |

### Progress Ring

The signature UI element on the Home screen. A thick circular ring (default 216px, 16px stroke) that fills as calories are consumed.

| State | Threshold | Color |
|-------|-----------|-------|
| **Under** | < 90% of target | Nori green `#317F36` |
| **Near** | 90–100% of target | Saffron gold `#D9A21B` |
| **Over** | > 100% of target | Chili red `#C2512A` |

Center text shows calories remaining (or over). Respects system reduce-motion settings.

### Component Library

| Component | Purpose |
|-----------|---------|
| `Button` | Primary and secondary actions, loading state |
| `Screen` | Safe-area screen wrapper |
| `KeyboardAwareScreen` | Scrollable screen with keyboard avoidance |
| `BrandLogo` / `BrandLoader` | Brand mark and loading indicator |
| `ProgressRing` | Circular calorie progress |
| `ProgressBar` | Linear progress indicator |
| `FabButton` | Floating action button (+) |
| `EntryList` | Meal-grouped entry list |
| `MealChipSelector` | Meal type chip row |
| `FoodSearchList` | Searchable food results |
| `FrequentFoodsRow` | Quick re-log row |
| `QuickCalorieChips` | Preset calorie buttons |
| `LabeledInput` | Form input with label |
| `UnitToggle` | kg/lb and cm/ft-in unit switcher |
| `ConfirmDialog` | Modal confirmation |
| `EmptyState` | Empty list placeholder |
| `StreakBadge` | Streak count display |
| `WeightCheckInBanner` | Weekly weight prompt |
| `SyncStatusIndicator` | Sync pending/attention badge |
| `Icon` / `TabIcon` | Ionicons wrapper |

**Onboarding components:** `OnboardingHeader`, `OnboardingFooter`, `OnboardingProgress`, `FormSection`, `SelectionCard`

**History components:** `CalorieBarChart`, `HistorySummaryPanel`

**Profile components:** `ProfileMenuRow`, `UserAvatar`, `MealReminderCard`

### Icons

Ionicons via `react-native-vector-icons`. Tab bar uses Home, Calendar, and Person icons.

### App Icon

White **CALE** wordmark on brand green (`#317F36`). Asset: `assets/images/cale-icon.png`.

---

## User Flows

### First-time user

```
Launch app
  → Sign up (email or Google)
  → Onboarding wizard (5 steps)
  → Summary confirms targets
  → Home screen — start logging
```

### Daily logging

```
Home → tap FAB (+)
  → Select meal type
  → Search food OR enter custom calories
  → Save entry
  → Home updates (ring, streak, entry list)
  → Widget snapshot refreshes (Android)
```

### Review past week

```
History tab → Calendar view
  → Tap a day → Day detail
  → View/edit/delete entries
  → Optional: Copy day to today

History tab → Summary view
  → Toggle week/month
  → Review bar chart and averages
```

### Update goals

```
Profile tab → Body or Goals
  → Edit values
  → Save → targets recalculated
  → Synced to cloud
```

### Weight check-in

```
Home banner appears (7+ days since last log)
  → Tap banner → Profile Weight
  → Log weight → profile weight updated
```

---

## Data & Architecture

### Local Storage Keys

| Key | Contents |
|-----|----------|
| `@caltrack/profile` | `UserProfile` |
| `@caltrack/logs` | `Record<date, DailyLog>` |
| `@caltrack/custom-foods` | `FoodItem[]` |
| `@caltrack/weight-entries` | `WeightEntry[]` |
| `@caltrack/sync-queue` | `SyncQueueItem[]` |
| `@caltrack/hydrated-user-id` | Last hydrated Supabase user ID |

### Data Models

**CalorieEntry**
```typescript
{
  id: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  timestamp: string
  entryMode?: 'food' | 'custom'
  foodName?: string
  foodId?: string
  servingLabel?: string
}
```

**UserProfile**
```typescript
{
  weightKg: number
  heightCm: number
  age: number
  gender: 'male' | 'female'
  activityLevel: ActivityLevel
  maintenanceCalories: number
  goalType: 'lose' | 'gain' | 'maintain'
  goalWeightKg: number
  calorieAdjustment: number
  dailyTargetCalories: number
  weightUnit: 'kg' | 'lb'
  heightUnit: 'cm' | 'ft'
  onboardingComplete: boolean
  mealReminders?: MealReminders
  lastWeightPromptDate?: string
}
```

**FoodItem**
```typescript
{
  id: string
  name: string
  calories: number
  servingLabel: string
  region: FoodRegion
  source: 'builtin' | 'custom' | 'usda'
  sourceRef?: string
}
```

**WeightEntry**
```typescript
{
  id: string
  date: string        // YYYY-MM-DD
  weightKg: number
}
```

### Supabase Schema

| Table | Key columns | Notes |
|-------|-------------|-------|
| `profiles` | Body stats, goals, targets, units, `onboarding_complete`, `meal_reminders` JSONB | One row per user, RLS enforced |
| `calorie_entries` | `log_date`, `meal_type`, `calories`, `entry_mode`, food fields | Linked to `user_id` |
| `custom_foods` | `name`, `calories`, `serving_label` | User-created foods |
| `weight_entries` | `log_date`, `weight_kg` | Unique per user + date |

**Database functions:**
- `handle_new_user()` — creates a default profile on signup
- `delete_own_account()` — cascades delete of all user data and auth record

### External APIs

| API | Purpose | Config |
|-----|---------|--------|
| Supabase Auth + REST | Authentication and cloud storage | `src/config/supabase.ts` |
| USDA FoodData Central | Food search | `src/config/usda.ts` — optional `USDA_API_KEY` |
| Google OAuth | Native sign-in | `src/services/googleAuth.ts` |

---

## Platform Features

### Android

| Feature | Detail |
|---------|--------|
| Package name | `com.cale` |
| Home widget | `CaleHomeWidgetProvider` — "CALE Today", resizable, 30-min update period |
| Widget bridge | Native module `WidgetBridge.updateSnapshot()` → SharedPreferences |
| Widget colors | Matches JS theme (`android/app/src/main/res/values/colors.xml`) |
| Splash | `#317F36` |
| Notifications | Notifee channel `calo-daily-reminder` |
| Google Sign-In | Requires SHA-1 fingerprint + package `com.cale` in Google Cloud Console |

### iOS

| Feature | Detail |
|---------|--------|
| Bundle ID | `com.caloapp` |
| Display name | `CALE` |
| Widget | Not implemented |
| Google Sign-In | Requires URL scheme in `Info.plist` |
| CocoaPods | Managed via `ios/Podfile` |

### Cross-platform

- Local-first offline core (logging, targets, built-in foods)
- USDA search requires network + API key
- Supabase sync requires auth + network
- Meal reminders via Notifee on both platforms
- Status bar: dark content on white surface

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.86 |
| UI | React 19 |
| Language | TypeScript 5.8 |
| Navigation | React Navigation 7 (native-stack + bottom-tabs) |
| Backend | Supabase (`@supabase/supabase-js`) |
| Local storage | AsyncStorage |
| Auth | Supabase Auth + Google Sign-In |
| Notifications | Notifee |
| Network detection | `@react-native-community/netinfo` |
| Calendar | `react-native-calendars` |
| Date picker | `@react-native-community/datetimepicker` |
| Icons | `react-native-vector-icons` (Ionicons) |
| Testing | Jest |
| Linting | ESLint + Prettier |
| Node | ≥ 22.11.0 |

### Project Structure

```
CalTrack/
├── App.tsx                     # Root component
├── assets/
│   ├── fonts/                  # Source Serif 4, DM Sans
│   └── images/cale-icon.png
├── src/
│   ├── components/             # UI component library
│   ├── config/                 # Supabase, USDA config
│   ├── constants/              # theme.ts, branding.ts
│   ├── context/                # Auth, App, Sync providers
│   ├── data/                   # Built-in Asian foods (72 items)
│   ├── hooks/                  # Navigation helpers
│   ├── lib/                    # Supabase client
│   ├── navigation/             # Navigators and route types
│   ├── screens/                # 17 screens
│   ├── services/               # Storage, sync, food, auth, widgets
│   ├── types/                  # Shared TypeScript types
│   └── utils/                  # BMR, dates, units, streak, stats
├── supabase/
│   ├── schema.sql
│   ├── README.md
│   └── GOOGLE_SIGNIN.md
├── android/                    # Kotlin, widget, Gradle
└── ios/                        # Swift, Xcode project
```

---

*Last updated: July 2026*
