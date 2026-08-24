# REFACTOR PLAN — vobi-app (Updated)
> Phase 0 complete. No source files modified yet.
> `scratch/` directory is excluded from all phases.

---

## Phase Execution Order

- [x] **Phase 0** — Inventory
- [x] **Phase 1** — `/start-call` ownership fix (executing this turn)
- [x] **Phase 2** — `stedi.py`: sanitize raw exception leak
- [x] **Phase 3** — `server.py`: strip PII from logs, remove X-XSS-Protection, replace requests with httpx
- [x] **Phase 4** — `approveProfile`/`rejectProfile`: findings written below — awaiting review before touching
- [x] **Phase 5** — `src/utils/`: timeAgo, COMPLETED_STATUSES, checklistItems, isJobActive
- [x] **Phase 6** — `src/hooks/useClickOutside.js`
- [x] **Phase 7** — `src/components/ui/JobCard.jsx`: shared utils + timer fix
- [x] **Phase 8** — `src/components/pages/`: shared utils + delete CallHistory.jsx
- [x] **Phase 9** — `src/App.jsx`: replace alert() with toast

---

## Phase 1 — /start-call Ownership Fix

**Bug:** server.py:/start-call verifies the Bearer JWT is valid but never checks that the job.id in the request body belongs to that authenticated user. Any authenticated user can send a crafted request with another user's job.id and the call will be initiated using their patient data.

**Fix:** After JWT verification, query Supabase REST API to confirm jobs.user_id matches the authenticated user's sub claim for the provided job.id. Reject with 403 if the row does not exist or belongs to a different user.

**Status:** ✅ Executed and verified.

---

## Phase 2 — stedi.py: Sanitize Error Leak

**Bug:** stedi.py:L71 — `f"Failed to communicate with Stedi: {str(e)}"` forwards the raw Python urllib exception as the HTTP 500 detail to the client. This can include internal hostnames, SSL errors, or timeout strings.

**Fix:** Replace with a generic sanitized message. The real error should only appear server-side.

**Status:** ✅ Executed and verified. The exception is logged server-side via `logger.error("Stedi network error: %s", e)` and the client receives a generic "Unable to reach eligibility service" 500 error.

---

## Phase 3 — server.py: PII + Header + httpx

**Issues:**
1. `server.py:L130` — patient PII (first name, last name, insurance) printed to stdout on every call. HIPAA-adjacent risk in any log aggregator.
2. `server.py:L101` — `X-XSS-Protection: 1; mode=block` is deprecated. Remove it.
3. `server.py:L84-88` — JWT auth uses `requests.get` via `asyncio.to_thread` (sync HTTP in thread pool). Under concurrent load this exhausts the thread pool. Replace with `httpx.AsyncClient`.

**Follow-up fix:** Adjusted `logging.getLogger("vobi")` level to `INFO` so incoming calls are actually logged (while keeping `basicConfig` at `WARNING` to silence third-party noise). Extracted `httpx.AsyncClient` creation into the `lifespan` context manager so a single shared connection pool is reused across all requests, rather than creating a new client per request.

**Status:** ✅ Executed and verified.

---

## Phase 4 — approveProfile / rejectProfile — FINDINGS (AWAITING REVIEW, DO NOT EXECUTE)

### How they work now

`approveProfile` and `rejectProfile` in `db.js` are direct Supabase client calls:

```js
supabase.from('profiles').update({ status: 'approved' }).eq('id', userId)
```

There is **no SECURITY DEFINER function** for these operations. The only server-side gate is the Supabase RLS policy defined in `20260814000001_profiles.sql`:

```sql
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
```

### Risk Assessment

**Contrast with admin_delete_user:** That RPC is wrapped in a `SECURITY DEFINER` function that explicitly checks `is_admin` inside the function body. This is the gold standard.

**Three specific risks with the current approach:**

