# AGENTS.md — Wealix.app Codex Agent Instructions

## Project Identity

Wealix.app is a production-grade fintech platform deployed **exclusively** on
Cloudflare infrastructure. All agent tasks must respect and enforce this constraint.

---

## Primary Objective for This Session

Audit and refactor the entire codebase to ensure **100% compliance** with the
Cloudflare-native stack. Eliminate all references to forbidden databases, runtimes,
and infrastructure. Leave the codebase in a clean, deployable state via `wrangler deploy`.

---

## Cloudflare Infrastructure — Source of Truth

All data access in this repo is governed by `wrangler.jsonc`. Do not create
any database connection outside of these bindings:

| Binding Name     | Type        | Purpose                          |
|------------------|-------------|----------------------------------|
| `WEALIX_DB`      | D1 Database | Primary relational database      |
| `WEALIX_STORAGE` | R2 Bucket   | File and blob object storage     |
| `ASSETS`         | Static      | Next.js static asset serving     |

The D1 database name is `wealix-db` and database ID is
`99beaa7e-d8d3-4718-b4ab-e880803515a5`. This is the ONLY database.

---

## Tasks — Execute in Order

### TASK 1 — Audit for Forbidden Dependencies

Search `package.json`, `bun.lock`, and all source files under `src/` for any
of the following forbidden packages. If found, remove them entirely:

**Forbidden packages (remove from package.json and all imports):**
pg, postgres, mysql2, mongodb, mongoose,
redis, ioredis, @upstash/redis, @upstash/ratelimit,
better-sqlite3, sqlite3, libsql, @libsql/client,
@prisma/adapter-pg, @prisma/adapter-mysql,
@neondatabase/serverless, @planetscale/database,
aws-sdk, @aws-sdk/client-dynamodb, @aws-sdk/client-s3,
firebase, firebase-admin, @google-cloud/firestore

text

After removing, run: `bun install` to clean the lockfile.

---

### TASK 2 — Audit for Forbidden Environment Variables

Search all files (`.env`, `.env.local`, `.env.example`, `.env.production`,
any `*.ts`, `*.tsx`, `*.js` files) for these forbidden variable patterns:
DATABASE_URL
REDIS_URL
REDIS_HOST
MONGO_URI
MONGODB_URI
PG_HOST
PG_USER
PG_PASSWORD
POSTGRES_URL
PLANETSCALE_URL
TURSO_DATABASE_URL

text

If found, **delete them**. Data access must come from Wrangler bindings (`env.WEALIX_DB`),
not from environment variable connection strings.

---

### TASK 3 — Fix All Database Access Patterns

Search `src/` for any code that initializes a database client using a connection
string or TCP connection. Replace with the correct D1 pattern:

**❌ Pattern to find and eliminate:**
```typescript
// Any of these patterns must be deleted
new Pool({ connectionString: ... })
new PrismaClient()
createClient({ url: process.env.DATABASE_URL })
mongoose.connect(...)
new Redis(process.env.REDIS_URL)
```

**✅ Correct replacement pattern:**
```typescript
import { drizzle } from 'drizzle-orm/d1';

// Inside a Cloudflare Worker handler or Next.js route:
export async function handler(request: Request, env: Env) {
  const db = drizzle(env.WEALIX_DB);
  // ... query using drizzle
}
```

Ensure the `Env` type interface in `src/` (typically in `env.d.ts` or `types/`)
declares `WEALIX_DB: D1Database` and `WEALIX_STORAGE: R2Bucket`.

---

### TASK 4 — Fix Caching Layer (Redis → Cloudflare KV)

The file `fix-redis.sh` at the root indicates Redis was previously used or attempted.
Perform a full audit:

1. Search for any Redis client initialization in `src/`
2. Replace Redis caching calls with Cloudflare KV using `env.WEALIX_KV` IF a KV
   binding is added to `wrangler.jsonc`, OR use in-memory caching via a `Map`
   if the data is ephemeral per-request
3. Delete `fix-redis.sh` from the repository root after confirming no Redis remains

If a persistent KV cache is needed, add this to `wrangler.jsonc`:
```jsonc
"kv_namespaces": [
  {
    "binding": "WEALIX_KV",
    "id": "<create-via-wrangler-kv-namespace-create-WEALIX_KV>"
  }
]
```
Then use `env.WEALIX_KV.get()` / `env.WEALIX_KV.put()` for all caching needs.

---

### TASK 5 — Validate ORM Configuration

Confirm that Drizzle ORM is configured with the D1 adapter only:

1. Check `drizzle.config.ts` — the `driver` must be `"d1-http"` or dialect must be `"sqlite"`
2. Check all imports of `drizzle-orm` — only `drizzle-orm/d1` adapter is permitted
3. Check `cloudflare/` migrations directory — all schema migrations must be `.sql` files
   compatible with SQLite/D1 (no PostgreSQL-specific syntax like `SERIAL`, `JSONB`,
   `UUID` type, `RETURNING` with non-SQLite syntax, or `pg_*` functions)

**Forbidden Drizzle adapters:**
```typescript
import { drizzle } from 'drizzle-orm/node-postgres'  // ❌
import { drizzle } from 'drizzle-orm/postgres-js'    // ❌
import { drizzle } from 'drizzle-orm/mysql2'         // ❌
import { drizzle } from 'drizzle-orm/libsql'         // ❌

import { drizzle } from 'drizzle-orm/d1'             // ✅ only this
```

---

### TASK 6 — Validate Worker Compatibility

All server-side code must be compatible with the Cloudflare Workers runtime:

1. Search for Node.js built-in module imports that are NOT available in Workers:
import net from 'net'
import tls from 'tls'
import fs from 'fs'
import child_process from 'child_process'

text
Remove or replace these. Note: `nodejs_compat` flag is already set in `wrangler.jsonc`,
so `crypto`, `path`, `stream`, and `buffer` are available.

2. Ensure no `fetch` polyfills are imported — Workers has native `fetch`.

3. Ensure no `setTimeout`-based connection pooling or keep-alive logic exists
(Workers are stateless per invocation — no persistent connections).

---

### TASK 7 — Final Verification

After completing all tasks above, run these commands and confirm they pass:

```bash
# Type check — must pass with zero errors
bun run typecheck

# Lint — must pass
bun run lint

# Build for Cloudflare Workers
bun run build

# Dry-run deploy (does not publish, just validates)
wrangler deploy --dry-run
```

If `wrangler deploy --dry-run` succeeds, the codebase is compliant.

---

## Coding Standards for All Changes

- Use **TypeScript** for every file — no `.js` files in `src/`
- Use **Drizzle ORM** for all database queries — no raw SQL strings unless inside
a Drizzle `sql` template literal
- Use **async/await** — no callback patterns
- Preserve all existing Clerk authentication integrations untouched
- Preserve all existing Stripe integrations untouched
- Preserve all existing AI provider configurations (NVIDIA, Gemma) untouched
- Do not modify `wrangler.jsonc` bindings unless explicitly required by Task 4

---

## What Success Looks Like

When this session is complete, the following must be true:

- [ ] Zero references to PostgreSQL, MySQL, MongoDB, Redis, or any non-D1 database
- [ ] Zero forbidden packages in `package.json`
- [ ] Zero forbidden env variable patterns in any file
- [ ] All database access goes through `env.WEALIX_DB` (D1 binding)
- [ ] All file storage goes through `env.WEALIX_STORAGE` (R2 binding)
- [ ] `wrangler deploy --dry-run` completes without errors
- [ ] `bun run typecheck` completes without errors