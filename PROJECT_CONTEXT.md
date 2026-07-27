# Home Hub - Development Context

**Last Updated:** July 19, 2026

> **Maintenance rule:** This is the single source of truth for project context.
> Every meaningful Claude Code commit should update this file in the same commit
> (structure changes, new features, and especially new entries in "Decisions &
> Gotchas"). GitHub issues are the task queue; commits/code are the mechanics;
> this doc is the durable narrative — structure, feature background, and the
> non-obvious decisions that code alone doesn't explain.

---

## 🏠 Project Overview

**Name:** Home Hub *(display name; "hero" removed from all user-facing copy)*  
**Description:** Beginner-friendly smart home device compatibility guide  
**Live URL:** https://home-hero-hub-xi.vercel.app  
**GitHub:** https://github.com/stratolabhq/home-hub *(repo renamed from
`home-hero-hub`; old URL still redirects)*  
**Supabase Project:** ladpczicpuycoqcfffzz  

> ⚠️ **Naming state:** Display name is "Home Hub" everywhere in visible copy.
> The Vercel URL (`home-hero-hub-xi.vercel.app`) and package name still carry
> the old name — intentionally unchanged. The GitHub repo was renamed to
> `home-hub`; the local git remote may still point at the old URL (redirect
> works). Updating the Vercel project + local remote is an open, deferred task.

---

## 🎯 Current Phase: Phase 1 — Easy On-Ramp

**Goal:** Ship a beginner-focused product first. Guide newcomers from picking a
platform → curated starter picks. Advanced/power-user surfaces (Protocol
Controllers, AI YAML Generator, Network Map) are gated behind an Advanced-mode
feature flag, deferred to Phase 2 pending user feedback + sensor research.

**Gating mechanism:** `NEXT_PUBLIC_ADVANCED_MODE` env flag, read via
`src/lib/feature-flags.ts` (exports `ADVANCED_MODE`). Off by default →
advanced routes show a friendly "Almost ready" guard instead of 404; advanced
nav/homepage/footer links hidden; embedded dashboard NetworkDiagram hidden.

**Phase 1 locked decisions:**
- Beginner-facing term for Alexa/Google/etc. = **"platform"** (not "ecosystem")
- "Coming Soon" heading style = **"Almost ready"**
- No email capture on Coming Soon screens
- Home Assistant card kept in the easy build with simplified copy
- Homepage funnel = pick platform → curated starter picks (not raw search)
- Popularity signal = existing `products.is_popular` boolean (deliberate
  placeholder, designed to be swapped later)

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 16.1.6
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **State Management:** React Hooks

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Email/Password)
- **Storage:** Supabase Storage (images)

### Deployment & CI/CD
- **Hosting:** Vercel (auto-deploys on git push to main)
- **CI/CD:** GitHub Actions → build/deploy → auto-closes issues via `Fixes #N`
- **Monitoring:** Built-in Vercel monitoring

### APIs & Integrations
- **Amazon Affiliate:** generateAmazonLink() for product links
- **Matter Database:** CSA-IoT REST API for device discovery
- **Web Scraping:** axios + cheerio (no Puppeteer)

---

## 🔄 Workflow

Established loop for each unit of work:
1. Create a GitHub issue (from the Phase 1 plan or ad hoc)
2. Generate a paired Claude Code prompt (with ready-to-run git commands)
3. Run the prompt in Claude Code; verify `npm run build` (and lint for touched files)
4. Commit with `Fixes #N`, push
5. GitHub Actions deploys and auto-closes the issue
6. Update this doc if the change affects structure/decisions

**Git hygiene:** `.claude/settings.local.json` is gitignored, so `git add .` is
safe. Standard commit types: `feat` / `fix` / `refactor` / `style` / `docs` /
`db` / `chore`.

---

## 🗄️ Database Schema

