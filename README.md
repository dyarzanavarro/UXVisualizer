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
- **Pinia** for canvas state (nodes, edges, selection, modals).
- **Tailwind CSS** (`@nuxtjs/tailwindcss`) for styling.
- **Postgres** — chosen over Firestore for persistence (decision confirmed
  with the user 2026-07-23), since the rubric-rule / findings data model is
  relational. Not wired up yet — see "Not yet built" below.

## What's here

- `app/components/canvas/` — `CanvasBoard.vue` (Vue Flow wrapper), `FunnelNode.vue`
  (shared node renderer for url/image/email types), `SeamEdge.vue` (custom
  edge with ok/break/unanalyzed coloring), `SidePanel.vue` (findings display),
  `Toolbar.vue`, `EmailModal.vue`.
- `app/stores/canvas.ts` — Pinia store holding nodes/edges (Vue Flow shape)
  seeded with the same mocked mybacs.ch findings used to validate the UX in
  the original React prototype, plus actions for adding nodes, connecting
  edges, image upload, email paste, and delete.
- `app/types/canvas.ts` — shared types for node/edge/finding data.
- `data/rubric/` — the two rubric source CSVs (`psyconversion_patterns.csv`,
  `vertrauensarchitektur_mechanisms.csv`), carried over unchanged from the
  handoff for the future scoring backend to consume.
- `docs/handoff/` — original handoff package (spec, scoring prompt design,
  React UX prototypes, deprioritized landing page) kept for reference.

This is a UI-only rebuild of the validated canvas prototype: real Vue Flow
canvas (proper pan/zoom/infinite canvas vs. the prototype's fixed-viewport
hand-rolled drag logic), same interaction set (add URL / upload image / paste
email, manual edge-drawing via connection handles, click node or edge to see
findings in the side panel), but still running on **mocked data** — nothing
is wired to a real backend yet.

## Not yet built

Per the handoff's staged plan, still outstanding:

1. **Postgres schema** for `heuristic_rules` (loaded from the rubric CSVs)
   and for persisted canvas state (nodes/edges/findings per user/project).
2. **Auth** — required once canvas state needs to persist per user.
3. **Capture backend** — Playwright screenshot + DOM/copy extraction per URL
   node (mandatory per the handoff's validated finding: text-only fetch
   misses JS-rendered elements like cart trust badges and dynamic pricing).
4. **Scoring backend** — the two-call Claude API design in
   [`docs/handoff/scoring-prompts.md`](./docs/handoff/scoring-prompts.md):
   Call 1 scores each node against the rubric subset for its journey phase;
   Call 2 diffs adjacent node pairs for discontinuities. Wire the "Run
   analysis" button (currently a no-op stub) to this pipeline.
5. **Regression check** — re-validate against mybacs.ch with real captured
   screenshots and compare against the manually-verified findings recorded
   in `scoring-prompts.md`.

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