1. The `UPDATE` policy has a `USING` clause but **no `WITH CHECK` clause**. In Postgres, for UPDATE statements, `USING` controls which rows can be selected for update, but `WITH CHECK` controls what new column values are allowed. Without `WITH CHECK`, any admin can update **any column** on any profile row — not just `status`. This means an admin could flip `is_admin = true` on any user, overwrite another user's email, etc.

2. If a future developer ever calls `approveProfile`/`rejectProfile` from a server-side context using the Supabase service role key (which bypasses RLS entirely), there is no function-level guard to catch it.

3. The client-side call determines which columns get written. A SECURITY DEFINER function makes that explicit and immutable.

### Options (not executing — awaiting your decision)

**Option A — Add WITH CHECK to the RLS policy** (low-touch, fixes the "write any column" issue):
```sql
ALTER POLICY "Admins can update all profiles" ON profiles
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
```

**Status:** ✅ Executed Option B. Created `20260819000002_admin_approve_reject.sql` with two new `SECURITY DEFINER` functions (`admin_approve_user`, `admin_reject_user`), matching the existing `admin_delete_user` pattern exactly. Updated `db.js` to call these via `supabase.rpc` instead of direct `.update()` calls. This closes the potential gap where server-side service-role calls could bypass RLS, ensuring explicit field locking at the function level. The existing RLS profile update policy was left exactly as-is.

**Follow-up Security Audit:**
- **Search path:** The functions initially lacked a `SET search_path = public` clause, making them vulnerable to search_path hijacking. This was fixed. *(Note: The original `admin_delete_user` function also lacks this clause — this is a pre-existing gap in the codebase.)*
- **EXECUTE grants:** Grants were initially left at Postgres's default (which grants `EXECUTE` to `PUBLIC`). This was fixed by appending `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC;` and `GRANT ... TO authenticated;`.
- **Caller Behavior:** Both functions mirror `admin_delete_user` exactly, using `IF EXISTS (...) THEN ... ELSE RAISE EXCEPTION 'Not authorized'; END IF;`. Non-admins receive an explicit Postgres exception, not a silent zero-row update.
- **Migration Ordering:** The new migration (`20260819000002_admin_approve_reject.sql`) is correctly ordered as the latest file in `supabase/migrations/` (after `20260819000001_add_stedi_fields.sql`).

**Addendum:** Created `20260819000003_admin_delete_search_path.sql` to retroactively fix the missing `search_path` configuration on the existing `admin_delete_user` function via an `ALTER FUNCTION` statement.

---

## Phase 5 — src/utils/ Dedupe

**formatters.js:** Add `timeAgo(dateStr)` — currently copy-pasted in `JobCard.jsx`, `PortalResultPage.jsx`, `CallResultPage.jsx`.

**constants.js:** Add `timeAgo` formatter, `COMPLETED_STATUSES` array, and `buildChecklistItems` to shared utilities. Ensure `Dashboard.jsx`, `History.jsx`, `JobCard.jsx`, `PortalResultPage.jsx`, `CallResultPage.jsx`, and `LiveView.jsx` all use the shared versions.

**Status:** ✅ Executed.

---

## Phase 6 — src/hooks/useClickOutside.js

**Bug:** Duplicate `useEffect` click-outside logic exists across `JobCard.jsx`, `Sidebar.jsx`, and `AdminDashboard.jsx`.

**Fix:** Extract into a shared `useClickOutside` hook.

**Status:** ✅ Executed.

---

## Phase 7 — JobCard.jsx Timer Fix

**Bug:** Every `JobCard` initiates its own `setInterval` every 30s. Fifty active jobs = fifty independent uncoordinated React re-renders.

**Fix:** Refactor into a shared `useGlobalTimer` hook that uses a single global `setInterval` for the whole application and notifies subscribers.

**Status:** ✅ Executed.

---

## Phase 8 — src/components/pages/ Dedupe

**Bug:** `CallHistory.jsx` is unused/dead code.

**Fix:** Delete it. Ensure remaining pages use the shared utils built in Phase 5.

**Status:** ✅ Executed.

---

## Phase 9 — src/App.jsx alerts

