import { ref } from 'vue'
import { useCanvasStore, type FunnelEdge, type FunnelNode } from '~/stores/canvas'
import type { NodeFinding, SeamFinding, SeamStatus } from '~/types/canvas'

interface RawCall1Finding {
  pattern_id: string
  verdict: string
  evidence: string
  confidence: 'high' | 'medium' | 'low'
  suggested_fix: string | null
}

interface RawCall1Result {
  step_id: string
  findings: RawCall1Finding[]
}

interface CaptureResponse {
  screenshot: string
  text: string
}

interface AnalyzeNodeResponse {
  score: number
  findings: NodeFinding[]
  raw: RawCall1Result
}

interface AnalyzeEdgeResponse {
  status: SeamStatus
  findings: SeamFinding[]
}

function errorMessage(err: unknown): string {
  const withData = err as { data?: { statusMessage?: string; message?: string }; statusMessage?: string }
  if (withData?.data?.statusMessage) return withData.data.statusMessage
  if (withData?.data?.message) return withData.data.message
  if (withData?.statusMessage) return withData.statusMessage
  if (err instanceof Error) return err.message
  return 'Analysis failed.'
}

/**
 * Orchestrates the two-call pipeline from docs/handoff/scoring-prompts.md:
 * Call 1 (per node) runs for every node in parallel, then Call 2 (per edge)
 * runs once both of an edge's endpoint nodes have a Call 1 result. A node
 * or edge failing (missing content, capture error, API error) is recorded
 * on that node/edge only - it doesn't abort the rest of the run.
 */
export function useRunAnalysis() {
  const store = useCanvasStore()
  const running = ref(false)

  async function analyzeNode(node: FunnelNode, index: number, total: number): Promise<RawCall1Result | null> {
    const { data } = node
    store.setNodeAnalyzing(node.id, true)
    try {
      let screenshotDataUrl: string | null = null
      let extractedText: string | null = null

      if (data.type === 'url') {
        if (!data.url) throw new Error('No URL set for this node yet - click it and add one.')
        const capture = await $fetch<CaptureResponse>('/api/capture', { method: 'POST', body: { url: data.url } })
        store.setNodeCaptureResult(node.id, capture)
        screenshotDataUrl = capture.screenshot
        extractedText = capture.text
      } else if (data.type === 'image') {
        if (!data.imageSrc) throw new Error('No image uploaded for this node yet.')
        screenshotDataUrl = data.imageSrc
      } else {
        if (!data.emailText) throw new Error('No email content pasted for this node yet.')
        extractedText = data.emailText
      }

      const result = await $fetch<AnalyzeNodeResponse>('/api/analyze-node', {
        method: 'POST',
        body: {
          nodeId: node.id,
          assetType: data.type,
          label: data.label,
          stepNumber: index + 1,
          totalSteps: total,
          screenshotDataUrl,
          extractedText,
        },
      })

      store.setNodeAnalysisResult(node.id, { score: result.score, findings: result.findings })
      return result.raw
    } catch (err) {
      store.setNodeAnalysisError(node.id, errorMessage(err))
      return null
    }
  }

  async function analyzeEdge(edge: FunnelEdge, call1ByNode: Map<string, RawCall1Result>) {
    const resultA = call1ByNode.get(edge.source)
    const resultB = call1ByNode.get(edge.target)
    if (!resultA || !resultB) {
      store.setEdgeAnalysisError(edge.id, 'Both connected steps need a successful analysis first.')
      return
    }

    const nodeA = store.nodes.find((n) => n.id === edge.source)
    const nodeB = store.nodes.find((n) => n.id === edge.target)

    store.setEdgeAnalyzing(edge.id, true)
    try {
      const result = await $fetch<AnalyzeEdgeResponse>('/api/analyze-edge', {
        method: 'POST',
        body: {
          seam: `${edge.source}_to_${edge.target}`,
          stepALabel: nodeA?.data.label ?? edge.source,
          stepBLabel: nodeB?.data.label ?? edge.target,
          screenshotADataUrl: nodeA?.data.imageSrc ?? null,
          screenshotBDataUrl: nodeB?.data.imageSrc ?? null,
          call1ResultA: resultA,
          call1ResultB: resultB,
        },
      })
      store.setEdgeAnalysisResult(edge.id, result)
    } catch (err) {
      store.setEdgeAnalysisError(edge.id, errorMessage(err))
    }
  }

  async function run() {
    if (running.value) return
    running.value = true
    try {
      const nodeSnapshot = [...store.nodes]
      const call1ByNode = new Map<string, RawCall1Result>()

      await Promise.all(
        nodeSnapshot.map(async (node, index) => {
          const raw = await analyzeNode(node, index, nodeSnapshot.length)
          if (raw) call1ByNode.set(node.id, raw)
        }),
      )

      const edgeSnapshot = [...store.edges]
      await Promise.all(edgeSnapshot.map((edge) => analyzeEdge(edge, call1ByNode)))
    } finally {
      running.value = false
    }
  }

  return { run, running }
}
