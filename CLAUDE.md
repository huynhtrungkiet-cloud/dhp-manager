# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

**DHP Manager** — a production-management suite for the CK368 machine shop
(Đại Hồng Phát): orders, routing/stage scheduling, staff assignment calendar,
outsourcing, NCR, KPI, product catalogue, SKU coding, CRM and an engineering
advisor/quoting tool.

Key facts that shape every change:

- **No build step, no package manager, no tests.** Every app is a single
  self-contained HTML file with inline `<style>` and `<script>`. There is no
  `package.json`, no bundler, no CI. "Deploy" = commit to `main`; GitHub Pages
  serves the repo root at `https://huynhtrungkiet-cloud.github.io/dhp-manager/`.
- **Vanilla JS only.** No framework, no modules (`<script>` tags, globals). The
  only external dependency is `@supabase/supabase-js@2` loaded from jsDelivr.
- **The UI, comments, data and docs are in Vietnamese.** Write new UI strings,
  code comments and commit messages in Vietnamese to match. `index.html` has a
  partial VI/EN i18n layer (`LANG`, `stLabel()`); other apps are VI-only.
- **Users are shop-floor staff, not developers.** Error handling favours loud,
  plain-language alerts and safety brakes over silent failure.

## File map

### Applications (each opens standalone in a browser)

| File | App |
|---|---|
| `index.html` | **DHP Manager** — the main app (~5.6k lines): dashboard, assignment calendar, orders + routing, worker "today" view, process board, customers, KPI, outsource, NCR, data/sync tab. |
| `dhp_coding.html` | **DHP Coding** — product catalogue + structured SKU/BOM code generation. Owns the `products` table. |
| `dhp_tools.html` | **DHP Engineering Advisor** — coupling selection advice + machining quotes. |
| `dhp_crm.html` | **DHP CRM** — sales pipeline & customers. |
| `dhp_db.html` | **Engineering Database** — materials & standards reference. |
| `dhp_platform.html` | Launcher/hub linking the apps. |
| `doi-mat-khau.html` | Offline tool that turns a new password into the salted SHA-256 hash to paste into the source. |

### Shared code & assets

- `dhp_core.js` — `DHPCore`: shared login gate, role/password hashing, Supabase
  config + client, `{id, data, updated_at}` table helpers (`list`, `upsert`,
  `upsertMany`, `remove`, `subscribe`), `nextProjectSeq()`. Loaded by
  `dhp_tools.html`, `dhp_crm.html`, `dhp_db.html`, `dhp_platform.html`.
  **`index.html` and `dhp_coding.html` do NOT use it** — they carry their own
  copies of the gate and sync logic, so password/role changes must be applied
  in every place (see *Passwords* below).
- `seed_orders.js` — `SEED_ORDERS_ALL`, seed order data loaded by `index.html`.
- `catalogue_full.csv`, `catalogue_img/` — product catalogue seed + images.
- `manifest.json`, `service-worker.js`, `icon.svg`, `logo.png`/`logo.svg`,
  `LOGO.PNG` — PWA shell and branding.

### SQL (paste into Supabase → SQL Editor → Run; all idempotent)

- `supabase_rls_2026-08-30.sql` — hardening: `dhp_trash` (soft-delete copies),
  `dhp_audit` (change log), `dhp_snapshot()`.
- `supabase_coding_B.sql` — `cs_customers`, `cs_projects`, `cs_assemblies`,
  `cs_skus` + `cs_next_project_seq()` RPC.
- `supabase_tools.sql` — `tools_cases`, `tools_quotes`.
- `supabase_crm.sql` — CRM tables.

### Documentation (Vietnamese)

`HUONG_DAN_NGUOI_DUNG.md` (end users), `HUONG_DAN_DEPLOY_GitHubPages.md`
(deploy/PWA install), `SUPABASE_SETUP.md` (backend setup), plus printable HTML
SOPs: `SOP_CK368.html`, `HUONG_DAN_VAI_TRO.html`, `HUONG_DAN_QC_QCP.html`,
`HUONG_DAN_VAN_HANH_CK368.html`, `HUONG_DAN_DHP_CODING.html`,
`HUONG_DAN_DHP_TOOLS.html`, `NOI_QUY_XUONG_5S.html`, `CHUAN_MA_DHP.html`,
`BieuMau_CK368.html`.

## Architecture

### Storage: localStorage first, Supabase as shared store

`index.html` keeps everything in one object `DATA` (see `defaultData()`),
persisted as JSON under `localStorage['dhp_hub_v3']` (`STORAGE_KEY`; `v1`/`v2`
are read for migration only). `DATA.meta.supaUrl` / `DATA.meta.supaKey` hold the
Supabase credentials — hence `dhp_core.js` reads the *same* key (`CFG_KEY =
'dhp_hub_v3'`) so all apps on the origin share one connection.

`DATA` arrays map to Supabase tables via `SUPA_TABLES`:

```
orders→orders  customers→customers  staff→staff  assignments→assignments
outsourceShipments→outsource_shipments  ncrRecords→ncr_records  products→products
```