### **products** Table
Main product database. **2,276 total rows** (not 10,800 — see Decisions &
Gotchas, 2026-07-19); **868 curated** (`is_popular = true`), the Phase 1
beginner-facing set. Category values are inconsistent/scraped (`Climate` vs
`Climate Control`, `plugs` vs `Outlets & Plugs`, casing varies) — Phase 2
cleanup territory, not yet normalized.

**Key Columns:**
- `id` (UUID) - Primary key
- `name` (TEXT) - Product name
- `brand` (TEXT) - Manufacturer
- `model_number` (TEXT) - Model
- `category` (TEXT) - Device type (Lighting, Security, etc.)
- `price` (DECIMAL) - USD price
- `image_url` (TEXT) - Product image
- `description` (TEXT) - Product details

**Protocol Columns:**
- `protocols` (TEXT[]) - Supported protocols: Zigbee, Z-Wave, WiFi, Matter, Thread
- `matter` (BOOLEAN) - Matter certified
- `thread` (BOOLEAN) - Thread support
- `zigbee_version` (TEXT) - Zigbee 1.2, 3.0, etc.
- `zwave_version` (TEXT) - Z-Wave 500, 700, 800

**Ecosystem Compatibility:**
- `alexa` (BOOLEAN) - Works with Amazon Alexa
- `google_home` (BOOLEAN) - Works with Google Home
- `apple_homekit` (BOOLEAN) - Works with HomeKit
- `smartthings` (BOOLEAN) - Works with SmartThings
- `home_assistant` (BOOLEAN) - Works with Home Assistant

> ⚠️ See "Decisions & Gotchas": `home_assistant` is a standalone column, NOT part
> of the ecosystem-select values used by the compatibility page filter.

**Controller/Hub Specific:**
- `is_controller` (BOOLEAN) - Is a coordinator/controller/hub
- `subcategory` (TEXT) - Zigbee Coordinator, Z-Wave Controller, etc.
- `chipset` (TEXT) - CC2652P, EFR32MG21, etc.
- `connection_type` (TEXT) - USB, Ethernet, WiFi, Raspberry Pi HAT
- `max_devices` (INTEGER) - Maximum devices supported
- `ha_setup_difficulty` (TEXT) - Easy, Medium, Advanced
- `ha_notes` (TEXT) - Setup notes for Home Assistant
- `tags` (TEXT[]) - Searchable tags
- `recommended_for` (TEXT[]) - Recommended for users/use-cases
- `pros` (TEXT[]) - Advantages
- `cons` (TEXT[]) - Disadvantages

**Metadata:**
- `is_popular` (BOOLEAN) - Featured/popular device *(Phase 1 popularity signal —
  see Decisions & Gotchas; designed to be swapped for bestseller/click data)*
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### **user_products** Table
User's personal device inventory. UNIQUE(user_id, product_id) constraint removed
so the same product can be added multiple times (different rooms/quantities).
Columns: `id`, `user_id`, `product_id`, `room`, `custom_name`, `purchase_date`,
`notes`, `quantity`, `created_at`, `updated_at`.

### **user_settings** Table
Per-user smart home config. Columns include `protocols_used` (TEXT[]),
`hub_type`, coordinator/controller/router name+id pairs per protocol,
`primary_ecosystem`, `secondary_ecosystems`, `network_name`, `home_location`,
timestamps. `user_id` is UNIQUE.

### **amazon_clicks** Table
Affiliate click tracking: `id`, `user_id` (nullable), `product_id`, `clicked_at`.
*(Candidate future source for the popularity signal — see Gotchas.)*

### **device_requests** Table
User device-add requests: `id`, `user_id` (nullable), `device_name`, `brand`,
`category`, `reason`, `status` (pending/approved/rejected), `votes`, timestamps.

---

## 📁 Project Structure

