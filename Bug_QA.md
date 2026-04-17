##########################################################################
# WEALIX APP — FULL-SPECTRUM BUG AUDIT & QUALITY ASSURANCE PROMPT v2
# Repository:   github.com/mxaher/Wealix.app
# Stack:        Next.js (App Router) · TypeScript · Tailwind CSS · Playwright
#               OpenNext · Cloudflare Workers · Cloudflare D1 · Cloudflare R2
#               Clerk Auth · Stripe · NVIDIA + Gemma AI · Sahmk API
# Runtime:      Bun · Cloudflare Edge (NOT Node.js server, NOT Vercel)
##########################################################################

## ROLE
You are an elite QA Engineer, Senior Full-Stack Developer, Cloudflare 
Infrastructure Specialist, and Security Auditor combined. You have deep 
expertise in Next.js App Router deployed on Cloudflare Workers via OpenNext, 
TypeScript, Cloudflare D1 (SQLite-based edge database), Cloudflare R2 storage, 
and fintech application logic.

Your mission is to perform a ruthless, exhaustive, production-grade audit of 
the Wealix app — a fintech platform for investment portfolio tracking, AI 
financial analysis, net-worth tracking, and FIRE planning — deployed entirely 
on Cloudflare infrastructure.

Do not skip anything. Do not assume something works. Verify everything.

---

## ⚠️ CRITICAL DEPLOYMENT CONSTRAINT — READ BEFORE EVERY FIX

This application runs EXCLUSIVELY on Cloudflare infrastructure:
- Runtime:   Cloudflare Workers (Edge Runtime) via OpenNext
- Database:  Cloudflare D1 only (binding: `WEALIX_DB`, SQLite dialect)
             Database ID: 99beaa7e-d8d3-4718-b4ab-e880803515a5
             Migrations directory: /cloudflare/
- Storage:   Cloudflare R2 only (binding: `WEALIX_STORAGE`)
- Cache:     Cloudflare KV (if used) — NOT Redis
- Config:    wrangler.jsonc (NOT vercel.json, NOT docker-compose)

THE FOLLOWING ARE STRICTLY FORBIDDEN in any fix you recommend:
✗ PostgreSQL, MySQL, MongoDB, PlanetScale, Neon, Supabase, or any 
  external database — use Cloudflare D1 ONLY
✗ Redis, Upstash, Memcached, or any external cache — use Cloudflare KV 
  or D1 for persistence, use in-memory for short-lived cache
✗ Node.js-specific APIs: fs, path, child_process, net, crypto (Node) — 
  use Web Crypto API and Cloudflare Workers compatible alternatives
✗ Long-running processes, WebSockets (unless via Durable Objects), or 
  background jobs outside of Cloudflare Workers
✗ Any npm package that uses Node.js built-ins not covered by the 
  `nodejs_compat` compatibility flag
✗ `process.env` for secret values at runtime — secrets must come from 
  Cloudflare Workers environment bindings (accessed via `env` in 
  the request context, NOT `process.env` in edge functions)
✗ Vercel-specific functions, ISR (Incremental Static Regeneration with 
  external data stores), or Next.js features incompatible with OpenNext

EVERY fix must be:
✓ Compatible with Cloudflare Workers edge runtime
✓ Using D1 via the `WEALIX_DB` binding for all database operations
✓ Using R2 via the `WEALIX_STORAGE` binding for all file storage
✓ Compatible with OpenNext (next-on-pages) deployment model
✓ Deployable via `wrangler deploy` without additional infrastructure

---

## DATABASE REFERENCE — Cloudflare D1 (WEALIX_DB)

The D1 database uses SQLite dialect. Known tables from migrations:

-- chat_sessions(id, user_id, title, created_at, updated_at)
-- chat_messages(id, session_id, user_id, role, content, model_used, 
                 tokens_used, created_at)
-- receipts(id, user_id, merchant, amount, currency, date, category, 
            raw_ocr_json, r2_image_key, created_at)
-- generated_reports(id, user_id, report_type, title, r2_pdf_key, 
                      metadata_json, created_at)
-- asset_prices(symbol, user_id, price, currency, fetched_at) [PK: symbol+user_id]
-- user_app_profiles (from d1-user-app-profiles.sql migration)
-- daily_planning_snapshots (from d1-daily-planning-snapshots.sql migration)

When recommending database fixes:
- Use D1 query syntax: `env.WEALIX_DB.prepare("SQL").bind(...).run()`
- D1 is SQLite-based: use INTEGER for timestamps, TEXT for IDs, REAL 
  for monetary values, TEXT for JSON blobs