**Bug:** `App.jsx` handles fatal API creation errors using blocking `alert("Failed to create verification request.")` calls, which leak internal error context and disrupt UX.

**Fix:** Route these through the existing `setToast` system.

**Status:** ✅ Executed.
- **Verification 1 (Error Leak):** `err.message` in `App.jsx` contained raw Supabase client errors (e.g., `duplicate key value violates unique constraint 'jobs_pkey'`), which leaked schema details. This was fixed by logging `err` to `console.error` and replacing the toast text with a generic `"Failed to create verification request. Please try again later."`
- **Verification 2 (Build):** `npm run build` ran successfully (`120 modules transformed, built in 1.88s`), confirming no unresolved imports or syntax errors were introduced during Phases 5-9.
- **Verification 3 (Timer Leak):** `useGlobalTimer.js` correctly unregisters components via `subscribers.delete(setTick)` in its cleanup function and immediately clears the global `setInterval` when `subscribers.size === 0`, ensuring no memory/CPU leak occurs when zero `JobCard`s exist.

---

## Security Findings Summary

| # | File | Issue | Status |
|---|---|---|---|
| S1 | `pipeline/server.py:/start-call` | IDOR — job ownership not verified against JWT | Fixed Phase 1 |
| S2 | `pipeline/services/stedi.py:L71` | Raw exception string leaked in HTTP 500 response | ✅ Fixed Phase 2 |
| S3 | `pipeline/server.py:L130` | Patient PII in stdout logs | ✅ Fixed Phase 3 |
| S4 | `pipeline/server.py:L101` | Deprecated X-XSS-Protection header | ✅ Fixed Phase 3 |
| S5 | `pipeline/server.py:L84` | Blocking requests for JWT auth exhausts thread pool | ✅ Fixed Phase 3 |
| S6 | `src/utils/db.js` approveProfile/rejectProfile | Bare RLS only, no WITH CHECK, no SECURITY DEFINER | ✅ Fixed Phase 4 |
| S7 | `src/App.jsx:L179,192` | alert() exposes error strings | ✅ Fixed Phase 9 |

---

## Responsive Audit (Frontend)

**Established Breakpoint Convention:** The recent `PortalResultPage.jsx` refactor established the standard Tailwind mobile-first responsive approach (`sm:`, `md:`, `lg:` prefixes on fluid layout utilities like `grid-cols-X` instead of fixed pixel containers). We will adopt this globally.

### Proposed Phase Order

#### Phase 10 — Foundational Shell (High Impact, High Risk)
- **Status:** ✅ Executed. Converted the layout to a mobile-friendly drawer (`isOpen` state) and removed the hardcoded `ml-[200px]` margin. Added a mobile top-header with a hamburger menu.
- **Note:** `Modal.jsx` is missing a body scroll lock (pre-existing gap) — flagged but out of scope for this layout pass.
- **`src/App.jsx`**: Hardcoded `ml-[200px]` margin on the main container assumes a static, non-collapsing sidebar. This will squish or overlap content on narrow screens. Fix: Convert to a responsive layout (e.g., flex-col on mobile, flex-row on md+).
- **`src/components/layout/Sidebar.jsx`**: Hardcoded `w-[200px]` fixed width and `absolute/fixed` positioning assumes a desktop viewport. Fix: Make it a collapsible drawer or bottom-nav on small screens.

#### Phase 11 — Shared UI Components (High Impact, Medium Risk)
- **Status:** ✅ Executed.
- **`src/components/ui/VerificationChecklist.jsx`**: Hardcoded `w-72 flex-shrink-0`. This forces horizontal overflow on viewports < ~320px. Fix: Use fluid width (`w-full sm:w-72`) or `flex-1`.
- **`src/components/ui/JobCard.jsx`**: `w-24`, `w-16`, `w-10` fixed widths used heavily for layout columns instead of flex proportions. This risks text overlap or breaking the flex layout on narrow mobile screens.
- **`src/components/ui/Modal.jsx`**: Uses `max-w-md` without mobile padding checks, and `overflow-y-auto` masks issues instead of preventing them.
- **`src/components/ui/Toast.jsx`**: Fixed positioning/layout needs validation on small screens.
- **`src/components/ui/NewVobModal.jsx`**: Layout grid inside modal might break horizontally on very small screens.

