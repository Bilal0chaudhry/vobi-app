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
