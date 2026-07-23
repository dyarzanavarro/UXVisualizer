import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_MODEL = 'claude-sonnet-5'

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to a .env file (see .env.example) to run real analysis.',
    )
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

function modelId(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
}

/** Strips ```json fences models sometimes add despite "no prose" instructions, then parses. */
function parseJsonResponse<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try {
    return JSON.parse(stripped) as T
  } catch (err) {
    throw new Error(`Model response was not valid JSON: ${(err as Error).message}\n---\n${raw.slice(0, 500)}`)
  }
}

function dataUrlToImageBlock(dataUrl: string) {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('Expected a base64 image data URL (image/png, jpeg, webp, or gif).')
  const mediaType = match[1]
  const data = match[2]
  if (!mediaType || !data) {
    throw new Error('Expected a base64 image data URL (image/png, jpeg, webp, or gif).')
  }
  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
      data,
    },
  }
}

export type FindingVerdict = 'present' | 'violated' | 'absent_where_expected' | 'not_applicable'
export type FindingConfidence = 'high' | 'medium' | 'low'

export interface Call1Finding {
  pattern_id: string
  verdict: FindingVerdict
  evidence: string
  confidence: FindingConfidence
  suggested_fix: string | null
}

export interface Call1Result {
  step_id: string
  findings: Call1Finding[]
}

export interface ScoreNodeInput {
  stepId: string
  stepLabel: string
  stepNumber: number
  totalSteps: number
  screenshotDataUrl?: string | null
  extractedText?: string | null
  rubricText: string
}

const CALL1_SYSTEM = `You are a conversion/UX auditor scoring a single funnel step (screenshot + extracted copy) against a fixed rubric of behavioral patterns. You are not a generic critique tool - every finding must cite specific evidence from THIS page, never generic best-practice boilerplate. If a pattern isn't clearly present or clearly violated, mark it "not_applicable" rather than forcing a finding.

Output strict JSON, no prose, matching this shape exactly:
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

Only include findings for patterns where verdict is NOT "not_applicable" - omit not_applicable rows entirely rather than listing every rubric id.`

export async function scoreNode(input: ScoreNodeInput): Promise<Call1Result> {
  const anthropic = getAnthropicClient()

  const content: Anthropic.Messages.ContentBlockParam[] = []
  if (input.screenshotDataUrl) {
    content.push(dataUrlToImageBlock(input.screenshotDataUrl))
  }
  content.push({
    type: 'text',
    text: [
      `Rubric for this step:\n${input.rubricText}`,
      '',
      `Extracted copy: ${input.extractedText ?? '(none provided)'}`,
      `Step position: ${input.stepNumber} of ${input.totalSteps} (${input.stepLabel})`,
      `step_id to use in your response: ${input.stepId}`,
    ].join('\n'),
  })

  const message = await anthropic.messages.create({
    model: modelId(),
    max_tokens: 4096,
    system: CALL1_SYSTEM,
    messages: [{ role: 'user', content }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('Model returned no text content.')
  return parseJsonResponse<Call1Result>(textBlock.text)
}

export type DiscontinuityType =
  | 'price_mismatch'
  | 'trust_dropoff'
  | 'tone_break'
  | 'promise_unfulfilled'
  | 'visual_inconsistency'
  | 'other'
export type DiscontinuitySeverity = 'high' | 'medium' | 'low'

export interface Call2Discontinuity {
  issue_type: DiscontinuityType
  evidence_step_a: string
  evidence_step_b: string
  severity: DiscontinuitySeverity
  suggested_fix: string
}

export interface Call2Result {
  seam: string
  discontinuities: Call2Discontinuity[]
}

export interface ScoreEdgeInput {
  seam: string
  stepALabel: string
  stepBLabel: string
  screenshotADataUrl?: string | null
  screenshotBDataUrl?: string | null
  call1ResultA: Call1Result
  call1ResultB: Call1Result
}

const CALL2_SYSTEM = `You compare two adjacent funnel steps to find discontinuities invisible to single-page review: price/offer mismatches, trust-signal drop-off, tone or promise breaks, rising friction, visual/brand inconsistency. Only flag a real, evidenced discontinuity - do not invent issues to fill a quota. If the two steps are coherent, return an empty discontinuities array.

Output strict JSON, no prose, matching this shape exactly:
{
  "seam": string,
  "discontinuities": [
    {
      "issue_type": "price_mismatch" | "trust_dropoff" | "tone_break" | "promise_unfulfilled" | "visual_inconsistency" | "other",
      "evidence_step_a": string,
      "evidence_step_b": string,
      "severity": "high" | "medium" | "low",
      "suggested_fix": string
    }
  ]
}`

export async function scoreEdge(input: ScoreEdgeInput): Promise<Call2Result> {
  const anthropic = getAnthropicClient()

  const content: Anthropic.Messages.ContentBlockParam[] = []
  content.push({ type: 'text', text: `Step A (${input.stepALabel}):` })
  if (input.screenshotADataUrl) content.push(dataUrlToImageBlock(input.screenshotADataUrl))
  content.push({ type: 'text', text: `Step A findings: ${JSON.stringify(input.call1ResultA.findings)}` })

  content.push({ type: 'text', text: `Step B (${input.stepBLabel}):` })
  if (input.screenshotBDataUrl) content.push(dataUrlToImageBlock(input.screenshotBDataUrl))
  content.push({
    type: 'text',
    text: `Step B findings: ${JSON.stringify(input.call1ResultB.findings)}\nseam to use in your response: ${input.seam}`,
  })

  const message = await anthropic.messages.create({
    model: modelId(),
    max_tokens: 2048,
    system: CALL2_SYSTEM,
    messages: [{ role: 'user', content }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('Model returned no text content.')
  return parseJsonResponse<Call2Result>(textBlock.text)
}

/**
 * Not part of the original scoring-prompts.md design (Call 1 returns
 * findings, not a numeric score) - this is a small, documented v0 formula to
 * turn findings into the 0-100 node.score the canvas UI already displays.
 * Same spirit as the Journey Coherence Score formula in scoring-prompts.md:
 * a starting point to tune once real reports exist, not a final answer.
 */
export function computeNodeScore(findings: Call1Finding[]): number {
  const penalty: Record<FindingConfidence, number> = { high: 10, medium: 6, low: 3 }
  let score = 100
  for (const f of findings) {
    if (f.verdict === 'violated') score -= penalty[f.confidence]
    else if (f.verdict === 'absent_where_expected') score -= penalty[f.confidence] * 0.8
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}