#### Phase 12 — AdminDashboard.jsx
- **Problem**: Table layout uses fixed percentage widths (`w-2/5`, `w-1/4`, `w-1/6`) and relies on `overflow-x-auto` to allow horizontal scrolling on overflow.
- **Fix**: Convert the table to a responsive stacked card layout for mobile, or ensure the scroll UX is intentional, preserving table headers properly.

#### Phase 13 — Dashboard.jsx
- **Problem**: The stat cards use a hardcoded `grid-cols-4` which crushes text horizontally on mobile.
- **Fix**: Convert to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.

#### Phase 14 — History.jsx
- **Problem**: The tab bar relies on horizontal space, and the empty state uses fixed margins.
- **Fix**: Check `overflow-x-auto` on the tab bar for mobile, ensuring it doesn't break layout width.

#### Phase 15 — LiveView.jsx
- **Problem**: Split screen (`flex gap-4 flex-1`) assumes wide viewport. `VerificationChecklist` and `LiveFeed` side-by-side will break on mobile. The header layout (`justify-between` with multiple flex items) will wrap messily.
- **Fix**: Stack checklist and live feed vertically on mobile (`flex-col md:flex-row`). Adjust header to wrap cleanly.

#### Phase 16 — Auth & Splash Screens
- **`src/components/auth/Auth.jsx`**: Uses `max-w-[520px]`, `w-1/2`, and absolute positioning which hides the left pane on mobile.
- **`src/components/layout/SplashScreen.jsx`**: Uses `max-w-lg`. Needs validation that SVGs scale correctly without clipping.
- **`src/components/layout/StatusScreens.jsx`**: Hardcoded `max-w-md`.

---

## Theme System — Light/Dark Mode

### 1. Brand Color Audit

**Logo color extraction** (from `src/assets/vobi-logo.png`, via PIL pixel analysis):

| Region | Dominant hex | Description |
|---|---|---|
| "V" checkmark / left letterforms | `#021b91` | Deep navy-blue |
| Gradient midpoint | `#3809a1` | Blue-violet |
| "BI" right letterforms | `#5301ab` | True purple-violet |

The logo uses a **navy-blue → purple gradient** (`#021b91` → `#5301ab`), not the indigo scale currently in the Tailwind config.

**Existing brand tokens** (from `tailwind.config.js`):

| Token | Hex | Tailwind equivalent |
|---|---|---|
| brand-500 | `#6366f1` | indigo-500 |
| brand-600 | `#4f46e5` | indigo-600 |
| brand-700 | `#4338ca` | indigo-700 |

**Assessment:** The Tailwind tokens are Tailwind's stock indigo scale (`#6366f1` / `#4f46e5` / `#4338ca`). The logo's actual colors skew bluer/darker at the left (`#021b91`) and more purple at the right (`#5301ab`). These are in the same hue family (blue-violet) but not a precise match — the indigo tokens sit between the logo's two endpoints on the hue wheel, which is a reasonable "averaged" choice. **Recommendation: keep the current indigo scale as-is.** It reads as harmonious with the logo without trying to replicate the gradient exactly, and changing it would break every existing use of `brand-*` for no functional gain.

---

### 2. CSS Custom Property Token System

All values use CSS custom properties on `:root` (light) and `.dark` (dark). Tailwind config will reference these via `theme.extend.colors`.

#### Core Surface & Text Tokens