```
home-hub/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage (platform funnel)
│   │   ├── layout.tsx                  # Root layout + metadata
│   │   ├── login/ · signup/            # Auth (password toggle)
│   │   ├── dashboard/page.tsx          # User dashboard (NetworkDiagram gated)
│   │   ├── my-products/page.tsx        # User device inventory
│   │   ├── compatibility/page.tsx      # Device search & filtering (funnel target)
│   │   ├── settings/page.tsx           # Smart home settings wizard
│   │   ├── controllers/page.tsx        # Protocol controllers (ADVANCED — guarded)
│   │   ├── tools/yaml-generator/       # AI YAML Generator (ADVANCED — guarded)
│   │   ├── guides/                     # Setup guides (Phase 2)
│   │   ├── getting-started/page.tsx    # Beginner guide
│   │   ├── request-device/page.tsx     # Request device form
│   │   └── admin/                      # Admin dashboard + subpages
│   ├── components/
│   │   ├── Navigation.tsx              # Main nav (advanced links gated)
│   │   ├── DeviceCard.tsx · DeviceExampleImage.tsx
│   │   ├── NetworkDiagram.tsx          # D3 diagram (ADVANCED — Phase 2)
│   │   ├── AffiliateDisclosure.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.ts · isAdmin.ts
│   │   ├── feature-flags.ts            # ADVANCED_MODE flag helper
│   │   ├── popular-filter.ts           # Single swap point for popularity signal
│   │   ├── curated-counts.ts           # Live curated (is_popular) count queries
│   │   ├── category-slugs.ts           # Category card metadata + slug→DB category map
│   │   ├── controller-matcher.ts       # Compatibility algorithm
│   │   ├── amazon-affiliate.ts
│   │   └── scrapers/                   # philips-hue, wyze, kasa, matter, bestsellers
│   └── styles/globals.css              # Tailwind + forest green theme
├── public/device-examples/             # ecosystem, device-type, protocol images
├── scripts/                            # scraper runners, controller import
├── data/                               # data quality reports, controllers json
├── .github/workflows/                  # deploy, codeql
└── config files (package.json, tsconfig, tailwind, next.config)
```

---

## 🎨 Design System

**Brand greens:** Primary `#2e6f40` (forest) · Hover `#3d8b54` · Dark `#1f4d2b` ·
Light BG `#f0f9f2`
**Ecosystem colors:** Alexa `#1f5a96` · Google `#EA4335` · HomeKit `#555555` ·
Home Assistant `#03A9F4` · SmartThings `#009FDA` · Hubitat `#6B4FA4`
**Typography:** Bold sans headings, regular sans body, monospace for code.

---

## 🧠 Decisions & Gotchas

> Append-only log of non-obvious decisions and traps. Newest first. Each entry:
> date — the thing — why it matters.

- **2026-07-19 — "Curated" = `is_popular = true` for Phase 1; full catalog
  cleanup deferred to Phase 2.** Live-queried ground truth: **2,276** total
  `products` rows, **868** with `is_popular = true`. Neither the old "10,800"
  copy nor a bare "868" was ever backed by a query — 10,800 was stale/wrong,
  and 868 (while numerically correct) was a hardcoded string, not derived.
  All beginner-facing counts (homepage hero stat, "How It Works" and CTA
  copy, category cards) now come from `src/lib/curated-counts.ts`
  (`getCuratedTotal` / `getCuratedCategoryCounts`), which both route through
  `applyPopularFilter` so "curated" stays defined in exactly one place. The
  raw ~2,276-row catalog is untouched in the DB and stays reachable via the
  compatibility page's "see all devices" escape hatch — Phase 1 only changes
  what's shown *by default*, never deletes or hard-filters data. Full
  category-level taxonomy cleanup (duplicate/inconsistent category values —
  see products table note above) is explicitly Phase 2, not done here.

