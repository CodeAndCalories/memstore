# Memstore — Sale Preparation

**Status: READY TO LIST** — see checklist below for final user actions before going live.

## What this is
Memstore is a hosted AI memory API — agents and applications can `remember()`, `recall()` (semantic search), and `forget()` durable memories scoped per agent. It is positioned for developers building AI agents that need persistent, cross-session memory. Backed by OpenAI embeddings + Supabase pgvector, with a Python SDK and Stripe-metered billing wired end-to-end.

## Current state
- **Live URL:** https://memstore.dev (marketing site + docs; **API not currently deployed to a hosted endpoint** — code is production-quality but runs locally / dev-only).
- **Tech stack:** Node.js + Express backend, vanilla HTML/CSS/JS frontend, Supabase (Postgres + pgvector for vector search), OpenAI (text-embedding for memory storage), Resend (transactional onboarding email), Stripe (subscription + usage billing), Python SDK published-ready against `requests`.
- **Page count:** ~17 pages — 3 marketing/docs pages (index, quickstart, guide), 3 sub-docs pages, 1 admin dashboard, 10 SEO blog posts (LangChain, CrewAI, AutoGen, vector DB concepts), plus sitemap.xml.
- **Working features:**
  - Full bearer-token auth (bcrypt-hashed API keys with in-memory cache)
  - `POST /v1/agents` — creates agent + provisions API key + fires welcome email via Resend
  - `POST /v1/memory/remember` — stores embedding in pgvector (10K char limit per memory)
  - `GET /v1/memory/recall` — semantic search via cosine similarity (top_k + threshold params)
  - `DELETE /v1/memory/forget/:id` — agent-scoped deletion
  - `GET /v1/memory/list` — paginated listing (100 max)
  - Stripe webhooks (subscription state) + usage logging (ops_used vs ops_limit per plan)
  - Per-endpoint rate limiting
  - Python SDK with `from memstore import Memstore` API matching the HTTP surface 1:1
- **Known issues / partial work:**
  - ~~**Not deployed:** no Railway/Vercel/Docker config~~ ✅ Deploy configs now committed (`railway.json` + `Procfile` + `Dockerfile`); buyer can `railway up` or `docker build` from clean clone. The live `memstore.dev` is still marketing-only — buyer ships the API to their own infra.
  - No paid users / no traction data to show.
  - Two stray Claude worktree branches alongside `master` — clean up before transfer.
  - No automated test coverage on the API.

## Assets included in sale
- Code repo (this repo — github.com/CodeAndCalories/memstore)
- Python SDK (in `sdk/` — PyPI-ready, not yet published)
- [ ] Domain memstore.dev (TODO: confirm transfer terms with buyer)
- [ ] Marketing site hosting (TODO: confirm — currently appears to be a static deployment of `public/`)
- Database schema (Supabase: agents, memories, usage_log tables with pgvector indexes + RPC for semantic search)
- 10 SEO blog posts targeting AI-agent-developer keywords (LangChain, CrewAI, AutoGen, vector DB)
- [ ] Analytics history — TODO: export 90-day GSC data (clicks, impressions, top queries) and attach

## Suggested listing
- **Platforms:** Microacquire (SaaS API), Flippa, r/SaaS, r/LangChain, r/AI_Agents, direct outreach to LangChain/CrewAI ecosystem builders, devtool acquirers, and AI agent platform consolidators.
- **Asking price range:** $2,500–$8,000 standalone. The high end requires deploying first and showing at least minimal usage data. **Strong recommendation: combo-sell with ai-hub (aihubdash) as a bundled "AI agent developer toolkit"** — combined ask $6,000–$15,000. The two products integrate (ai-hub already has memstore client code baked in), and the bundle tells a coherent story to buyers.
- **Buyer profile:** Solo devtool founders, AI agent framework maintainers, infrastructure-tool acquirers, builders launching memory-as-a-service who want a head-start API + SDK + content moat.

