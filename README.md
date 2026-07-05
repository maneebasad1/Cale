# Calo (CalTrack)

**Calo** is a React Native calorie-tracking app that helps you set a personalized daily calorie target, log meals, and review your progress over time. All data is stored locally on the device.

**Tagline:** Track calories. Hit your goals.

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
  - [Onboarding](#onboarding)
  - [Home (Today)](#home-today)
  - [Add & edit entries](#add--edit-entries)
  - [Food search & database](#food-search--database)
  - [My Foods](#my-foods)
  - [History](#history)
  - [Day detail](#day-detail)
  - [Settings](#settings)
  - [Calorie target calculation](#calorie-target-calculation)
- [Navigation](#navigation)
- [Data & storage](#data--storage)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)

---

## Overview

Calo guides new users through a 5-step onboarding flow to calculate a personalized daily calorie target based on body metrics, activity level, and weight goals. After setup, the main app provides:

- A **Home** dashboard for today's intake vs. target
- **Food logging** via search, custom foods, or manual calorie entry
- A **calendar history** with color-coded days
- **Settings** to update profile and recalculate targets

The app works offline for core features. Optional USDA FoodData Central search requires an API key and network access.

---

## Features

### Onboarding

A one-time, 5-step wizard shown until the user completes setup:

| Step | Screen | What you enter |
|------|--------|----------------|
| 1 | **Body metrics** | Weight (kg or lb), height (cm or ft/in) |
| 2 | **About you** | Age, gender (male / female) |
| 3 | **Activity** | Activity level (sedentary → extra active) |
| 4 | **Your goal** | Lose or gain weight, goal weight |
| 5 | **Summary** | Review maintenance calories, daily deficit/surplus, daily target, and estimated weekly weight change |

On completion, the profile is saved locally and the main app unlocks. Unit preferences (kg/lb, cm/ft-in) are stored with the profile.

### Home (Today)

The default tab after onboarding:

- **Brand header** with quick link to **My Foods**
- **Today's date** display
- **Progress bar** — consumed vs. daily target, remaining or over calories
- **Today's log** — entries grouped by meal (breakfast, lunch, dinner, snack)
- **Pull to refresh** to reload data
- **FAB (+)** to add a new entry for today
- **Edit / delete** entries via icon actions (with delete confirmation)

### Add & edit entries

Opened from Home, History day detail, or when editing an existing entry.

| Field | Options |
|-------|---------|
| **Date** | Shown in header (today or selected history date) |
| **Meal** | Breakfast, lunch, dinner, snack (chip selector) |
| **Log mode** | **Pick food** — search and select from database · **Custom kcal** — enter calories manually |
| **Food search** | Debounced search across custom foods, built-in database, and USDA (when configured) |
| **Calories** | Auto-filled from selected food; adjustable for portion changes. Manual entry in custom mode |

**Add your own food** inline from the search screen without leaving the flow.

Saving creates or updates a `CalorieEntry` with meal type, calories, optional food name/id/serving, and entry mode. Cancel returns without saving.

### Food search & database

Search merges three sources (deduplicated by name, up to 30 results):

1. **My Foods** — user-saved custom foods (highest priority)
2. **Built-in Asian foods** — ~72 offline items across regions: Chinese, Japanese, Korean, Indian, Thai, Vietnamese, Filipino, Middle Eastern, and general
3. **USDA FoodData Central** — live API search (Foundation + SR Legacy) when an API key is set and query is 2+ characters

Empty search shows a default slice of built-in foods. Results show name, region/source, serving size, and calories.

### My Foods

Manage a personal food library:

- **Add** custom foods (name, calories, optional serving label)
- **Edit** existing saved foods
- **Delete** with confirmation
- **Pull to refresh**

Saved foods appear in search when logging meals and are tagged **My food** in results.

### History

Calendar view of past and current days:

- **Color-coded days** — green = at or under daily target, red = over target
- **Daily calorie totals** shown on each day cell
- **Today** highlighted with a border
- **Future dates** disabled (cannot log ahead)
- **Legend** explaining color coding and target value
- **Tap a day** to open day detail

### Day detail

View any past or current day:

- Date, progress bar, and status badge (under / at / over target, or no entries)
- Full entry list grouped by meal
- **Add**, **edit**, and **delete** entries (disabled for future dates)
- **FAB (+)** to add entries for that date

### Settings

Update profile and recalculate targets:

- **Current daily target** summary card (target, deficit/surplus, maintenance)
- **Weight** — kg or lb toggle with live unit conversion
- **Height** — cm or ft/in toggle with live unit conversion
- **Age**, **gender**, **goal** (lose / gain), **goal weight**
- **Activity level** — same 5 options as onboarding
- **Save changes** — validates inputs, recalculates BMR/maintenance/target, shows confirmation alert

Validation includes: required fields, goal weight must be below current weight for loss and above for gain.

### Calorie target calculation

Uses the **Mifflin–St Jeor** equation:

- **BMR** from weight (kg), height (cm), age, and gender
- **Maintenance** = BMR × activity multiplier (1.2 – 1.9)
- **Calorie adjustment** from goal weight gap (~7,700 kcal per kg), capped weekly change rates
- **Daily target** = maintenance + adjustment, floored at **1,500 kcal (male)** or **1,200 kcal (female)**
- **Weekly weight change estimate** shown on onboarding summary

---

## Navigation

```
Root
├── Onboarding (if not complete)
│   ├── BodyMetrics → PersonalInfo → Activity → Goal → Summary
└── Main (if complete)
    ├── Tabs
    │   ├── Home
    │   ├── History
    │   │   ├── HistoryCalendar
    │   │   └── DayDetail
    │   └── Settings
    ├── AddEntry (modal stack)
    └── MyFoods (modal stack)
```

Bottom tabs: **Home**, **History**, **Settings**. Add entry and My Foods are stack screens over the tab navigator.

---

## Data & storage

All persistence uses **AsyncStorage** (local device only — no cloud sync).

| Key | Contents |
|-----|----------|
| `@caltrack/profile` | `UserProfile` — body metrics, goals, calculated targets, unit prefs, onboarding flag |
| `@caltrack/logs` | `Record<date, DailyLog>` — calorie entries keyed by `YYYY-MM-DD` |
| `@caltrack/custom-foods` | `FoodItem[]` — user-created foods |

**CalorieEntry** fields: id, meal type, calories, timestamp, entry mode (`food` \| `custom`), optional food name/id/serving label.

Empty days are removed from the logs store when the last entry is deleted.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.86, React 19 |
| Language | TypeScript |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| Storage | `@react-native-async-storage/async-storage` |
| Calendar | `react-native-calendars` |
| Icons | `react-native-vector-icons` |
| Keyboard | `react-native-keyboard-aware-scroll-view` |
| Food API | USDA FoodData Central (optional) |

**Platforms:** iOS and Android.

---

## Project structure

```
src/
├── components/       # UI building blocks (buttons, lists, forms, onboarding)
├── config/           # USDA API configuration
├── constants/        # Theme, branding
├── context/          # App-wide profile / onboarding state
├── data/             # Built-in Asian foods database
├── hooks/            # Navigation helpers, keyboard height
├── navigation/       # Root, main, onboarding navigators
├── screens/          # Feature screens by area
├── services/         # Storage, food search, custom foods
├── types/            # Shared TypeScript types
└── utils/            # BMR, dates, unit conversion
```

---

## Getting started

### Prerequisites

- Node.js **≥ 22.11.0**
- React Native environment — [Set up your environment](https://reactnative.dev/docs/set-up-your-environment)

### Install

```sh
npm install
```

**iOS** — install CocoaPods dependencies:

```sh
cd ios && bundle exec pod install && cd ..
```

### Run

```sh
# Start Metro
npm start

# Android (separate terminal)
npm run android

# iOS (separate terminal)
npm run ios
```

---

## Configuration

### USDA FoodData Central (optional)

To enable live USDA food search, add a free API key in `src/config/usda.ts`:

1. Sign up at [USDA API key signup](https://fdc.nal.usda.gov/api-key-signup.html)
2. Set `USDA_API_KEY` in `src/config/usda.ts`

If the key is empty, the app still works using built-in Asian foods and My Foods only.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro bundler |
| `npm run android` | Build and run on Android |
| `npm run ios` | Build and run on iOS |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |

---

## Meal types

- Breakfast
- Lunch
- Dinner
- Snack

## Activity levels

| Level | Description |
|-------|-------------|
| Sedentary | Little or no exercise |
| Lightly active | Light exercise 1–3 days/week |
| Moderately active | Moderate exercise 3–5 days/week |
| Very active | Hard exercise 6–7 days/week |
| Extra active | Very hard exercise & physical job |

## Goals

- **Lose weight** — eat below maintenance toward a lower goal weight
- **Gain weight** — eat above maintenance toward a higher goal weight
