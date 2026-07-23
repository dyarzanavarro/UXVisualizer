# Connected Funnel Audit — Handoff to Claude Code

## What this is

A B2B tool that audits an eCommerce funnel (multiple pages/assets) not just per-page, but for **coherence between steps** — price mismatches, trust-signal drop-off, unfulfilled promises across the journey. This is the differentiated wedge: generic per-page CRO/heuristic audits are now commoditized (free AI prompt kits exist); nothing currently scores the seams between steps.

Product surface has evolved from "generate a PDF report" to **a canvas-based SaaS**: users drop in assets (URLs, uploaded images, pasted emails) as draggable nodes, connect them into a journey with edges, and each node/edge carries AI-generated findings. This is the product now — not a report generator with a UI bolted on.

## Where things stand

1. **Rubric defined and populated** — two source frameworks fully encoded:
   - `psyconversion_patterns.csv` — 131 behavior patterns tagged by journey phase (Wahrnehmung/Entscheidung/Kundenbindung + subcategories), sourced from the book's publicly available table of contents. Descriptions/detection hints/fixes written from general behavioral-science knowledge, NOT from the book's copyrighted text — spot-check against the actual book before relying on them for anything client-facing.
   - `vertrauensarchitektur_mechanisms.csv` — 10 trust mechanisms tagged by axis (Wollen/Können/Einschätzen), same sourcing caveat.
   - Flagged uncertain translations to double-check: Neomanie, Karma (as trust mechanism), Pseudo Justifikation, That's-Not-All-Technik, Money Omission, Hobson's +1 Choice Effect.
   - PsyConversion's ethics-boundaries stance matters for Low Ball Effect (PC-105) specifically — treat as a transparency requirement, not a manipulation tactic, when implementing.

2. **Scoring approach validated on a real site** — see `scoring-prompts.md`. Manually ran a 3-step coherence pass on mybacs.ch (home → product → cart) using the rubric. Two hypothesized findings were checked against the real site and confirmed:
   - Correctly flagged a real (benign) inconsistency in how a promotional offer was presented across steps.
   - Correctly flagged that trust signals do carry through into cart.
   - **Hard lesson**: text-only fetch missed JS-rendered elements entirely (cart badges, dynamic pricing logic). Any real pipeline must use Playwright screenshots, not fetch/text extraction.

3. **Architecture spec** — see `connected-funnel-audit-spec.md`. Written for the earlier "report generator" framing; requirements/rubric/prompt sections still apply, but the "no login, no dashboard" v0 scoping and the report-generation architecture section are now superseded by the canvas direction below. Treat FR-1 through FR-6 (capture, scoring, coherence, ICE ranking) as still valid; treat the "concierge phase, PDF output" framing as outdated.

4. **Canvas UX prototyped and validated** — `canvas-prototype-v2.jsx` is a working (mocked data) interaction prototype: draggable asset nodes (URL/image/email types), edges between nodes representing journey seams, click any node/edge to see findings in a side panel, manual edge-drawing by dragging a connector handle between nodes, real image upload with thumbnail rendering, email paste via modal. Built as a single-file React artifact (Tailwind + lucide-react only, no external graph library available in that sandbox) — this was explicitly a UX prototype, not production code.

5. **Landing page** — `connected-funnel-audit-landing.html` exists but was explicitly deprioritized by the user in favor of building the real product first. Low priority; may be useful later for outreach/marketing once something real exists to point at.

## What Claude Code should actually build

Rebuild the canvas properly, not port the prototype file as-is:
- **Stack**: Nuxt 3, TypeScript, Vue Flow (production node/edge canvas — proper pan/zoom/infinite canvas, unlike the fixed-viewport hand-rolled drag logic in the prototype), Pinia for canvas state, Firebase/Firestore or Postgres for persistence (need a decision — Firestore is faster to stand up, Postgres fits the relational rubric-rule data model better; the rubric CSVs and structured findings suggest Postgres is the better long-term fit, but weigh against solo build speed).
- **Backend**: Playwright for capture (mandatory — see lesson above), Claude API for the two scoring calls in `scoring-prompts.md`, n8n or a simple Node service for orchestration.
- **Data model**: nodes (id, type: url|image|email, position, capture data, score, findings[]), edges (id, from, to, status: ok|break|unanalyzed, findings[]) — this maps directly to the prototype's mock data shape, already validated as the right shape via the working UI.
- **New surface area vs. earlier spec**: image upload (direct file, no Playwright needed), email ingestion (paste for v0; forward-to-address or .eml upload later), canvas persistence (save/load per user), and by extension real auth — all absent from the original "3 URLs, concierge, no login" v0 scope. This is a bigger build than originally scoped; the user has been explicitly warned of this scope expansion and chose to proceed.

## Immediate next steps for Claude Code

1. Scaffold Nuxt 3 project, install Vue Flow, port the validated node/edge/side-panel interaction from `canvas-prototype-v2.jsx` (logic reference only — rebuild idiomatically in Vue, don't transliterate React).
2. Decide and stand up persistence (Firestore vs Postgres — flag the tradeoff to the user rather than silently picking one, given it affects the rubric-rule relational model).
3. Wire the "Run analysis" button to a real backend: Playwright capture → Call 1 (per-node) → Call 2 (per-edge) from `scoring-prompts.md`, using the two rubric CSVs as the source rules.
4. Validate end-to-end against mybacs.ch again, this time with real captured screenshots instead of mocked findings, and compare against the manually-verified findings above as a regression check.

## Files in this handoff
- `HANDOFF.md` — this file
- `connected-funnel-audit-spec.md` — original requirements/architecture (partially superseded, see above)
- `scoring-prompts.md` — the two-call scoring prompt design + validation notes
- `psyconversion_patterns.csv` — 131-row rubric source
- `vertrauensarchitektur_mechanisms.csv` — 10-row rubric source
- `canvas-prototype-v2.jsx` — validated UX reference (mocked data, not production code)
- `canvas-prototype.jsx` — earlier version, superseded by v2, kept for reference only
- `connected-funnel-audit-landing.html` — deprioritized, low relevance right now