- D1 does NOT support stored procedures, RETURNING clause on all 
  databases, or some advanced PostgreSQL syntax
- Always use parameterized queries — never string interpolation in SQL
- D1 batch operations: use `env.WEALIX_DB.batch([...statements])`

---

## AUDIT SCOPE — EXECUTE ALL OF THE FOLLOWING:

### 🔴 LAYER 1 — ROUTING & NAVIGATION
- [ ] Audit every route defined in `src/app/` (Next.js App Router)
- [ ] Check every `<Link href="...">` and `<a href="...">` tag in all components
- [ ] Verify that every route has a corresponding `page.tsx` or `layout.tsx` file
- [ ] Identify routes returning 404, redirect loops, or missing layouts
- [ ] Check `src/middleware.ts` for routing rules that may incorrectly 
      block or redirect authenticated/unauthenticated users
- [ ] Cross-check middleware protected routes against Clerk auth implementation
- [ ] Verify locale routing in `/locales/` — are all translation keys complete?
- [ ] Flag hardcoded URLs that should be dynamic; verify 
      `NEXT_PUBLIC_APP_URL=https://wealix.app` is used consistently
- [ ] Check that OpenNext handles all routes correctly — identify any route 
      that relies on Node.js runtime features incompatible with Workers

### 🟠 LAYER 2 — BUTTONS & INTERACTIVE ELEMENTS
- [ ] Find every `<button>`, `<Button>`, and clickable `<div>` across all 
      components in `src/components/`
- [ ] Verify each button has a valid `onClick` handler OR `type="submit"` 
      inside a form
- [ ] Identify dead buttons, disabled buttons with no visual feedback, 
      and buttons that trigger broken API calls
- [ ] Check all form submission buttons — do they call the correct 
      API endpoint and handle both success and error states?
- [ ] Verify loading states are shown while async actions are in progress
- [ ] Identify buttons using `window.location.href` instead of 
      Next.js `router.push`

### 🟡 LAYER 3 — FORMS & VALIDATION LOGIC
- [ ] Audit all forms across auth pages (Clerk sign-in/sign-up/onboarding)
- [ ] Audit all dashboard forms (add asset, set alert, update portfolio, 
      upload receipt, FIRE goal setting)
- [ ] Check: Is client-side validation present? Is server-side validation 
      present in API routes?
- [ ] Identify forms with no error message display on invalid submission
- [ ] Check for missing `required` fields, broken regex, wrong input types
- [ ] Verify that toast notifications actually fire on success/error
- [ ] Check that all forms prevent double-submission on async actions
- [ ] Verify receipt upload forms correctly target R2 (`WEALIX_STORAGE`) 
      — not local filesystem (filesystem is NOT available on Workers)

### 🔵 LAYER 4 — API & BACKEND LOGIC (Cloudflare Workers Context)
- [ ] List all API routes defined under `src/app/api/`
- [ ] For EACH API route, verify:
      a) Correct HTTP method handling (GET/POST/PUT/DELETE)
      b) Proper access to Cloudflare bindings via `getRequestContext()` 
         or equivalent OpenNext context helper
      c) D1 database queries use `env.WEALIX_DB` binding — NOT any 
         external DB connection string
      d) File operations use `env.WEALIX_STORAGE` (R2) — NOT `fs` module
- [ ] Check for missing `try/catch` blocks in all API handlers
- [ ] Identify any API route using `process.env` for runtime secrets 
      instead of Cloudflare Worker `env` bindings
- [ ] Identify any API route with hardcoded mock data instead of real D1 queries
- [ ] Verify correct HTTP status codes (201 for creation, 400 for bad 
      input, 401 for unauthorized, 500 for errors)
- [ ] Check API routes for proper Clerk authentication: `auth()` must 
      be called before accessing any user data
- [ ] Check that all financial calculation logic (portfolio value, FIRE 
      number, net worth) handles edge cases: empty portfolio, zero assets, 
      negative values, null D1 results
- [ ] Verify AI API routes (NVIDIA, Gemma) correctly fallback per 
      `AI_ADVISOR_STRATEGY=fallback` config in wrangler.jsonc
- [ ] Check Stripe API routes — verify webhook signature validation, 
      correct price IDs used from wrangler.jsonc vars
- [ ] Check Sahmk API integration (`SAHMK_API_BASE`) — are Saudi market 
      data responses validated before use?
- [ ] Verify SentDM notification routes (`SENTDM_BASE_URL`) — do they 
      fail gracefully if the service is down?

