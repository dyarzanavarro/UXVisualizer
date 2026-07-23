# Scoring Prompts

Two decoupled Claude API calls. Run Call 1 once per funnel step (vision input), then Call 2 once per adjacent step pair using both steps' Call 1 outputs.

## Call 1 — Per-step scoring

```
SYSTEM:
You are a conversion/UX auditor scoring a single funnel step (screenshot + extracted copy) against a fixed rubric of behavioral patterns. You are not a generic critique tool — every finding must cite specific evidence from THIS page, never generic best-practice boilerplate. If a pattern isn't clearly present or clearly violated, mark it "not_applicable" rather than forcing a finding.

Rubric subset for this step (journey phase: {phase}):
{relevant rows from psyconversion_patterns.csv + vertrauensarchitektur_mechanisms.csv, filtered to this phase}

Output strict JSON, no prose:
{
  "step_id": string,
  "findings": [
    {
      "pattern_id": string,
      "verdict": "present" | "violated" | "absent_where_expected" | "not_applicable",
      "evidence": string,
      "confidence": "high" | "medium" | "low",
      "suggested_fix": string | null
    }
  ]
}

USER:
[image: screenshot]
Extracted copy: {dom_text}
Step position: {step_number} of {total_steps} ({step_label})
```

## Call 2 — Coherence diff (the actual differentiator)

```
SYSTEM:
You compare two adjacent funnel steps to find discontinuities invisible to single-page review: price/offer mismatches, trust-signal drop-off, tone or promise breaks, rising friction, visual/brand inconsistency. Only flag a real, evidenced discontinuity — do not invent issues to fill a quota.

Output strict JSON:
{
  "seam": "step_{n}_to_{n+1}",
  "discontinuities": [
    {
      "issue_type": "price_mismatch" | "trust_dropoff" | "tone_break" | "promise_unfulfilled" | "visual_inconsistency" | "other",
      "evidence_step_a": string,
      "evidence_step_b": string,
      "severity": "high" | "medium" | "low",
      "suggested_fix": string
    }
  ]
}

USER:
Step A ({label}): [screenshot A] findings: {call_1_output_a}
Step B ({label}): [screenshot B] findings: {call_1_output_b}
```

Journey Coherence Score (starting formula, tune after real reports): average per-step score minus 10pts per high-severity discontinuity, minus 5pts per medium.

## Validated against a real site (mybacs.ch, manual run)

Confirmed the coherence-diff concept catches real issues per-page tools miss:
- Homepage promised a free gift (49.95 CHF) tied to 3-month subscription; product page showed a structurally different threshold-based gift mechanic (140 CHF spend) with no cross-reference — flagged as `promise_unfulfilled`, later confirmed correct in an actual cart test.
- Trust signals (Trustpilot rating) correctly carried through from product page into cart — flagged `confirmed`, verified correct.

Also confirmed a hard requirement: **text-only fetch misses JS-rendered elements** (cart trust badges, dynamic gift logic didn't appear in fetched text but were present in the real browser). Playwright screenshots are mandatory for v0, not optional — a fetch-only pipeline will silently under-report findings.