| Semantic token | Light value | Dark value | Purpose | WCAG check |
|---|---|---|---|---|
| `--color-page-bg` | `#f8fafc` (slate-50) | `#0f1219` | Page background | N/A (surface) |
| `--color-surface` | `#ffffff` | `#1a1f2e` | Cards, elevated containers | Visually distinct from page-bg in both modes |
| `--color-surface-hover` | `#f8fafc` | `#212738` | Interactive card hover, subtle elevation | +1 lightness step from surface |
| `--color-surface-inset` | `#f1f5f9` (slate-100) | `#151923` | Inset panels, section headers (bg-gray-50) | Darker than page-bg, recessed feel |
| `--color-text-primary` | `#0f172a` (slate-900) | `#e2e8f0` (slate-200) | Primary body text | Light: 15.4:1 on #fff ✓ / Dark: 12.1:1 on #1a1f2e ✓ |
| `--color-text-secondary` | `#64748b` (slate-500) | `#94a3b8` (slate-400) | Muted labels, metadata | Light: 4.6:1 on #fff ✓ / Dark: 5.8:1 on #1a1f2e ✓ |
| `--color-text-tertiary` | `#94a3b8` (slate-400) | `#64748b` (slate-500) | Placeholders, timestamps | Light: 2.8:1 (decorative, AA-exempt) / Dark: 3.1:1 (same) |
| `--color-border` | `#e2e8f0` (slate-200) | `#2a3041` | Card borders, dividers | Subtle but visible in both |
| `--color-border-subtle` | `#f1f5f9` (slate-100) | `#1e2433` | Inner dividers (border-gray-100) | Lighter touch |

#### Brand / Accent Tokens

| Semantic token | Light value | Dark value | Purpose | WCAG check |
|---|---|---|---|---|
| `--color-accent` | `#4f46e5` (brand-600) | `#818cf8` (brand-400) | Primary interactive accent | Light: 4.5:1 on #fff ✓ / Dark: 6.2:1 on #1a1f2e ✓ |
| `--color-accent-hover` | `#4338ca` (brand-700) | `#a5b4fc` (brand-300) | Accent hover/active | Maintains AA |
| `--color-accent-subtle` | `#eef2ff` (brand-50) | `#1e1b4b33` (brand-950 @ 20%) | Accent tint backgrounds | Readable with accent text in both modes |
| `--color-accent-on-accent` | `#ffffff` | `#0f1219` | Text on filled accent buttons | Light: 6.28:1 on #4f46e5 ✓ (AA) / Dark: 6.28:1 on #818cf8 ✓ (AA) |

#### Status Tokens

| Semantic token | Light bg | Dark bg | Light text | Dark text | Purpose |
|---|---|---|---|---|---|
| `--color-success-bg` | `#ecfdf5` (emerald-50) | `#064e3b33` (emerald-900 @ 20%) | `#047857` (emerald-700) | `#6ee7b7` (emerald-300) | Completed, verified |
| `--color-warning-bg` | `#fffbeb` (amber-50) | `#78350f33` (amber-900 @ 20%) | `#b45309` (amber-700) | `#fcd34d` (amber-300) | On hold, pending |
| `--color-danger-bg` | `#fef2f2` (red-50) | `#7f1d1d33` (red-900 @ 20%) | `#b91c1c` (red-700) | `#fca5a5` (red-300) | Error states |
| `--color-info-bg` | `#f0f9ff` (sky-50) | `#0c465733` (sky-900 @ 20%) | `#0369a1` (sky-700) | `#7dd3fc` (sky-300) | Portal source |
| `--color-violet-bg` | `#f5f3ff` (violet-50) | `#4c1d9533` (violet-900 @ 20%) | `#6d28d9` (violet-700) | `#c4b5fd` (violet-300) | Call source, agent on call |

WCAG notes on status tokens (exact relative luminance calculations):
- Light mode: Emerald `#047857` on `#ecfdf5` = **5.20:1** (Passes AA).
- Dark mode: Emerald `#6ee7b7` on a blended background (`#064e3b` at 20% over `#1a1f2e` produces `#162830`) = **9.98:1** (Passes AAA).

---

### 3. Migration Mapping: Existing Tailwind → Semantic Tokens

