# LWLUP — Powerlifting Club Platform

> Full-stack web application for LWL UP powerlifting club. Built for competitive athletes and coaches — training program management, competition tracking, and team administration in one place.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages & Features](#pages--features)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [Role System](#role-system)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment](#deployment)

---

## Overview

LWLUP is a full-stack platform built for the Croatian powerlifting club LWL UP. It serves two audiences simultaneously:

**Public visitors** can browse the club's team, athlete stats, and competition history without an account.

**Athletes** log in to access their personalized training program — structured in blocks, weeks, and individual workout days. They log actual weights and RPE against coach-prescribed targets, and track their progress in real time.

**Administrators (coaches)** have a dedicated panel to manage all athletes, build and duplicate training programs, assign target RPE and coaching notes per exercise, write private athlete notes, and manage competitions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Inline styles + CSS-in-JS (`<style>` blocks) |
| Icons | Lucide React |
| Animation | Lottie React (scroll-to-top button) |
| Fonts | Custom via CSS variables `--fm` (body), `--fd` (display) |
| Deployment | Vercel (recommended) |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Home / Landing page
│   ├── auth/
│   │   └── page.tsx              # Login / Register
│   ├── training/
│   │   └── page.tsx              # Athlete training program dashboard
│   ├── admin/
│   │   ├── page.tsx              # Admin panel (coach dashboard)
│   │   └── competitions-manager.tsx  # Competition CRUD component
│   ├── team/
│   │   └── page.tsx              # Public team page with athlete stats
│   ├── competitions/
│   │   └── page.tsx              # Public competitions page
│   ├── profile/
│   │   └── page.tsx              # Athlete profile & personal stats
│   ├── survey/
│   │   └── page.tsx              # Onboarding survey for new athletes
│   ├── 403/
│   │   └── page.tsx              # Access denied page
│   ├── not-found.tsx             # Custom 404 page
│   └── components/
│       ├── Navbar.tsx            # Transparent / solid navigation bar
│       ├── Footer.tsx            # Site footer
│       └── big_three.tsx         # Interactive SBD technique analysis component
├── lib/
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       └── server.ts             # Server-side Supabase client
├── middleware.ts                 # Route protection + role enforcement
public/
├── slike/                        # Athlete photos, logo, hero images
└── animations/                   # Lottie JSON files
```

---

## Pages & Features

### `/` — Home / Landing

Editorial-style landing page with:
- Animated hero slideshow with motivational quotes
- Club stats (lifters, records, European competitions, founding year)
- Interactive **SBD Lifts** section — click any of the three powerlifting disciplines (Squat, Bench Press, Deadlift) to open a full-screen modal with annotated technique photos, interactive hotspots, and biomechanical coaching points
- "Powerlifting explained" educational section
- Diagonal founders section (Walter Smajlović & Luka Grežina with achievements)
- Online coaching feature overview
- Animated network canvas background
- `textGlow` CTA — "OSTAVI SVOJ TRAG"
- Scroll-to-top button with Lottie animation

### `/team` — Team Page

Public-facing athlete roster pulled live from the `athlete_stats` table:
- Filter by gender (SVI / MUŠKARCI / ŽENE)
- Dynamic club stats calculated in real time (max total, combined total, top GLP)
- Athlete cards with photo, IPF weight class, SBD totals, GLP score, Instagram link, and achievement highlights
- `fadeInUp` CSS animation on grid (no JS opacity — prevents the disappearing bug on mobile)

### `/competitions` — Competitions

Public competition history and calendar:
- Year filter pills (auto-generated from database dates)
- Status filter — Svi / Nadolazeća / Završena
- Countdown timer for upcoming competitions
- Athlete result cards with SQ/BP/DL totals, placement, and trophy color-coding (gold/silver/bronze)
- Auto-selects the current year on load

### `/training` — Athlete Training Dashboard *(protected)*

The core athlete-facing tool, with a strict role split:

**Both roles:**
- View training blocks, weeks, and workout days
- Weekly day-grid overview showing completion status at a glance
- Expand any workout to see the full exercise table

**Lifters (read-only on structure):**
- Cannot add/remove blocks, weeks, days, or exercises
- Log `actual_weight_kg` and `actual_rpe` per exercise
- Write a personal `actual_note` per exercise
- Mark exercises and workouts as completed
- RPE color feedback: green (at or below target), yellow (+1), red (+2 or more)
- See coach notes displayed inline below the exercise name

**Admins only:**
- Create, rename, duplicate, and switch training blocks
- Add/remove weeks, workout days, and exercises
- Set `planned_sets`, `planned_reps`, `planned_weight_kg`, `planned_tempo`, `planned_rest_seconds`
- Set `target_rpe` (goal RPE for the lifter to hit)
- Write `coach_note` per exercise (displayed to the lifter as an instruction)

### `/admin` — Admin Panel *(admin role required)*

Full coach dashboard:

**Dashboard view:**
- Summary stats — total athletes, active blocks, total notes
- Athlete grid — avatar circles with active block name, block count, note count
- Search bar to filter athletes
- User management mode — toggle to change roles or delete users

**Athlete detail view (click any athlete card):**
- Three tabs: **Program** / **Statistike** / **Bilješke**
- Program tab: full training program builder (same component as `/training` but with `isAdmin=true`)
  - Block switcher with status indicators
  - **Duplicate block** — copy an entire block structure (weeks, workouts, exercises) to any other athlete
  - New block creation
- Statistics tab: block history, progress bar, completion counts
- Notes tab: admin writes timestamped notes per athlete; lifter can read these as coaching feedback

### `/auth` — Authentication

Login and registration page using Supabase Auth. Redirects authenticated users to `/training`.

---

## Database Schema

All tables have Row Level Security (RLS) enabled.

### `profiles`
Extends Supabase `auth.users`. Stores display name and role.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (FK → auth.users) | Primary key |
| `full_name` | text | Display name |
| `role` | text | `'admin'` or `'lifter'` |
| `created_at` | timestamptz | Auto |

### `athlete_stats`
Public athlete data for the `/team` page.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | Full name |
| `nickname` | text | Optional |
| `img` | text | Path to photo in `/public/slike/` |
| `category` | text | IPF weight class e.g. `M-93kg` |
| `squat`, `bench`, `deadlift`, `total` | numeric | Competition bests (kg) |
| `glp` | numeric | IPF GL Points score |
| `highlights` | text[] | Achievement strings |
| `instagram` | text | Profile URL |
| `is_active` | boolean | Show on team page |
| `display_order` | integer | Sort order |

### `competitions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | Competition name |
| `date` | date | |
| `location` | text | City, Country |
| `status` | text | `announced` / `ongoing` / `completed` |
| `description` | text | |
| `results_url` | text | External results link |

### `competition_athletes`
M:N join between competitions and athletes with result columns.

| Column | Type | Notes |
|---|---|---|
| `competition_id` | uuid FK | → competitions |
| `athlete_id` | uuid FK | → athlete_stats |
| `result_squat/bench/deadlift/total` | numeric | Filled after competition |
| `result_place` | integer | Final placement |

### `blocks`
Training block (e.g. "Off-season 2025", "Peaking Block").

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `athlete_id` | uuid FK | → profiles |
| `name` | text | Block name |
| `start_date`, `end_date` | date | |
| `status` | text | `active` / `completed` / `planned` |
| `goal` | text | Optional coach note |

### `weeks`
One week inside a block.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `block_id` | uuid FK | → blocks |
| `week_number` | integer | 1-based index |
| `start_date`, `end_date` | date | |

### `workouts`
A single training day inside a week.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `week_id` | uuid FK | → weeks |
| `athlete_id` | uuid FK | → profiles |
| `day_name` | text | e.g. "Dan 1 — Squat" |
| `workout_date` | date | |
| `completed` | boolean | Lifter marks this |
| `notes` | text | Workout-level note |
| `overall_rpe` | numeric | Lifter's perceived overall session difficulty |

### `workout_exercises`
One exercise entry inside a workout. Core table for the training log.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `workout_id` | uuid FK | → workouts |
| `exercise_id` | uuid FK | → exercises |
| `exercise_order` | integer | Display order |
| `planned_sets` | integer | Admin sets |
| `planned_reps` | text | Admin sets (e.g. "5", "3-5") |
| `planned_weight_kg` | numeric | Admin sets |
| `planned_rpe` | numeric | Legacy / fallback RPE |
| `target_rpe` | numeric | **Admin's target RPE for the lifter** |
| `coach_note` | text | **Admin's instruction shown to lifter** |
| `planned_tempo` | text | e.g. `3010` |
| `planned_rest_seconds` | integer | Rest between sets |
| `actual_sets` | integer | **Lifter fills** |
| `actual_reps` | text | **Lifter fills** |
| `actual_weight_kg` | numeric | **Lifter fills** |
| `actual_rpe` | numeric | **Lifter fills** |
| `actual_note` | text | **Lifter's personal note** |
| `completed` | boolean | **Lifter marks** |

### `exercises`
Exercise library (name, category).

### `athlete_notes`
Private admin-to-athlete notes visible in the Admin panel notes tab.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `athlete_id` | uuid FK | → profiles |
| `admin_id` | uuid FK | → profiles |
| `content` | text | Note body |
| `created_at` | timestamptz | Auto |

---

## Authentication & Authorization

Authentication is handled by **Supabase Auth**. The middleware (`src/middleware.ts`) enforces route protection at the Edge:

| Route | Rule |
|---|---|
| `/training` | Requires any authenticated user. Unauthenticated → redirect to `/auth` |
| `/auth` | Authenticated users are redirected away to `/training` |
| `/admin` | Requires authenticated user **and** `profiles.role = 'admin'`. Not admin → redirect to `/403` |
| All other routes | Public |

Role is read via a `get_my_role()` PostgreSQL function defined as `SECURITY DEFINER` — this bypasses RLS on the `profiles` table to prevent infinite recursion when policies check the role of the calling user.

```sql
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $func$
  SELECT role FROM profiles WHERE id = auth.uid();
$func$;
```

---

## Role System

| Capability | Lifter | Admin |
|---|---|---|
| View own training program | ✅ | ✅ |
| Log actual weight / RPE | ✅ | ✅ |
| Write personal exercise notes | ✅ | ✅ |
| Mark exercise / workout complete | ✅ | ✅ |
| Add / remove exercises | ❌ | ✅ |
| Add / remove workout days | ❌ | ✅ |
| Add / remove weeks | ❌ | ✅ |
| Create / duplicate blocks | ❌ | ✅ |
| Set planned sets / reps / weight | ❌ | ✅ |
| Set target RPE and coach notes | ❌ | ✅ |
| View all athletes | ❌ | ✅ |
| Write athlete notes | ❌ | ✅ |
| Manage competitions | ❌ | ✅ |
| Change user roles | ❌ | ✅ |

RLS policies on the database enforce these rules at the data layer — a lifter cannot bypass them even with direct API access.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/your-org/lwlup.git
cd lwlup
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are found in your Supabase project under **Settings → API**.

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Setup

Run the following SQL files in order in your **Supabase SQL Editor**:

### Step 1 — Core schema and seed data

```
schema.sql
```

Creates all tables, RLS policies, and inserts initial athlete and competition data.

### Step 2 — Training program tables

```sql
-- blocks, weeks, workouts, workout_exercises, exercises, athlete_notes
-- (included in schema.sql or run the training migration separately)
```

### Step 3 — Latest migration (target RPE + lifter permissions)

```
migration.sql
```

Adds `target_rpe`, `coach_note`, `actual_note` columns to `workout_exercises` and tightens RLS so lifters can only update `actual_*` fields.

### Step 4 — Seed competitions (optional)

```
insert-competitions-2026.sql
```

### Step 5 — Create your first admin user

1. Register through `/auth` with your email
2. In Supabase Dashboard → Table Editor → `profiles`, find your row and set `role` to `'admin'`

---

## Fonts

The app uses two font CSS variables that must be defined in your global CSS or `layout.tsx`:

```css
:root {
  --fm: 'Your Body Font', sans-serif;   /* Used for body text, labels, UI */
  --fd: 'Your Display Font', sans-serif; /* Used for large headings, numbers */
}
```

The display font (`--fd`) should be a heavy/black weight typeface (800+) to match the editorial design language throughout the app.

---

## Deployment

The recommended platform is **Vercel**:

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy

The `middleware.ts` runs at the Edge and handles all route protection automatically.

---

## Key Design Decisions

**No external CSS framework.** All styles are written inline or in `<style>` blocks co-located with components. This avoids build-time CSS purging issues and keeps component styles self-contained.

**Supabase RLS as the security layer.** All permission logic is enforced at the database level, not just the UI. The `isAdmin` prop in components controls what's *visible*, but RLS controls what's *possible* — a lifter cannot write planned fields even by calling the API directly.

**`get_my_role()` SECURITY DEFINER function.** Prevents the infinite recursion that occurs when a `profiles` RLS policy tries to query `profiles` to check the current user's role.

**Fallback timer on `IntersectionObserver`.** All scroll reveal hooks include a 900ms `setTimeout` fallback that forces `visible = true`. This prevents elements from staying invisible on mobile browsers where the observer threshold may never fire because the element is already in the viewport on load.

**Editorial design language.** The UI is inspired by editorial / sports journalism aesthetics — large typographic week numbers, clean table rows for exercises, strong contrast borders, and a clear hierarchy between coach-written (planned) and athlete-written (actual) data.

---

## License

Private — LWL UP Powerlifting Club. All rights reserved.