- **2026-07-19 — Homepage category cards now deep-link with real counts, and
  `?category=` is finally read by the compatibility page.** Previously the
  cards had no counts and their `/compatibility?category=X` links were dead —
  the compat page only ever parsed `ecosystem`/`popular`, so every card landed
  on the same unfiltered list regardless of category (the same class of bug as
  the Doorbells/Security duplicate fixed in commit 5262c88). Card metadata +
  the slug → `products.category` mapping now live together in
  `src/lib/category-slugs.ts`, used by both `DeviceCategoryShowcase` (counts)
  and `compatibility/page.tsx` (filtering), so a card's number always matches
  what loading it returns. The "Smart Locks" card intentionally maps to a
  `Locks` category that doesn't exist in the data (locks are
  `category = 'Security'`, `type = 'smart_lock'` — no distinct category yet),
  which makes it correctly hide itself via the zero-curated-count rule instead
  of either showing "0 devices" or silently duplicating Security's count.

- **2026-07-19 — Compatibility page has no chipset/protocol-version/connection-type
  filters.** Those live on the Controllers page (`/controllers`) only. The
  Compatibility page's actual "advanced" tier is just specific protocol toggles
  (Zigbee/Z-Wave/Thread/Matter/etc.) and the "works with my ecosystem" inventory
  match — everything else (search, sort, platform select, category, price,
  popular-only, Home Assistant toggle) stayed in the beginner-visible default
  view since none of it requires protocol knowledge. Check the actual `Filters`
  interface before assuming a filter list from a planning doc matches the page.

- **2026-07-18 — Home Assistant is NOT an ecosystem-select value.** In the DB,
  `home_assistant` is its own BOOLEAN column, separate from the ecosystem keys
  (`alexa`/`google_home`/`apple_homekit`) the compatibility page's filter select
  uses. The compat page translates `ecosystem=home_assistant` (URL param) into
  `homeAssistant: true` internally. Skip this translation and HA queries silently
  return zero results. Affects any platform-filtering work.

- **2026-07-18 — Compatibility page previously ignored URL params entirely.** It
  only restored filters from localStorage, so every `/compatibility?ecosystem=…`
  link was silently non-functional before the funnel work. Now parses via
  `useSearchParams` (Suspense-wrapped, matching the `controllers/page.tsx`
  pattern). Any new deep-link into compat must go through that param parsing.

- **2026-07-18 — `is_popular` is a deliberate placeholder.** It's the Phase 1
  popularity signal, read ONLY through `src/lib/popular-filter.ts`
  (`applyPopularFilter(query, popularOnly)`). To upgrade to Amazon-bestseller or
  `amazon_clicks`-ranking data later, change that one helper — do NOT scatter
  `is_popular` checks elsewhere or the funnel will need rebuilding.

- **2026-07-18 — Beginner-facing term is "platform," not "ecosystem."** Copy
  decision for Phase 1. "Ecosystem" is insider vocabulary; beginners recognize
  "the assistant I already own." Internal/DB code still uses "ecosystem" keys.

- **2026-07-18 — Gate the control, not just the content.** When hiding advanced
  features, hide the entry control too (e.g. the dashboard "Network View" toggle),
  not just the rendered output. A button that leads nowhere is worse than no button.

- **2026-07-18 — "hero" removal was visible-text-only.** Find/replace of "hero"
  risks colliding with CSS classes (`hero-section`), component names, and image
  paths. Scope strictly to user-facing copy. Repo/URL/package name left as-is.