### 🟢 LAYER 5 — DATABASE INTEGRITY (Cloudflare D1)
- [ ] Verify every API route that reads data properly handles D1 
      returning `null` or empty results array
- [ ] Check all D1 INSERT operations use parameterized queries — 
      no string interpolation (SQL injection risk on financial data)
- [ ] Verify `created_at` and `updated_at` fields are stored as 
      INTEGER (Unix timestamp in ms) — not ISO strings 
      (D1/SQLite stores dates as integers)
- [ ] Check that `asset_prices` cache is properly invalidated — 
      stale prices would show wrong portfolio values
- [ ] Verify D1 migrations in `/cloudflare/` directory are in sync 
      with what the API routes actually query — check for missing 
      columns or tables referenced in code but not in schema
- [ ] Check that `chat_messages` properly references `chat_sessions` 
      via foreign key — orphaned messages would corrupt AI chat history
- [ ] Verify `receipts.r2_image_key` and `generated_reports.r2_pdf_key` 
      correctly correspond to objects stored in R2 (`WEALIX_STORAGE`)
- [ ] Check that D1 queries use batch operations for multi-statement 
      transactions — D1 does not support traditional transactions the 
      same way as PostgreSQL
- [ ] Identify any place in code that attempts to use PostgreSQL-specific 
      syntax (SERIAL, RETURNING, pg-specific functions) — replace with 
      D1/SQLite compatible equivalents

### 🟣 LAYER 6 — AUTHENTICATION & SECURITY (Clerk + Workers)
- [ ] Verify all protected pages and API routes call `auth()` from 
      Clerk BEFORE accessing any data
- [ ] Check `src/middleware.ts` enforces Clerk auth on all 
      `/dashboard/*`, `/onboarding`, and `/api/*` routes
- [ ] Identify any page that exposes user financial data without auth
- [ ] Verify Clerk session expiry is handled — does the app redirect 
      to `/sign-in` gracefully?
- [ ] Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in wrangler.jsonc 
      is the live key (pk_live_) not test key
- [ ] Verify D1 queries ALWAYS filter by `user_id` from Clerk auth — 
      a user must NEVER be able to access another user's portfolio, 
      receipts, chat history, or financial data by manipulating IDs
- [ ] Check CSRF protection on all state-mutating API calls
- [ ] Verify Stripe webhook routes validate `stripe-signature` header 
      before processing any subscription event
- [ ] Scan for any secrets accidentally committed — API keys, tokens, 
      or private keys should ONLY be in wrangler.jsonc secrets (not vars)
      or `.env.local` (never committed)
- [ ] Check Content Security Policy headers in `next.config.ts`

### ⚫ LAYER 7 — CLOUDFLARE INFRASTRUCTURE AUDIT
- [ ] Verify `wrangler.jsonc` is valid and all bindings are correctly 
      declared: `WEALIX_DB` (D1), `WEALIX_STORAGE` (R2), `ASSETS`
- [ ] Check `compatibility_date: "2026-03-26"` — are there any APIs 
      used that are not yet available on this compatibility date?
- [ ] Verify `compatibility_flags: ["nodejs_compat"]` is sufficient 
      for all npm packages used — identify any package requiring 
      Node.js APIs beyond what nodejs_compat provides
- [ ] Check `open-next.config.ts` — is the OpenNext configuration 
      correct for Cloudflare Workers deployment?
- [ ] Verify `placement: { mode: "smart" }` is appropriate — no 
      operations that require geographic consistency (D1 is 
      eventually consistent on reads from non-primary regions)
- [ ] Check that `preview_urls: true` does not expose sensitive 
      data on Cloudflare preview deployments
- [ ] Verify observability is properly set up (`observability.enabled: true`)
      — are there any critical paths with no logging?
- [ ] Check that R2 presigned URLs (if used) have appropriate expiry 
      times — not too long (security risk) and not too short (UX issue)

### 🔶 LAYER 8 — UI/UX & VISUAL BUGS
- [ ] Check all charts and data visualizations — do they render with 
      empty D1 result sets?
- [ ] Verify responsive layout on mobile (375px), tablet (768px), 
      and desktop (1440px)
- [ ] Identify text overflow, layout breaks, or z-index conflicts
- [ ] Check dark/light mode toggle — does it persist on page refresh?
- [ ] Verify loading skeletons and empty state components are implemented
- [ ] Check all modals and drawers — do they close correctly?
- [ ] Verify number formatting is consistent (monetary values, percentages)
- [ ] Check i18n in `/locales/` — are all translation keys present? 
      Any raw key strings visible in the UI?
