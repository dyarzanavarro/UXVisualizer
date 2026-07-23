import { computeNodeScore, scoreNode } from '../utils/anthropic'
import { formatRubricForPrompt, getRubric } from '../utils/rubric'
import type { AssetType, FindingVerdict, NodeFinding } from '../../app/types/canvas'

interface AnalyzeNodeBody {
  nodeId?: string
  assetType?: AssetType
  label?: string
  stepNumber?: number
  totalSteps?: number
  screenshotDataUrl?: string | null
  extractedText?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AnalyzeNodeBody>(event)

  if (!body?.nodeId || !body.assetType || !body.label) {
    throw createError({ statusCode: 400, statusMessage: 'Missing nodeId, assetType, or label.' })
  }
  if (body.assetType !== 'email' && !body.screenshotDataUrl) {
    throw createError({ statusCode: 400, statusMessage: 'url and image nodes require a screenshotDataUrl.' })
  }

  try {
    const rubricText = formatRubricForPrompt(getRubric())
    const result = await scoreNode({
      stepId: body.nodeId,
      stepLabel: body.label,
      stepNumber: body.stepNumber ?? 1,
      totalSteps: body.totalSteps ?? 1,
      screenshotDataUrl: body.assetType === 'email' ? null : body.screenshotDataUrl,
      extractedText: body.extractedText ?? null,
      rubricText,
    })

    const findings: NodeFinding[] = result.findings.map((f) => ({
      id: f.pattern_id,
      verdict: f.verdict as FindingVerdict,
      text: f.suggested_fix ? `${f.evidence} → Fix: ${f.suggested_fix}` : f.evidence,
    }))

    return {
      score: computeNodeScore(result.findings),
      findings,
      // Raw Call 1 output (pattern_id/confidence/suggested_fix intact), for
      // the client to forward into /api/analyze-edge - the mapped `findings`
      // above are display-shaped and lossy for that purpose.
      raw: result,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed.'
    const isConfigError = message.includes('ANTHROPIC_API_KEY')
    throw createError({ statusCode: isConfigError ? 503 : 502, statusMessage: message })
  }
})
