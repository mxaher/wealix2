# Wealix

Wealix is a personal wealth operating system built with Next.js App Router, Clerk, Zustand, Tailwind, and shadcn/ui.

It helps users track:

- income
- expenses
- receipt OCR
- portfolio holdings
- net worth
- budget limits
- FIRE progress
- reports

The app supports:

- Clerk-based user accounts
- guest browsing with read-only demo data
- live mode for signed-in users with clean personal data
- Arabic and English UI
- RTL support for Arabic with Tajawal font

## Main Features

- Dashboard with wealth summary and onboarding-style empty states for new users
- Income tracking with recurring and one-time entries
- Expense tracking with manual entry and receipt scanning
- Receipt OCR with camera/upload support and manual review before saving
- Portfolio tracking with manual entry, Excel import, and AI analysis
- Net worth tracking with assets and liabilities
- Budget tracking with category limits and report-ready budget data
- Reports for income, expenses, budget, portfolio, net worth, FIRE, and annual review
- Settings for language, theme, notifications, subscription, and local data reset

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Zustand
- Clerk
- Framer Motion
- Recharts
- Bun

## Project Structure

```text
src/
  app/
    api/
    advisor/
    budget/
    expenses/
    fire/
    income/
    net-worth/
    portfolio/
    reports/
    settings/
  components/
  store/
  lib/
public/
```

## Local Development

### 1. Install dependencies

```bash
bun install
```

### 2. Run the app

```bash
bun run dev
```

The app runs on:

- `http://localhost:3000`

### 3. Production build locally

```bash
bun run build
bun run start
```

## Environment Variables

Create a `.env.local` file for local development.

### Required for production

These are required if you deploy the current app with full auth and OCR support:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NVIDIA_API_KEY=
DATALAB_API_KEY=
SAHMK_API_KEY=
TWELVEDATA_API_KEY=
```

### Optional

```env
NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1
NVIDIA_OCR_MODEL=meta/llama-3.2-90b-vision-instruct
DATALAB_API_BASE=https://www.datalab.to
CHANDRA_API_KEY=
SAHMK_API_BASE=https://app.sahmk.sa/api/v1
TWELVEDATA_API_BASE=https://api.twelvedata.com
```

Notes:

- `DATALAB_API_KEY` is the primary key used for Chandra/Datalab hosted OCR.
- `CHANDRA_API_KEY` is supported as an alternate name, but `DATALAB_API_KEY` is preferred.
- `NVIDIA_API_KEY` is used by the AI Advisor, portfolio analysis, and NVIDIA-based receipt OCR.
- `NVIDIA_API_BASE` is optional unless you are pointing to a non-default NVIDIA API base.
- `NVIDIA_OCR_MODEL` defaults to `meta/llama-3.2-90b-vision-instruct`.
- `DATALAB_API_BASE` is optional unless you are pointing to a non-default Datalab base URL.
- `SAHMK_API_KEY` is used to fetch Saudi market quotes for TASI holdings.
- `SAHMK_API_BASE` is optional unless you are pointing to a custom SAHMK API base.
- `TWELVEDATA_API_KEY` is used to fetch EGX, NASDAQ, NYSE, and FX data.
- `TWELVEDATA_API_BASE` is optional unless you are pointing to a custom Twelve Data base.
- `NEXT_PUBLIC_APP_URL` is helpful if you want the sitemap and production URLs to point somewhere other than `https://wealix.app`.

### Clerk

Used for:

- sign up
- sign in
- user session management
- user avatar/account menu

Required vars:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Without valid Clerk keys, production auth will fail.

### NVIDIA OCR

Used for:

- receipt scanning
- text extraction from uploaded receipt images
- camera-captured receipt OCR

Required var:

```env
NVIDIA_API_KEY=
```

Optional:

```env
NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1
NVIDIA_OCR_MODEL=meta/llama-3.2-90b-vision-instruct
```

The receipt OCR route is:

- [src/app/api/receipts/ocr/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/receipts/ocr/route.ts)

Current behavior:

- first tries NVIDIA vision OCR
- falls back to Datalab/Chandra OCR if NVIDIA is unavailable or fails
- then falls back to Datalab Marker as the final structured OCR fallback

### Cloudflare D1

Signed-in user financial data is now designed to persist inside Cloudflare D1, not an external database.

Binding name required:

- `WEALIX_DB`

One-time database setup:

1. In Cloudflare, create a D1 database named `wealix-db`
2. Open the D1 console or run a Wrangler SQL command
3. Execute [cloudflare/d1-user-app-profiles.sql](/Users/mohammedzaher/projects/Wealixapp%20v2/cloudflare/d1-user-app-profiles.sql)
4. Bind that D1 database to your Worker as `WEALIX_DB`