- [ ] Verify that AI chat UI (`chat_sessions`, `chat_messages`) correctly 
      handles long conversations without layout overflow

### 🔷 LAYER 9 — END-TO-END TESTS (Playwright)
- [ ] Review all existing tests in `e2e/`
- [ ] Identify critical user journeys with NO test coverage:
      - Clerk signup → onboarding → dashboard access
      - Add first asset → portfolio value updates → net worth shown
      - AI advisor chat → receive NVIDIA/Gemma response → saved to D1
      - Upload receipt → OCR processing → stored in R2 + D1
      - Set price alert → trigger alert → SentDM notification sent
      - FIRE calculator → input goals → view projection → save to D1
      - Stripe subscription → upgrade plan → feature access unlocked
- [ ] Check `playwright.config.ts` — base URL, timeouts, retry settings
- [ ] Identify any Playwright test relying on test data that no longer 
      exists in D1 schema

### 🔴 LAYER 10 — PERFORMANCE & PRODUCTION READINESS
- [ ] Identify `console.log` statements left in production code
- [ ] Find `TODO`, `FIXME`, `HACK`, `@ts-ignore` comments
- [ ] Check for missing `loading.tsx`, `error.tsx`, `not-found.tsx` 
      in App Router pages
- [ ] Verify images use `next/image` with proper `width`, `height`, `alt`
- [ ] Check `package.json` — do all scripts (`build`, `start`, `test`, 
      `deploy`) run without errors?
- [ ] Identify unused dependencies in `package.json`
- [ ] Check for any code that calls `setTimeout` with long delays 
      (Workers have a 30-second CPU time limit per request)
- [ ] Verify no API route exceeds the Cloudflare Workers response 
      size limits or memory limits
- [ ] Check that AI model calls (NVIDIA, Gemma) have appropriate 
      timeouts — they must not exceed the Workers CPU time budget

---

## FIX COMPLIANCE RULES

Before writing ANY fix, run this mental checklist:
1. Does this fix use only Cloudflare D1 for database? ✓
2. Does this fix use only Cloudflare R2 for file storage? ✓
3. Does this fix work in Cloudflare Workers edge runtime? ✓
4. Is `process.env` avoided for secrets (use Worker `env` bindings)? ✓
5. Does this fix avoid Node.js-only APIs? ✓
6. Is this fix deployable via `wrangler deploy`? ✓
7. Is all SQL written in SQLite dialect (not PostgreSQL)? ✓

If the answer to ANY question above is NO — the fix is INVALID. 
Rewrite it until all answers are YES.

---

## OUTPUT FORMAT

For every issue found, report it in this structure:

---
🐛 BUG #[NUMBER]
📍 Location: [file path + line number if possible]
🏷️  Layer: [Routing | Button | Form | API | Database | Auth | Cloudflare | UI | Test | Performance]
⚠️  Severity: [CRITICAL | HIGH | MEDIUM | LOW]
☁️  Cloudflare Impact: [YES — breaks deployment | YES — D1 query issue | YES — Workers incompatibility | NO]
📝 Description: [Clear description of the bug, its location, and user/system impact]
🔧 Recommended Fix: [Concrete, actionable fix with code snippet, 
                     compliant with Cloudflare Workers + D1 + R2 constraints]
---

## PRIORITIZATION MATRIX

After listing all bugs, produce a Bug Priority Matrix sorted by:
1. CRITICAL — App crashes, financial miscalculation, auth bypass, 
               D1 data loss, Cloudflare deployment failure
2. HIGH     — Feature broken, broken API, broken D1 query, wrong 
               database used, Workers incompatibility
3. MEDIUM   — Degraded UX, missing error handling, incomplete feature, 
               missing D1 null checks
4. LOW      — Visual polish, code quality, unused code

## FINAL DELIVERABLE

End your audit with:
1. **Total Bug Count** by severity level
2. **Top 5 Most Urgent Fixes** with rationale
3. **Cloudflare Deployment Risk Report** — any issue that would cause 
   `wrangler deploy` to fail or produce broken runtime behavior
4. **D1 Database Health Report** — schema gaps, missing indexes, 
   unsafe queries, missing null checks
5. **Test Coverage Gap Report** — which features have zero Playwright coverage
6. **Security Risk Summary** — financial data exposure risks specific 
   to the Cloudflare + Clerk + D1 architecture

---

BEGIN AUDIT NOW. Be thorough. Be uncompromising.
This is a fintech app handling real user financial data on Cloudflare edge.
Every fix must be deployable on Cloudflare Workers. No exceptions.
##########################################################################