- **2026-07-18 — Repo-wide lint debt is tracked separately (GitHub #3).** ~103
  pre-existing `no-explicit-any` / unescaped-entity problems in unrelated files
  (NetworkDiagram, rate-limit, scrapers). Feature issues should require lint-clean
  for TOUCHED FILES only, not whole-repo, so this debt doesn't block features.

---

## 📜 Feature History

> Short background per shipped feature. Full mechanics live in git history.

**Phase 1 — Easy On-Ramp (July 2026)**
- **Advanced-mode feature flag** (commit a8bee4d) — `NEXT_PUBLIC_ADVANCED_MODE` +
  `feature-flags.ts`. Gates Protocol Controllers, AI YAML Generator, Network Map.
  Advanced routes show "Almost ready" guard when off.
- **Phase 1 UX copy + Home Hub rename** (commit 015d49f) — beginner-friendly
  homepage funnel copy, "Almost ready" guards, "Home Hero Hub" → "Home Hub" in
  all visible text.
- **Dashboard NetworkDiagram gate** (commit 2479f56) — embedded D3 diagram +its
  "Network View" toggle gated behind ADVANCED_MODE (the map isn't a route).
- **Platform → curated starter picks funnel** (commit dfed018) — homepage platform
  picker as primary CTA → `/compatibility?ecosystem=<v>&popular=1`. "Starter view"
  caps to 8 devices (no-hub → WiFi → cheapest). Added `popular-filter.ts`; fixed
  the URL-param-parsing gap on the compat page.
- **Beginner-safe Compatibility filter defaults** — protocol toggles and "works
  with my ecosystem" demoted behind a closed-by-default "More filters" expander;
  platform/category/price/popular/Home-Assistant stay visible. Expander
  auto-opens (never auto-closes) whenever a restored advanced filter is active,
  so nothing applied is ever hidden. "Ecosystem" filter label renamed to
  "Platform" for terminology consistency. localStorage persistence and the
  Issue 2 starter-view/URL-param logic untouched.
- **Honest, consistent device counts via curated set** — replaced every
  hardcoded/ad-hoc device count on beginner-facing surfaces (homepage hero
  stat, "How It Works"/CTA copy, category cards) with live queries through new
  `src/lib/curated-counts.ts` helpers, built on the existing `is_popular`
  signal (`applyPopularFilter`). Homepage category cards gained real curated
  counts and their `?category=` links now actually filter (previously dead —
  see Decisions & Gotchas). Zero-curated-count categories (e.g. "Locks," which
  has no distinct DB category yet) hide their card instead of showing
  "0 devices." Full ~2,276-row catalog untouched in the DB; still reachable
  via the compatibility page's "see all devices" escape hatch.

**Pre-migration / earlier (March 2026)**
- Password visibility toggle; profile dropdown nav; user settings wizard +
  `user_settings` table; device example images; homepage visual enhancements;
  duplicate-product fix (removed UNIQUE constraint); device-request submission fix.
- Device database: 10,800+ devices (Philips Hue, Wyze, Kasa, Matter CSA-IoT).
- Admin dashboard, device/request/user management, analytics, YAML generator.
- Amazon affiliate links + click tracking.

---

## 📋 Phase 1 Remaining Work

Tracked as GitHub issues (labels: `phase-1`). Checklist "Issue N" labels are
planning names and do NOT match GitHub issue numbers.

- Dead/duplicate links + legal pages (Privacy, Terms, About, affiliate
  disclosure, fix Doorbells card duplicating Security filter)
- Confirm My Products fits beginner flow (zero-device empty state)
- QA pass + ship
- Clear repo-wide lint debt (GitHub #3)
- Update Vercel project + local git remote to `home-hub` (optional)

## 🔮 Phase 2 Backlog (do NOT build yet)

Gated on user feedback + sensor research. Re-introduce Protocol Controllers,
AI YAML Generator, Network Map under Advanced mode; controller finder wizard;
5 setup guides (ZHA, Zigbee2MQTT, Z-Wave JS, Matter, Thread); advanced filtering
+ comparison; user reviews; decide Advanced-mode opt-in (toggle vs. progressive
unlock). Upgrade popularity signal from `is_popular` to bestseller/click data.

---

## 📞 Key Resources

**GitHub:** https://github.com/stratolabhq/home-hub · Owner: Alex (stratolabhq) ·
alex.dickerson13@gmail.com
**Supabase:** https://supabase.com/dashboard/project/ladpczicpuycoqcfffzz
**Vercel:** https://vercel.com/stratolabhqs-projects/home-hero-hub

**Claude project integrations:** Gmail, Google Calendar, Google Drive connected.
GitHub connector pending (registry opt-in step).
