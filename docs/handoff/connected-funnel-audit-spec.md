# Connected Funnel Audit — Requirements & Architecture v0.1

## 1. Problem Statement

Teams optimizing eCommerce/checkout funnels evaluate each step in isolation (landing page review, checkout heuristic audit, email review) using disconnected tools and one-off agency engagements. No tool scores the **coherence between steps** — where trust signals, pricing, tone, or cognitive load break continuity as a user moves from ad → landing page → product/plan page → checkout. Generic AI heuristic audits (LIFT, Cialdini) are now commoditized to the point of free prompt kits. The differentiated wedge is *cross-step* analysis grounded in a defensible, non-generic psychological framework — not single-page scoring.

## 2. Goals / Non-Goals (v0)

**Goals**
- Score a 3-step funnel (landing → product/plan → checkout) against a structured rubric
- Detect discontinuities between steps (price, tone, trust signals, message-match, cognitive load delta)
- Produce a client-ready report with a "Journey Coherence Score" + prioritized, ICE-ranked fixes
- Operable by one person (Dan) as a concierge service before any UI exists

**Non-Goals (explicitly out of scope for v0)**
- No ad/email/full-lifecycle steps (acquisition, retention) — 3 steps only
- No event-level/CDP tracking, no login, no client self-serve dashboard
- No automated A/B test execution — recommendations only
- No real-time monitoring/recurring re-checks (v1 concern)

## 3. Heuristic Framework — Rubric Sources

The rubric is a **tagged pattern library**, not a single scoring formula. Each source contributes a distinct lens; findings are tagged by source + journey step so the report can show *which lens caught which issue*.

| Source | Contributes | Structure |
|---|---|---|
| **PsyConversion (Spreer)** | Behavior Patterns tied to journey phase (Awareness→Retention), dual-system decision framing (intuitive vs. rational) | You encode the specific 117 patterns from the book into the rubric DB — I can't reproduce book content, only the category structure |
| **VertrauensArchitektur (Eller)** | Trust-formation mechanisms scored against 3 dimensions: **Kontinuität** (reliability across touchpoints), **Benevolenz** (perceived goodwill), **Integrität** (authenticity, admits flaws) | 10 mechanisms — same sourcing caveat, you encode from the book |
| **LIFT Model (Goward)** | Clarity, Relevance, Distraction, Urgency, Trust, Anxiety reduction — public framework, safe to encode directly |
| **Baymard checkout research** | Public checkout UX benchmarks (form friction, guest checkout, cost transparency) |
| **Cialdini's 6 principles** | Reciprocity, commitment, social proof, authority, liking, scarcity — public domain framework |

**Rubric data model implication:** each `HeuristicRule` needs a `source`, `journey_phase`, and — for VertrauensArchitektur specifically — a `trust_dimension` enum (`kontinuitaet | benevolenz | integritaet`), since that's the book's core scoring axis and is what differentiates this from generic trust-badge checklists everyone else already does.

**Action item for you:** read/re-read both books with the rubric schema in mind and produce two source CSVs (`psyconversion_patterns.csv`, `vertrauensarchitektur_mechanisms.csv`) — id, name, journey_phase/trust_dimension, description, detection_hint, example_fix. That data entry is the actual moat; I can help structure the schema and later help you turn populated CSVs into prompt-ready rule definitions, but the book content itself has to come from you.

## 4. Personas

- **Dan (Operator, v0)** — runs audits manually/semi-automated, delivers reports, is the entire "product" for the concierge phase
- **Buyer (Growth/eCom lead at a DTC brand or MVNO)** — commissions the audit, wants a fast, credible, non-generic diagnostic
- **Report reader (may differ from buyer)** — designer/dev who implements fixes, needs concrete, ICE-ranked actions not just scores

