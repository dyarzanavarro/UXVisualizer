# Connected Funnel Audit

A canvas-based tool that audits an eCommerce funnel not just per-page, but for
**coherence between steps** — price mismatches, trust-signal drop-off, and
unfulfilled promises across the journey. Users drop in assets (URLs, uploaded
images, pasted emails) as nodes on a canvas, connect them into a journey with
edges, and each node/edge carries AI-generated findings.

Full product context, rubric sourcing notes, and the original handoff docs
live in [`docs/handoff/`](./docs/handoff/HANDOFF.md).

## Stack

- **Nuxt 4** (TypeScript) — handoff docs specify "Nuxt 3"; this scaffold uses
  the current stable Nuxt major, which is the direct successor and uses the
  same `app/` structure. Revisit if a hard Nuxt 3 pin is actually required.
- **Vue Flow** (`@vue-flow/core`) for the node/edge canvas — pan/zoom,
  draggable nodes, custom node/edge rendering.
- **Pinia** for canvas state (nodes, edges, selection, modals, in-flight
  analysis state).
- **Tailwind CSS** (`@nuxtjs/tailwindcss`) for styling.
- **Nitro server routes** (`server/api/`) for capture and scoring — see
  "Backend" below.
- **playwright-core** for capture (not the `playwright` package — see the
  "playwright vs playwright-core" note below).
- **@anthropic-ai/sdk** for the two scoring calls.
- **Postgres** — chosen over Firestore for persistence (decision confirmed
  with the user 2026-07-23), since the rubric-rule / findings data model is
  relational. Not wired up yet — canvas state is in-memory only, reset on
  reload. See "Not yet built" below.

## What's here