## Listing copy (paste-ready)

**Headline:** Memory API for AI agents — Python SDK, pgvector backend, Stripe billing wired, 10 SEO blog posts

**Description:**
Memstore is a developer-focused memory API for AI agents — `remember()`, `recall()` (semantic search), and `forget()` durable memories scoped per agent. Backed by OpenAI embeddings and Supabase pgvector, with a Python SDK and Stripe-metered billing wired end-to-end. The codebase is production-quality MVP: real auth, real embeddings, real semantic search, real billing hooks, real onboarding email.

What you're buying: a working backend (5 endpoints), a Python SDK matching the HTTP surface 1:1, a marketing site with 10 SEO-optimized blog posts targeting AI-agent-developer keywords (LangChain, CrewAI, AutoGen, vector databases), full Supabase schema with pgvector RPC, Stripe-metered billing, and the memstore.dev brand.

What it needs: deployment. The API runs locally but is not yet hosted on a public endpoint. A buyer can ship to Railway or Fly.io in a day, publish the SDK to PyPI, and start onboarding paid users. There is no existing user base, so this is a code+brand+content+SEO play — the value is the head-start, not the traction.

**Highly recommended bundle:** Sell with aihubdash.com (multi-AI dashboard with built-in Memstore integration). The two products tell a coherent story: free dashboard funnels users into paid persistent memory.

Tech: Node.js + Express, Supabase Postgres + pgvector, OpenAI embeddings, Resend, Stripe (subscription + usage), Python SDK. ~5 working API endpoints, 10 SEO blog posts, full docs site.

## Before listing checklist

### Done in this prep pass
- [x] Buyer-ready README — "For Acquirers" section at top of `README.md` with quickstart, env vars, file map, hosting status, bundle play note
- [x] Deploy config added — `railway.json` (healthcheck at `/health`) + `Procfile` + `Dockerfile`
- [x] Demo screenshots staged — `public/screenshots/screenshots-needed.md` lists shots to capture
- [x] Security sweep complete — no live secrets in git history (all matches are placeholders, docs examples, or env-var references)

### User to do before listing
- [ ] Rotate Supabase, OpenAI, Stripe, Resend keys before transfer for clean buyer handoff
- [ ] Take real screenshots and save into `public/screenshots/` (see `screenshots-needed.md`)
- [ ] Deploy the API to Railway/Fly.io once before listing — a working demo URL bumps perceived value substantially
- [ ] Export 90-day GSC data for memstore.dev (clicks, impressions, top queries) — attach to listing
- [ ] Tag a release: `git tag v-for-sale && git push --tags`
- [ ] Clean up stray Claude worktree branches on origin
- [ ] Decide: publish Python + Node SDKs to PyPI/npm under your namespace, or note in listing that buyer claims them
- [ ] Document the Supabase schema migration / pgvector setup for buyer onboarding

## Notes for buyer
- The API is **not currently hosted** — the `memstore.dev` site is marketing-only. The codebase is feature-complete and ready to deploy; budget half a day for first deploy + DNS.
- pgvector RPC functions live in `database/` — these must be run on the buyer's fresh Supabase project before API works.
- Python SDK is in `sdk/` — it's a thin requests wrapper, easy to maintain or rewrite in TypeScript/Go.
- The 10 blog posts are AI-developer-aimed (LangChain, CrewAI, AutoGen, vector DB concepts) and target acquisition long-tail searches. They are quality content, not LLM-spam.
- **Bundle play:** ai-hub (aihubdash.com) is a multi-AI dashboard that already calls memstore.dev for optional persistent memory. Selling the two together creates a "free dashboard → paid memory" funnel that's an obvious upsell story for a buyer.
- No automated tests — add integration tests around `remember/recall/forget` and the Stripe webhook before scaling.
- Two stray Claude worktree branches exist in the repo — buyer should delete or you can clean before transfer.
