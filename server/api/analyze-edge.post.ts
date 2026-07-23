import { scoreEdge, type Call1Result } from '../utils/anthropic'
import type { SeamFinding, SeamStatus } from '../../app/types/canvas'

interface AnalyzeEdgeBody {
  seam?: string
  stepALabel?: string
  stepBLabel?: string
  screenshotADataUrl?: string | null
  screenshotBDataUrl?: string | null
  call1ResultA?: Call1Result
  call1ResultB?: Call1Result
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AnalyzeEdgeBody>(event)

  if (!body?.seam || !body.stepALabel || !body.stepBLabel || !body.call1ResultA || !body.call1ResultB) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing seam, stepALabel, stepBLabel, call1ResultA, or call1ResultB.',
    })
  }

  try {
    const result = await scoreEdge({
      seam: body.seam,
      stepALabel: body.stepALabel,
      stepBLabel: body.stepBLabel,
      screenshotADataUrl: body.screenshotADataUrl,
      screenshotBDataUrl: body.screenshotBDataUrl,
      call1ResultA: body.call1ResultA,
      call1ResultB: body.call1ResultB,
    })

    const status: SeamStatus = result.discontinuities.length > 0 ? 'break' : 'ok'
    const findings: SeamFinding[] =
      result.discontinuities.length > 0
        ? result.discontinuities.map((d) => ({
            type: d.issue_type,
            severity: d.severity,
            text: `${d.evidence_step_a} vs. ${d.evidence_step_b} → Fix: ${d.suggested_fix}`,
          }))
        : [{ type: 'confirmed', severity: 'none', text: 'No discontinuities detected between these steps.' }]

    return { status, findings }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed.'
    const isConfigError = message.includes('ANTHROPIC_API_KEY')
    throw createError({ statusCode: isConfigError ? 503 : 502, statusMessage: message })
  }
})