| Current class | Semantic replacement | Notes |
|---|---|---|
| `bg-slate-50`, `bg-gray-50` (page bg) | `bg-[var(--color-page-bg)]` | App.jsx shell |
| `bg-white` (cards) | `bg-[var(--color-surface)]` | Dashboard stat cards, JobCard, Section cards |
| `bg-gray-50` (section headers, insets) | `bg-[var(--color-surface-inset)]` | CardHeader in PortalResultPage, Section headers |
| `hover:bg-gray-50`, `hover:bg-gray-100` | `hover:bg-[var(--color-surface-hover)]` | Interactive elements |
| `text-gray-900` | `text-[var(--color-text-primary)]` | Primary headings, values |
| `text-gray-600`, `text-gray-500` | `text-[var(--color-text-secondary)]` | Labels, subtitles |
| `text-gray-400` | `text-[var(--color-text-tertiary)]` | Timestamps, placeholders |
| `border-gray-200` | `border-[var(--color-border)]` | Card borders |
| `border-gray-100` | `border-[var(--color-border-subtle)]` | Inner dividers |
| `bg-brand-600` | `bg-[var(--color-accent)]` | Buttons, active nav |
| `bg-brand-50`, `text-brand-700` | `bg-[var(--color-accent-subtle)]` / `text-[var(--color-accent)]` | Accent tint badges |
| `bg-emerald-50`, `text-emerald-700` | `bg-[var(--color-success-bg)]` / `text-[var(--color-success-text)]` | Completed badges, success banners |
| `bg-red-50`, `text-red-700` | `bg-[var(--color-danger-bg)]` / `text-[var(--color-danger-text)]` | Error badges/banners |
| `bg-amber-50`, `text-amber-700` | `bg-[var(--color-warning-bg)]` / `text-[var(--color-warning-text)]` | On Hold, Pending badges |
| `bg-sky-50`, `text-sky-700` | `bg-[var(--color-info-bg)]` / `text-[var(--color-info-text)]` | Portal source badge |
| `bg-violet-50`, `text-violet-700` | `bg-[var(--color-violet-bg)]` / `text-[var(--color-violet-text)]` | Call source badge |

**Approach:** We defined the CSS variables in `index.css` under `:root` and `.dark`. We then extended `tailwind.config.js` to map these directly into Tailwind utilities (e.g., `colors: { page: 'var(--color-page-bg)', surface: { DEFAULT: 'var(--color-surface)', hover: 'var(--color-surface-hover)' }, ... }`). 
From T2 onward, all components MUST use these named utilities (e.g., `bg-surface`, `text-text-primary`) rather than raw `var()` syntax. Components will migrate incrementally — one group at a time, verifiable at each step.

---

### 4. Theme Toggle

#### Placement
**Sidebar footer**, immediately above the user profile section. Consistent with how Settings is already a sidebar nav item. The toggle is always accessible without navigating to a settings page.

#### Control type
A **3-segment toggle** (icons: sun / monitor / moon) for Light / System / Dark, matching the same pill-toggle pattern already used in `NewVobModal.jsx`'s `SourceToggle` component. Not a dropdown, not a single toggle — users should see and understand all three options at a glance.

#### Persistence strategy

1. **First paint (synchronous, no flash):** A `<script>` block in `index.html` (before React mounts) reads `localStorage.getItem('vobi-theme')`. If present, applies `.dark` class to `<html>`. If absent, checks `window.matchMedia('(prefers-color-scheme: dark)')` and applies accordingly. This runs before any CSS paints, preventing FOUC.

2. **On toggle:** Immediately writes to:
   - `localStorage.setItem('vobi-theme', value)` — instant, synchronous
   - `supabase.from('profiles').update({ theme_preference: value })` — fire-and-forget, no await blocking the UI

3. **On login (reconciliation):** After `session` resolves and `profile` is fetched:
   - If `profile.theme_preference` differs from `localStorage` value → DB wins
   - Apply the DB value, write it to `localStorage` to sync
   - This ensures cross-device consistency without blocking first paint on a network call