Every table has the shape `(id text primary key, data jsonb, updated_at
timestamptz)` — the whole record lives in `data`. Sync is:

- `supaPush(changedOnly)` — `changedOnly=true` (auto-sync) diffs against
  `_syncSnap` and upserts/deletes only what changed; `false` pushes everything.
- `supaPull()` — replaces local arrays, then re-derives (`rebuildPartners`,
  `sanitizeOrderDates`, `ensureCustomersFromOrders`, `repairDuplicateIds`) and
  resets the sync snapshot.
- `supaSubscribe()` — `postgres_changes` on all tables for real-time updates.

**Invariants you must not break** (each was a real data-loss incident, dated in
the comments):

1. **Manager never writes `products`** — DHP Coding owns the catalogue;
   `supaPush` explicitly skips it.
2. **Mass-delete brake** — `supaPush` refuses to delete when local is empty or
   >20% (and >3) of records disappeared; it alerts and keeps the server intact.
3. **No push before first pull** — `_syncReady` guards auto-push so a stale
   machine cannot overwrite the shared store at startup.
4. **Failed local save must not push** — if `localStorage.setItem` throws,
   `save()` writes an emergency `dhp-cuu-ho-*.json` download and suppresses the
   push.
5. **Unique ids across machines** — `uid()` mixes counter + per-device
   `dhp_device_tag` + timestamp. Display codes (`o.code`) may still collide;
   `findDuplicateCodes()` reports rather than auto-fixes (codes are printed on
   paper).

### Auth & roles

Four roles, ascending: `viewer` < `worker` < `editor` < `admin`, stored in
`localStorage['dhp_role']`; login flags are `dhp_gate_ok` (Manager/CRM/DB/
platform) and `dhp_coding_ok` / `dhp_tools_ok`. Passwords are never in source —
only salted SHA-256 hashes (salt `dhp-ck368-2026`), duplicated in
`window.DHP_PASS_HASHES` (`index.html`) and `PASS_HASHES` (`dhp_core.js`).
`canEdit()` gates all mutations.

**Changing a password**: run `doi-mat-khau.html`, then paste the new hash into
*both* `index.html` and `dhp_core.js` (and any app carrying its own copy).
Never commit a plaintext password — the repo has been public.

### Domain model (index.html)

- `ORDER_STATUSES` — 9 statuses (`new` → `delivered`, plus `hold`).
- `ORDER_PHASES` — 5 coarse phases for "where is this order" at a glance.
- `STAGE_PRESETS` — routing operations with **fixed letter codes** (A=Tiện,
  B=Phay, C=Cắt dây, …, L=Mua phôi, N=Vận chuyển). Repeats append a number
  (A, A2, A3). Codes are stable — do not renumber them.
- Scheduling: `HOURS_PER_DAY = 8`; `stageHours`/`stageSpanDays` spread a stage
  across days, skipping Sundays. Order progress % is computed, never entered.
- `stageState` → `pending | doing | late | done`, coloured by `STAGE_COLORS`.
- `ORG_ROLES` — the org is modelled by **role**, not by person, so adding staff
  needs no logic change. `SEED_STAFF` / `SEED_PARTNERS` are seed data only.

### PWA

`service-worker.js` is deliberately **network-only** (`dhp-v4-nocache`) and
deletes all old caches — earlier cache-first versions served stale blank pages.
Do not reintroduce caching without a very good reason.

## Working conventions

- **Edit in place.** These are big single files; make surgical edits, keep the
  surrounding style (2-space indent, `const`/`let`, terse helpers, dense inline
  handlers). Don't reformat or "modernise" whole files.
- **Comment dated fixes.** The codebase marks behaviour changes with a date and
  a why (`// ===== PHANH AN TOÀN (thêm 30-08-2026) =====`). Follow that when
  fixing a real-world failure.
- **No new dependencies.** Anything added must work from a plain file:// or
  GitHub Pages load, offline-tolerant.
- **Verify by opening the file in a browser** (e.g. `python3 -m http.server`
  from the repo root, then load `index.html`) and checking the console. There is
  no test suite to run.
- **Schema changes** go in a new idempotent `supabase_*.sql` file (or extend an
  existing one) *and* in the app's table map — users apply SQL manually.

## Known rough edges

- `dhp_core.js` exports `VIEW_PASSCODE, WORK_PASSCODE, EDIT_PASSCODE,
  ADMIN_PASSCODE` on `DHPCore`, but those constants no longer exist (removed
  when passwords were hashed) — the export line throws a `ReferenceError` if
  evaluated. Fix by dropping them from the export object.
- `editor` and `worker` share the same password hash in `dhp_core.js`.
- Gate + sync logic is duplicated between `index.html`, `dhp_coding.html` and
  `dhp_core.js`; changes to auth must be mirrored.

## Git

Work on the assigned feature branch, commit in Vietnamese with a short
`Scope: what changed` subject (e.g. `Manager: chặn xoá hàng loạt khi local rỗng`),
and push with `git push -u origin <branch>`. `main` is live — pushing there
deploys immediately.