## 5. Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | System captures screenshot + extracted copy/DOM structure for each of 3 submitted URLs (Playwright) |
| FR-2 | System scores each step independently against the tagged rubric (LIFT, Baymard, Cialdini, PsyConversion, VertrauensArchitektur) |
| FR-3 | System compares adjacent steps and flags discontinuities: price mismatch, trust-signal drop-off, tone/message-match break, rising step-to-step friction |
| FR-4 | System computes a single "Journey Coherence Score" distinct from the 3 per-step scores |
| FR-5 | System outputs a ranked fix list using Impact/Confidence/Ease (ICE) scoring |
| FR-6 | System generates a client-ready report (PDF/Word export per existing docx skill patterns) |
| FR-7 (v0, manual) | Dan can override/edit any AI-generated finding before it goes into a report — no finding ships unreviewed in the concierge phase |
| FR-8 (v1, deferred) | Self-serve intake form (submit 3 URLs, get report) — only after concierge phase validates demand |

## 6. Non-Functional Requirements

- **Language:** rubric and report must support DE/FR/EN at minimum (Swiss market); PsyConversion/VertrauensArchitektur source material is German — keep rule *definitions* in German internally, generate reports in the client's language
- **Data handling:** capturing a client's live site (screenshots, copy) — no PII processing expected at v0 scope, but store audit artifacts with a defined retention/deletion policy since you're handling a client's unpublished/competitive positioning
- **Turnaround:** concierge-phase target is <48h from URL submission to report; this is a selling point, protect it
- **Cost:** Claude API calls per audit should stay low enough to sustain a $199–499 price point — budget and log token cost per audit from day 1

## 7. High-Level Architecture (v0, concierge-assisted)

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Intake      │────▶│  Capture      │────▶│  Rubric Scoring │
│  (manual/    │     │  (Playwright: │     │  (Claude API +  │
│  Typeform    │     │  screenshot + │     │  tagged rule DB │
│  or Nuxt form)│     │  DOM/copy     │     │  in Postgres)   │
└─────────────┘     │  extraction)  │     └────────┬────────┘
                     └──────────────┘              │
                                                    ▼
                                          ┌──────────────────┐
                                          │ Coherence Diff    │
                                          │ Engine (compares  │
                                          │ step N vs N+1)    │
                                          └────────┬──────────┘
                                                    ▼
                                          ┌──────────────────┐
                                          │ Report Generator  │
                                          │ (Nuxt render →    │
                                          │  PDF/Word export)  │
                                          └──────────────────┘

Orchestration: n8n workflow triggers each stage; Dan reviews/edits
findings between Scoring and Report Generation (FR-7) at v0.
```

**Component notes:**
- **Rubric rule DB** (Postgres): `heuristic_rules(id, source, journey_phase, trust_dimension, name, description, detection_hint, example_fix)` — this table *is* the product; everything else is plumbing
- **Scoring**: one Claude call per step (page screenshot + extracted copy + relevant rule subset), one additional call for the coherence diff across steps — don't try to do it in one giant prompt, keep steps separable for debugging and cost control
- **No CDP, no event tracking** — this is static/structural analysis of the funnel as it exists today, which is what keeps it solo-buildable

## 8. User Stories

**Concierge phase (v0)**
- As Dan, I want to paste 3 URLs and get back structured per-step findings tagged by source, so I can review/edit before sending a report, without hand-writing every observation.
- As Dan, I want the coherence engine to explicitly flag step-to-step breaks (e.g., "hero price CHF 29/mo vs. checkout CHF 34.90/mo"), so the report's core differentiator is visible and not just a re-hash of generic page audits.
- As Dan, I want each finding tagged with its source framework (LIFT / Baymard / Cialdini / PsyConversion / VertrauensArchitektur), so I can show clients this isn't a generic ChatGPT audit.

**Buyer**
- As a growth lead, I want a single coherence score I can report upward, so I can justify prioritizing cross-functional fixes (not just "fix the checkout page" in isolation).
- As a growth lead, I want fixes ranked by ICE, so my team knows what to build first.

**v1 (deferred, not built now)**
- As a returning client, I want to re-run the audit after shipping fixes and see score deltas, so I can prove ROI — this is the natural upsell into recurring revenue, explicitly deferred until concierge validates the core wedge.

## 9. Open Risks

- Rubric encoding (populating the two book-derived CSVs) is manual, non-trivial work — this is the actual bottleneck before any automation is worth building
- Coherence-diff detection quality is unproven — validate this works well on 2-3 real funnels manually before writing any Playwright/pipeline code
- Differentiator is copyable once demonstrated — treat the concierge revenue as real, don't oversell defensibility to yourself