- `app/components/canvas/` — `CanvasBoard.vue` (Vue Flow wrapper), `FunnelNode.vue`
  (shared node renderer for url/image/email types), `SeamEdge.vue` (custom
  edge with ok/break/unanalyzed coloring, plus analyzing/error states),
  `SidePanel.vue` (findings display), `Toolbar.vue`, `EmailModal.vue`,
  `UrlModal.vue` (set/edit a url node's target address).
- `app/composables/useRunAnalysis.ts` — orchestrates the "Run analysis"
  button: capture → Call 1 per node (parallel, failures isolated per node),
  then Call 2 per edge once both endpoints have a result (failures isolated
  per edge).
- `app/stores/canvas.ts` — Pinia store holding nodes/edges (Vue Flow shape),
  seeded with the same mocked mybacs.ch findings used to validate the UX in
  the original React prototype, plus actions for adding nodes, connecting
  edges, image upload, email/url entry, delete, and recording analysis
  results/errors/in-flight state.
- `app/types/canvas.ts` — shared types for node/edge/finding data.
- `server/api/capture.post.ts` — Playwright screenshot + extracted copy for
  a url node. SSRF-guards against internal/private hosts (see
  `server/utils/capture.ts`).
- `server/api/analyze-node.post.ts` — Call 1 (per-step scoring) from
  `docs/handoff/scoring-prompts.md`.
- `server/api/analyze-edge.post.ts` — Call 2 (coherence diff) from the same
  doc.
- `server/utils/rubric.ts` / `data/rubric/*.csv` — loads both rubric CSVs
  unchanged from the handoff. **v0 simplification**: nodes don't yet carry a
  journey-phase field to filter the rubric against, so Call 1 gets the full
  131+10-row rubric and relies on its own system prompt to mark anything
  inapplicable `not_applicable` rather than forcing a finding.
- `server/utils/anthropic.ts` — the two Claude API calls, JSON parsing, and
  `computeNodeScore` (a small documented v0 formula turning Call 1's
  present/violated/absent findings into the 0–100 node score the canvas
  displays — not part of the original scoring-prompts.md design, which only
  specified findings, not a numeric score).
- `docs/handoff/` — original handoff package (spec, scoring prompt design,
  React UX prototypes, deprioritized landing page) kept for reference.

## Backend setup

```bash
cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY
```

Without a key, node/image/email analysis fails with a clear
"ANTHROPIC_API_KEY is not set" error surfaced right on the node/edge — the
canvas itself still works.

### playwright vs playwright-core

`server/utils/capture.ts` imports from **`playwright-core`**, not
`playwright`. Both export the same `chromium` launcher, but `playwright`
also ships a `playwright` CLI bin — identical in name to the one
`@playwright/test` (a devDependency, used for `npm run test:e2e`) ships.
Having both installed let npm's bin symlinking pick the wrong one, so
`npx playwright test` silently ran the wrong CLI and crashed with no output
at all. `playwright-core` has no bin, so there's nothing to collide.

## Not yet built

Per the handoff's staged plan, still outstanding:

1. **Postgres schema** for `heuristic_rules` (loaded from the rubric CSVs)
   and for persisted canvas state (nodes/edges/findings per user/project).
   Canvas state today is in-memory only.
2. **Auth** — required once canvas state needs to persist per user.
3. **Journey-phase-aware rubric filtering** — see the v0 simplification note
   above.
4. **Regression check** — re-validate against mybacs.ch with real captured
   screenshots and a real API key, and compare against the manually-verified
   findings recorded in `scoring-prompts.md`. Not done in this environment:
   general web egress is blocked by sandbox policy (only `api.anthropic.com`
   and package registries are reachable), and the sandbox's TLS-intercepting
   proxy isn't trusted by Playwright's bundled Chromium, so live capture
   against a real site returns `ERR_CERT_AUTHORITY_INVALID` here specifically
   — not a code defect, see "Testing" below for what was actually verified.

## Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

> Dependencies currently need `npm install --legacy-peer-deps` in this
> environment — a bare `npm install` hits an unrelated npm/arborist peer-set
> resolution bug on the base Nuxt scaffold. Worth re-checking against a
> newer npm outside this environment.

## Testing

```bash
npm run test        # unit tests (Vitest) — store logic + server utils
npm run test:watch  # unit tests, watch mode
npm run test:e2e    # E2E (Playwright) — canvas interactions in a real browser
npm run typecheck   # nuxt typecheck (vue-tsc)
```

> If `npx playwright test` ever silently crashes with no output, see
> "playwright vs playwright-core" above — run
> `node node_modules/@playwright/test/cli.js test` directly to bypass a bad
> bin resolution.

- `tests/unit/canvas-store.spec.ts` — seeding, selection, adding each node
  type, image/email/url mutation, cascading node delete, duplicate/self-loop
  edge prevention, position updates, and all the analysis-state actions
  (analyzing/result/error for both nodes and edges). 44 cases total across
  this and the files below.
- `tests/unit/rubric.spec.ts` — both CSVs load with the right row counts and
  shape, and format into a single prompt-ready block.
- `tests/unit/anthropic-scoring.spec.ts` — `computeNodeScore`'s
  present/violated/absent-with-confidence penalty formula.
- `tests/unit/capture.spec.ts` — the SSRF guard: accepts ordinary URLs,
  rejects non-http(s) protocols and internal/private hosts (localhost,
  RFC1918 ranges, link-local/cloud-metadata), and does **not** false-positive
  on public hostnames that merely start with the same digits (e.g.
  `10.example.com`) — writing this test caught that exact bug in the first
  version of the guard, which matched hostname prefixes instead of requiring
  a full dotted-decimal IPv4 address.
- `tests/e2e/canvas.spec.ts` — drives the running app in Chromium: node/seam
  click, pane-click deselect, add URL (+ modal save/cancel), paste email,
  delete cascades edges, drag repositions a node, a console-error smoke
  check, and a **mocked-backend** "Run analysis" pair: one test fulfills
  `/api/capture`, `/api/analyze-node`, `/api/analyze-edge` at the browser
  network layer and asserts scores/findings land on nodes and seams; the
  other fails one node's capture and asserts that failure is isolated to
  that node (recorded as `analysisError`) while the rest of the run
  completes normally. 11 cases.
- `npm run typecheck` is a real gate, not a formality: it caught a
  `structuredClone`d state array sharing references across store instances
  (fixed — state factory now deep-clones) and forced `FunnelNode`/`FunnelEdge`
  off Vue Flow's `Node<T>`/`Edge<T>` generics (self-referential and blew up
  TS's instantiation depth once wrapped in a Pinia store) in favor of plain,
  structurally-compatible interfaces in `app/stores/canvas.ts`.

**What's verified vs. what isn't**: the SSRF guard, scoring-formula, rubric
loading, and full frontend orchestration (mocked network) are covered above.
Real capture against a live site and real Claude API calls are not verified
in this environment — see "Not yet built" #4. The capture route *was*
confirmed end-to-end up to the actual browser navigation (validation → launch
→ attempt → structured error response) against both a blocked internal host
(400, as expected) and a real external host (correctly reaches the TLS
handshake and fails only there, for the sandbox-specific reason noted above).