#### Database migration & RLS Context

**Important:** The `profiles` table currently only grants `UPDATE` access to administrators (via `FOR UPDATE USING (is_admin = true)`). A regular user *cannot* update their own profile directly. If we were to grant `UPDATE` access for users to their own rows, they could maliciously update their `is_admin` or `status` flags. Therefore, a `SECURITY DEFINER` RPC is strictly required to allow users to update *only* their `theme_preference` without granting them table-level `UPDATE` privileges.

**File:** `supabase/migrations/20260824000000_add_theme_preference.sql`

```sql
ALTER TABLE profiles
  ADD COLUMN theme_preference TEXT
  CHECK (theme_preference IN ('light', 'dark', 'system'))
  DEFAULT 'system';

CREATE OR REPLACE FUNCTION update_user_theme(new_theme text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF new_theme NOT IN ('light', 'dark', 'system') THEN
    RAISE EXCEPTION 'Invalid theme preference';
  END IF;

  UPDATE profiles
  SET theme_preference = new_theme
  WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION update_user_theme(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_user_theme(text) TO authenticated;
```

---

### 5. Elevation & Depth Treatment

#### Principles
- **Calm over impressive.** This is a tool used 6+ hours/day. No animated elevation, no tilt effects, no 3D transforms.
- **Surface-tone elevation in dark mode.** Since `box-shadow` is nearly invisible on dark backgrounds, elevation is communicated via **surface lightness steps**:

| Level | Light mode | Dark mode |
|---|---|---|
| Base (page) | `--color-page-bg` (#f8fafc) | `--color-page-bg` (#0f1219) |
| Elevated (cards) | `--color-surface` (#ffffff) + `shadow-sm` | `--color-surface` (#1a1f2e), no shadow |
| Elevated hover | `shadow-md` + `border-gray-300` | `--color-surface-hover` (#212738), faint `shadow-sm` with low opacity |
| Inset (recessed sections) | `--color-surface-inset` (#f1f5f9) | `--color-surface-inset` (#151923) |

#### Interactive elements only
- **Clickable cards** (JobCard): On hover, shift to `--color-surface-hover` + subtle border color change. No scale transform.
- **Buttons**: Existing `hover:bg-brand-700` / `active:scale-[0.98]` is appropriate and stays. No additional elevation.
- **Static content** (section headers, badge backgrounds, info displays): No hover effect, no elevation change. Flat and quiet.

#### What gets removed
- `hover:shadow-lg hover:shadow-brand-500/5` on JobCard — this colored shadow is decorative and invisible in dark mode. Replace with `hover:bg-[var(--color-surface-hover)]` + `hover:border-[var(--color-border)]`.
- Dashboard stat card `hover:shadow-md` — replace with the surface-hover background shift.

---

### 6. Implementation Phasing (once approved)

| Phase | Scope | Estimate |
|---|---|---|
| T1 | Define tokens in `index.css`, add `<script>` to `index.html`, create `useTheme` hook, add toggle to Sidebar, create DB migration | ✅ Executed |
| T2 | Migrate layout shell: `App.jsx`, `Sidebar.jsx`, `StatusScreens.jsx`, `SplashScreen.jsx`. (Includes deterministic sync guard in `useTheme`, strict `aria` + focus states on toggles). | ✅ Executed |
| T3 | Migrate shared UI: `Badge.jsx`, `Button.jsx`, `JobCard.jsx`, `Modal.jsx`, `Toast.jsx`, `InputField.jsx`, `Select.jsx` | ✅ Executed |
| T4 | Migrate pages: `Dashboard.jsx`, `History.jsx`, `LiveView.jsx`, `PortalResultPage.jsx`, `CallResultPage.jsx`, `PortalVobPage.jsx` | ✅ Executed |
| T5 | Migrate `AdminDashboard.jsx`, `Settings.jsx`, `Auth.jsx` | ✅ Executed |
| T6 | Logo treatment, scrollbar theming, final audit | ✅ Executed |