SQL to paste into the D1 SQL editor:

```sql
CREATE TABLE IF NOT EXISTS user_app_profiles (
  clerk_user_id TEXT PRIMARY KEY,
  workspace_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

If you prefer Wrangler CLI, use:

```bash
wrangler d1 execute wealix-db --remote --file ./cloudflare/d1-user-app-profiles.sql
```

Runtime behavior:

- guests still use demo data locally
- signed-in users load their workspace from D1 on sign-in
- changes to income, expenses, holdings, assets, liabilities, budgets, and saved portfolio analysis are synced back automatically
- redeploying the app no longer wipes signed-in user financial data

## Authentication Model

Wealix currently uses Clerk as the main user management system.

### Trials

Wealix now supports app-managed 14-day trials without a credit card.

The app stores and evaluates these Clerk metadata fields:

```ts
subscriptionTier: 'free' | 'core' | 'pro'
trialStatus: 'active' | 'expired' | 'inactive'
trialPlan: 'core' | 'pro'
trialEndsAt: string // ISO timestamp
```

Runtime behavior:

- every brand-new account gets a 14-day trial automatically on first real sign-in
- [src/app/api/billing/trial/ensure/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/billing/trial/ensure/route.ts) initializes that one-time trial if one has not already been used
- during the trial, premium access is granted through the active trial metadata
- once the trial expires, access falls back to `free` unless the user converts to a paid plan

### API protection

All non-public API routes now enforce authentication at the route-handler level. Sensitive AI routes also require a Clerk subscription tier of `pro` from metadata.

Current server-side auth helpers:

- [src/lib/server-auth.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/lib/server-auth.ts)
- [src/proxy.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/proxy.ts)

### Guest users

Guests can:

- navigate the app
- view demo data
- inspect the UI

Guests cannot:

- add income
- add expenses
- save OCR results
- add portfolio holdings
- import portfolio files
- generate/download real reports
- switch to live mode
- change settings

### Signed-in users

Signed-in users get:

- their own isolated app data
- clean live-mode state by default
- full access to app features

## Data Model

The app uses Zustand locally for responsive UI state and Cloudflare D1-backed persistence for signed-in users.

Persisted financial data includes:

- income entries
- expense entries
- receipt scans
- portfolio holdings
- assets
- liabilities
- budget limits
- saved portfolio analysis history

Important distinction:

- guest/demo browsing is still local-only
- signed-in users sync their financial workspace to Cloudflare D1 by Clerk user ID
- budget limits
- notification preferences
- app mode

Main store:

- [src/store/useAppStore.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/store/useAppStore.ts)

Important note:

- data is isolated per Clerk user in the app state
- this is not yet a full cloud database for cross-device sync

## Security Notes

- security headers are configured in [next.config.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/next.config.ts)
- `/api/*` routes are protected with Clerk middleware plus route-level auth checks
- AI routes use:
  - Pro subscription enforcement
  - per-user rate limiting
  - prompt-injection filtering
  - audit logging of original user messages
- receipt uploads are limited to JPEG, PNG, and WEBP and are re-encoded before OCR to strip metadata
- spreadsheet imports are limited by MIME type, magic bytes, file size, and schema checks before parsing

Current rate-limited/server-guarded routes:

- [src/app/api/ai/chat/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/ai/chat/route.ts)
- [src/app/api/portfolio/analyze/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/portfolio/analyze/route.ts)
- [src/app/api/receipts/ocr/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/receipts/ocr/route.ts)
- [src/app/api/market/saudi/quotes/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/market/saudi/quotes/route.ts)
- [src/app/api/market/global/quotes/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/market/global/quotes/route.ts)

## OCR Flow

Receipt OCR flow lives in:

- [src/app/expenses/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/expenses/page.tsx)
- [src/app/api/receipts/ocr/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/receipts/ocr/route.ts)

Current OCR UX:

- upload receipt image
- or capture directly from mobile camera
- run OCR
- review extracted data
- edit merchant, amount, date, category, description, and raw text
- save as expense

Upload safety:

- accepted image types: JPEG, PNG, WEBP
- max receipt size: 10MB
- EXIF/device metadata is stripped before OCR submission
- OCR never auto-saves into expenses without explicit user review and confirmation

## Portfolio Import

Portfolio import supports Excel/CSV.

Sample files:

- [public/samples/wealix-portfolio-import-sample.xlsx](/Users/mohammedzaher/projects/Wealixapp%20v2/public/samples/wealix-portfolio-import-sample.xlsx)
- [public/samples/wealix-portfolio-import-sample.csv](/Users/mohammedzaher/projects/Wealixapp%20v2/public/samples/wealix-portfolio-import-sample.csv)

Portfolio screen:

- [src/app/portfolio/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/portfolio/page.tsx)

Import safeguards:

- accepted import types: XLSX, XLS, CSV
- max spreadsheet size: 2MB
- ZIP/XLSX magic bytes are verified
- macro-enabled or external-link spreadsheets are rejected
- formula cells are rejected before import
- required columns:
  - `ticker`
  - `shares`
  - `avgCost`

Sample publishing note:

- before committing a new sample XLSX, strip document metadata such as author/company/revision properties
- current sample file has already been cleaned in this repository

## Saudi Market Live Prices

Wealix can refresh live Saudi market prices for `TASI` holdings through the SAHMK API.

Used endpoints:

- `GET /quote/{symbol}/`
- `GET /quote/batch/?symbols=2222,1180,7010`
- `GET /market/summary/`

Current integration in this repo:

- Portfolio screen includes a `Refresh Saudi Prices` action for Saudi holdings
- server route:
  - [src/app/api/market/saudi/quotes/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/market/saudi/quotes/route.ts)

Required env var:

```env
SAHMK_API_KEY=
```

Optional:

```env
SAHMK_API_BASE=https://app.sahmk.sa/api/v1
```

Notes:

- SAHMK auth uses the `X-API-Key` header
- Wealix normalizes Saudi tickers like `2222.SR` to `2222` before calling the API
- the current refresh action updates `currentPrice` for `TASI` holdings in the local portfolio state
- non-Saudi exchanges are left unchanged

Reference:

- [SAHMK tutorial: Build a Saudi Stock Tracker in Python](https://www.sahmk.sa/developers/tutorials/build-saudi-stock-tracker-python)

## EGX And US Market Prices

`EGX`, `NASDAQ`, and `NYSE` refresh is currently deferred and not used in the live app flow.

Used API docs:

- [Twelve Data Overview](https://twelvedata.com/docs/introduction/overview)

Current integration in this repo:

- the experimental server route is still present:
- server route:
  - [src/app/api/market/global/quotes/route.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/api/market/global/quotes/route.ts)

Required env var:

```env
TWELVEDATA_API_KEY=
```

Optional:

```env
TWELVEDATA_API_BASE=https://api.twelvedata.com
```

What the route is intended to do later:

- refreshes `EGX`, `NASDAQ`, and `NYSE` holding prices
- fetches FX rates for:
  - `USD/SAR`
  - `EGP/SAR`
- lets the portfolio page show foreign holdings in local currency first, then SAR conversion with FX context when available

Ticker behavior:

- `NASDAQ` and `NYSE` holdings use the saved ticker directly, for example `AAPL`
- `EGX` holdings are normalized from patterns like `COMI.CA` to `COMI:EGX`
- if a symbol is not recognized by Twelve Data, that holding is left unchanged

Current portfolio UX behavior:

- Saudi holdings refresh from SAHMK
- EGX and US holdings are left unchanged for now
- foreign holdings show local market value first
- SAR conversion is only shown when an FX rate is available
- the page includes a data-source footer and last refresh timestamp

## EGX Data Source Evaluation

I also evaluated the `egxpy` project as a possible Egyptian Exchange data source:

- repo: [egxlytics/egxpy](https://github.com/egxlytics/egxpy)

What it currently is:

- a Python package
- focused on EGX historical data download
- includes portfolio optimization tooling
- includes a Streamlit web app

Important limitation:

- the repo README says `Provide an API for programmatic access` under future plans
- so it is not currently documented as a stable hosted HTTP API like SAHMK

Why that matters for Wealix:

- Wealix is a Next.js runtime, so SAHMK fits directly through server routes
- `egxpy` would be better used as:
  - a separate Python microservice
  - a preprocessing/sync job
  - or an offline importer for EGX pricing/history

Technical notes from the repo:

- package install:

```bash
pip install --no-cache-dir git+https://github.com/egxlytics/egxpy.git
```

- key dependency chain from the repo metadata:
  - `pandas`
  - `numpy`
  - `holidays`
  - `retry`
  - `tvDatafeed`

Current Wealix status:

- SAHMK is integrated directly for Saudi `TASI` live quotes
- `egxpy` is evaluated and documented, but not directly wired into the current Next.js runtime yet

Recommended EGX integration path:

1. Run `egxpy` in a small Python service or scheduled worker
2. Normalize the output to a simple JSON quote/history format
3. Expose a thin internal API that Wealix can call from Next.js
4. Update `EGX` holdings in the same way `TASI` holdings are refreshed today

If you want true EGX live refresh inside Wealix next, the cleanest path is for me to add a small Python adapter service around `egxpy`, then connect the Next.js app to that service.

## Reports

Reports are generated from source-specific data, not a single shared mock summary.

Current report mapping:

- Income Report -> income entries
- Expenses Report -> expense entries and receipt scans
- Budget Report -> budget limits plus period-filtered income/expenses
- Net Worth Report -> assets, liabilities, and portfolio value
- Portfolio Report -> portfolio holdings
- FIRE Report -> savings rate and net worth context
- Annual Review -> combined financial datasets

Reports screen:

- [src/app/reports/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/reports/page.tsx)

## Deployment

## Deploy to Vercel

### 1. Push the repo to GitHub

Make sure your latest code is committed and pushed.

### 2. Import the repo into Vercel

In Vercel:

1. Create a new project
2. Import the GitHub repository
3. Let Vercel detect Next.js

### 3. Add environment variables in Vercel

Add these in:

- Project Settings
- Environment Variables

Required:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATALAB_API_KEY=
SAHMK_API_KEY=
TWELVEDATA_API_KEY=
```

Optional:

```env
DATALAB_API_BASE=https://www.datalab.to
CHANDRA_API_KEY=
SAHMK_API_BASE=https://app.sahmk.sa/api/v1
TWELVEDATA_API_BASE=https://api.twelvedata.com
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

Recommended scope:

- Production
- Preview
- Development

### 4. Redeploy

Any env var change requires a new deployment.

### 5. Verify production

Check:

1. Homepage loads
2. Guest can browse demo data
3. Sign up works
4. After sign-in, user starts with clean live data
5. Settings open correctly
6. Reports open
7. Receipt OCR works with a real Datalab key
8. Unauthenticated API calls return `401`
9. Non-Pro AI access returns `403`

## Deploy to Netlify

This repo can also be deployed to Netlify, but Vercel is the more natural fit for the current Next.js App Router setup.

If deploying to Netlify:

1. Connect the GitHub repo
2. Set build command:

```bash
bun run build
```

3. Publish output using the Next.js runtime/plugin setup your Netlify project expects
4. Add the same env vars:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATALAB_API_KEY=
SAHMK_API_KEY=
TWELVEDATA_API_KEY=
```

## Deploy to Cloudflare Workers

This repo uses OpenNext for Cloudflare Workers deployments, not the deprecated `next-on-pages` adapter.

Current config files:

- [wrangler.jsonc](/Users/mohammedzaher/projects/Wealixapp%20v2/wrangler.jsonc)
- [open-next.config.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/open-next.config.ts)
- [next.config.ts](/Users/mohammedzaher/projects/Wealixapp%20v2/next.config.ts)
- [public/_headers](/Users/mohammedzaher/projects/Wealixapp%20v2/public/_headers)

Current Cloudflare scripts:

```bash
npm run preview
npm run deploy
npm run cf:build
npm run cf-typegen
```

### Step-by-step: Cloudflare Workers deploy

Use Cloudflare Workers or Workers Builds, not Cloudflare Pages with `next-on-pages`.

### 1. Create the Worker project in Cloudflare

In Cloudflare dashboard:

1. Open `Workers & Pages`
2. Choose `Create`
3. Choose `Import a repository` if you want Git-based deploys, or use Wrangler CLI deploy if you want manual deploys
4. If Cloudflare asks whether this is a Pages project or Worker project, choose `Workers`

### 2. Connect the GitHub repository

If using repository deploys:

1. Connect GitHub
2. Select the `mxaher/wealix2` repository
3. Production branch: `master`

### 3. Set the build and deploy commands

If Cloudflare asks for commands, use:

Build command:

```bash
npm run cf:build
```

Deploy command:

```bash
npm run deploy
```

If Cloudflare only asks for one build command in a Workers Build flow, use:

```bash
npm run deploy
```

Do not use:

```bash
npx @cloudflare/next-on-pages@1
```

Do not set a Pages-style static output directory like `.vercel/output/static`.

### 4. Add environment variables and secrets

In Cloudflare Workers / Workers Builds, add these under build variables and runtime secrets.

Required:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATALAB_API_KEY=
SAHMK_API_KEY=
TWELVEDATA_API_KEY=
```

Optional:

```env
DATALAB_API_BASE=https://www.datalab.to
CHANDRA_API_KEY=
SAHMK_API_BASE=https://app.sahmk.sa/api/v1
TWELVEDATA_API_BASE=https://api.twelvedata.com
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

Important:

- `NEXT_PUBLIC_...` variables must be available during build
- non-public secrets must also be available during build because Next.js may need them for server rendering and route setup

### 5. If deploying with Wrangler locally

Login:

```bash
npx wrangler login
```

Preview locally in the Workers runtime:

```bash
npm run preview
```

Deploy:

```bash
npm run deploy
```

### 6. If deploying with GitHub Actions

This repo already includes:

- [.github/workflows/cloudflare-workers-deploy.yml](/Users/mohammedzaher/projects/Wealixapp%20v2/.github/workflows/cloudflare-workers-deploy.yml)

Add these GitHub repository secrets:

```env
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATALAB_API_KEY=
SAHMK_API_KEY=
TWELVEDATA_API_KEY=
```

Optional GitHub secrets:

```env
DATALAB_API_BASE=
SAHMK_API_BASE=
TWELVEDATA_API_BASE=
NEXT_PUBLIC_APP_URL=
```

Then push to `master` and GitHub Actions will build and deploy to Cloudflare Workers.

### 7. Verify after deploy

Check:

1. `/` loads
2. `/app` loads
3. Clerk sign up and sign in work
4. Settings open
5. Portfolio loads
6. `Refresh All Prices` works for TASI via Sahmk and EGX/US via Twelve Data
7. Receipt OCR works with a valid Datalab key
8. Protected API routes return `401` when unauthenticated

### Notes from the current Cloudflare/OpenNext docs

- Cloudflare’s Next.js docs point existing apps to OpenNext on Workers, not `next-on-pages`
- OpenNext Cloudflare currently targets the Next.js Node runtime on Workers
- `export const runtime = "edge"` should be removed from app routes when using OpenNext Cloudflare
- adding `public/_headers` for immutable static caching is recommended
- `.open-next` should be ignored in git

## Deployment Troubleshooting

### Clerk works locally but fails in production

Check:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- Clerk production domain configuration
- redeploy after env var changes

### Receipt OCR fails in production

Check:

- `DATALAB_API_KEY` is set
- the key is valid
- your deployment can reach `https://www.datalab.to`

### Saudi live prices do not refresh

Check:

- `SAHMK_API_KEY` is set
- the key is valid for SAHMK
- your deployment can reach `https://app.sahmk.sa`
- your holdings are on `TASI`

### EGX or US prices do not refresh

Check:

- `TWELVEDATA_API_KEY` is set
- the key is valid for Twelve Data
- your deployment can reach `https://api.twelvedata.com`
- your holdings are on `EGX`, `NASDAQ`, or `NYSE`
- your EGX ticker format is compatible after normalization, for example `COMI.CA` -> `COMI:EGX`

### EGX live prices are not connected yet

Current status:

- the repo evaluation points to `egxpy` as a Python-based EGX data tool
- it is not yet wired into this Next.js runtime directly

If you want to enable EGX live refresh later, the recommended setup is:

- Python worker/service using `egxpy`
- internal JSON endpoint for quotes/history
- Next.js route that consumes that service for `EGX` holdings

### Guests can edit data

Guest restrictions are enforced in the feature pages and settings. If behavior regresses, review:

- [src/app/settings/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/settings/page.tsx)
- [src/app/income/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/income/page.tsx)
- [src/app/expenses/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/expenses/page.tsx)
- [src/app/portfolio/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/portfolio/page.tsx)
- [src/app/net-worth/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/net-worth/page.tsx)
- [src/app/budget/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/budget/page.tsx)
- [src/app/reports/page.tsx](/Users/mohammedzaher/projects/Wealixapp%20v2/src/app/reports/page.tsx)

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run lint
```

Database-related scripts currently in `package.json`:

```bash
bun run db:push
bun run db:generate
bun run db:migrate
bun run db:reset
```

These are present in the repo, but the production user-data path is now designed around Cloudflare D1 workspace persistence for signed-in users.

## Current Limits

- guest/demo data is still local-only by design
- OCR quality depends on the external Datalab/Chandra service and receipt image quality
- reports download as printable HTML, not true PDF
- EGX market data via `egxpy` is evaluated but not yet connected as a production runtime source

## Recommended Next Steps

- extend D1 persistence to advisor chat history and generated reports
- add server-side storage for receipts and reports
- add real subscription billing instead of local plan state
- add PDF generation for reports

## Validation

The app currently passes:

```bash
bun run lint
bun run build
```
