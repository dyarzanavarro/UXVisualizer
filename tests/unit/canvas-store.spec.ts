import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '~/stores/canvas'

describe('canvas store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds the initial mocked mybacs.ch nodes and edges', () => {
    const store = useCanvasStore()
    expect(store.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3'])
    expect(store.edges.map((e) => e.id)).toEqual(['e1', 'e2'])
    expect(store.edges[0].data?.status).toBe('break')
    expect(store.edges[1].data?.status).toBe('ok')
  })

  it('has no selection initially', () => {
    const store = useCanvasStore()
    expect(store.selectedNode).toBeNull()
    expect(store.selectedEdge).toBeNull()
  })

  describe('selection', () => {
    it('selectNode / selectEdge / clearSelection update selection state', () => {
      const store = useCanvasStore()

      store.selectNode('n2')
      expect(store.selectedNode?.id).toBe('n2')
      expect(store.selectedEdge).toBeNull()

      store.selectEdge('e1')
      expect(store.selectedEdge?.id).toBe('e1')
      expect(store.selectedNode).toBeNull()

      store.clearSelection()
      expect(store.selectedNode).toBeNull()
      expect(store.selectedEdge).toBeNull()
    })

    it('selecting an id that does not exist resolves to null', () => {
      const store = useCanvasStore()
      store.selectNode('does-not-exist')
      expect(store.selectedNode).toBeNull()
    })
  })

  describe('addNode', () => {
    it('adds a url node with unanalyzed defaults and returns its id', () => {
      const store = useCanvasStore()
      const before = store.nodes.length
      const id = store.addNode('url')

      expect(store.nodes).toHaveLength(before + 1)
      const node = store.nodes.find((n) => n.id === id)
      expect(node?.data).toMatchObject({
        type: 'url',
        label: 'New URL',
        sub: 'Paste link, not analyzed',
        score: null,
        imageSrc: null,
        emailText: null,
        findings: [],
      })
    })

    it('adds image and email nodes with type-specific defaults', () => {
      const store = useCanvasStore()

      const imageId = store.addNode('image')
      expect(store.nodes.find((n) => n.id === imageId)?.data.sub).toBe('Not analyzed yet')

      const emailId = store.addNode('email')
      expect(store.nodes.find((n) => n.id === emailId)?.data.sub).toBe('Paste content →')
    })
  })

  it('setNodeImage sets the thumbnail and file name on the target node only', () => {
    const store = useCanvasStore()
    const id = store.addNode('image')

    store.setNodeImage(id, 'data:image/png;base64,xyz', 'hero.png')

    const node = store.nodes.find((n) => n.id === id)
    expect(node?.data.imageSrc).toBe('data:image/png;base64,xyz')
    expect(node?.data.sub).toBe('hero.png')
    expect(store.nodes.find((n) => n.id === 'n1')?.data.imageSrc).toBeNull()
  })

  describe('email modal flow', () => {
    it('openEmailModal / saveEmail stores text and a truncated first-line subject preview', () => {
      const store = useCanvasStore()
      const id = store.addNode('email')

      store.openEmailModal(id)
      expect(store.emailModalNodeId).toBe(id)

      const longSubject = 'Subject: ' + 'x'.repeat(60)
      store.saveEmail(`${longSubject}\n\nBody text`)

      const node = store.nodes.find((n) => n.id === id)
      expect(node?.data.emailText).toBe(`${longSubject}\n\nBody text`)
      expect(node?.data.sub).toBe(longSubject.slice(0, 40))
      expect(store.emailModalNodeId).toBeNull()
    })

    it('falls back to "Pasted email" when the draft is empty', () => {
      const store = useCanvasStore()
      const id = store.addNode('email')
      store.openEmailModal(id)
      store.saveEmail('')
      expect(store.nodes.find((n) => n.id === id)?.data.sub).toBe('Pasted email')
    })

    it('saveEmail without an open modal is a no-op', () => {
      const store = useCanvasStore()
      store.saveEmail('should go nowhere')
      expect(store.emailModalNodeId).toBeNull()
    })

    it('closeEmailModal discards the draft without mutating any node', () => {
      const store = useCanvasStore()
      const id = store.addNode('email')
      store.openEmailModal(id)
      store.closeEmailModal()
      expect(store.emailModalNodeId).toBeNull()
      expect(store.nodes.find((n) => n.id === id)?.data.emailText).toBeNull()
    })
  })

  describe('connect', () => {
    it('creates an unanalyzed edge awaiting analysis between two nodes', () => {
      const store = useCanvasStore()
      const id = store.addNode('url')

      store.connect('n3', id)

      const edge = store.edges.find((e) => e.source === 'n3' && e.target === id)
      expect(edge?.data?.status).toBe('unanalyzed')
      expect(edge?.data?.findings[0]?.type).toBe('not_yet_analyzed')
    })

    it('refuses to connect a node to itself', () => {
      const store = useCanvasStore()
      const before = store.edges.length
      store.connect('n1', 'n1')
      expect(store.edges).toHaveLength(before)
    })

    it('refuses a duplicate edge in either direction', () => {
      const store = useCanvasStore()
      const before = store.edges.length

      store.connect('n1', 'n2') // e1 already connects n1 -> n2
      expect(store.edges).toHaveLength(before)

      store.connect('n2', 'n1') // reverse direction of the same seam
      expect(store.edges).toHaveLength(before)
    })
  })

  describe('deleteNode', () => {
    it('removes the node and cascades to any edge touching it', () => {
      const store = useCanvasStore()
      store.deleteNode('n2') // n2 is an endpoint of both e1 and e2

      expect(store.nodes.find((n) => n.id === 'n2')).toBeUndefined()
      expect(store.edges).toHaveLength(0)
    })

    it('clears the selection when the selected node is deleted', () => {
      const store = useCanvasStore()
      store.selectNode('n1')
      store.deleteNode('n1')
      expect(store.selectedId).toBeNull()
      expect(store.selectedKind).toBeNull()
    })

    it('leaves selection untouched when a different node is deleted', () => {
      const store = useCanvasStore()
      store.selectNode('n1')
      store.deleteNode('n3')
      expect(store.selectedNode?.id).toBe('n1')
    })
  })

  describe('deleteEdge', () => {
    it('removes only the targeted edge', () => {
      const store = useCanvasStore()
      store.deleteEdge('e1')
      expect(store.edges.map((e) => e.id)).toEqual(['e2'])
    })

    it('clears the selection when the selected edge is deleted', () => {
      const store = useCanvasStore()
      store.selectEdge('e1')
      store.deleteEdge('e1')
      expect(store.selectedId).toBeNull()
    })
  })

  it('updateNodePosition moves only the targeted node', () => {
    const store = useCanvasStore()
    store.updateNodePosition('n1', { x: 999, y: 111 })

    expect(store.nodes.find((n) => n.id === 'n1')?.position).toEqual({ x: 999, y: 111 })
    expect(store.nodes.find((n) => n.id === 'n2')?.position).not.toEqual({ x: 999, y: 111 })
  })

  describe('url modal flow', () => {
    it('openUrlModal / saveUrl sets url, and derives label from the hostname', () => {
      const store = useCanvasStore()
      const id = store.addNode('url')

      store.openUrlModal(id)
      expect(store.urlModalNodeId).toBe(id)

      store.saveUrl('https://shop.example.com/checkout')

      const node = store.nodes.find((n) => n.id === id)
      expect(node?.data.url).toBe('https://shop.example.com/checkout')
      expect(node?.data.label).toBe('shop.example.com')
      expect(node?.data.sub).toBe('https://shop.example.com/checkout')
      expect(store.urlModalNodeId).toBeNull()
    })

    it('saveUrl without an open modal is a no-op', () => {
      const store = useCanvasStore()
      store.saveUrl('https://example.com')
      expect(store.urlModalNodeId).toBeNull()
    })

    it('closeUrlModal discards without mutating the node', () => {
      const store = useCanvasStore()
      const id = store.addNode('url')
      store.openUrlModal(id)
      store.closeUrlModal()
      expect(store.urlModalNodeId).toBeNull()
      expect(store.nodes.find((n) => n.id === id)?.data.url).toBeNull()
    })
  })

  describe('analysis state actions', () => {
    it('setNodeAnalyzing toggles the flag and clears any prior error when starting', () => {
      const store = useCanvasStore()
      store.setNodeAnalysisError('n1', 'boom')

      store.setNodeAnalyzing('n1', true)
      expect(store.nodes.find((n) => n.id === 'n1')?.data.analyzing).toBe(true)
      expect(store.nodes.find((n) => n.id === 'n1')?.data.analysisError).toBeNull()
    })

    it('setNodeCaptureResult stores the screenshot as imageSrc and the extracted text', () => {
      const store = useCanvasStore()
      store.setNodeCaptureResult('n1', { screenshot: 'data:image/png;base64,xyz', text: 'captured copy' })

      const node = store.nodes.find((n) => n.id === 'n1')
      expect(node?.data.imageSrc).toBe('data:image/png;base64,xyz')
      expect(node?.data.extractedText).toBe('captured copy')
    })

    it('setNodeAnalysisResult sets score/findings and clears analyzing + error', () => {
      const store = useCanvasStore()
      store.setNodeAnalyzing('n1', true)

      store.setNodeAnalysisResult('n1', { score: 91, findings: [{ id: 'PC-001', verdict: 'present', text: 'ok' }] })

      const node = store.nodes.find((n) => n.id === 'n1')
      expect(node?.data.score).toBe(91)
      expect(node?.data.findings).toEqual([{ id: 'PC-001', verdict: 'present', text: 'ok' }])
      expect(node?.data.analyzing).toBe(false)
      expect(node?.data.analysisError).toBeNull()
    })

    it('setNodeAnalysisError clears analyzing and records the message', () => {
      const store = useCanvasStore()
      store.setNodeAnalyzing('n1', true)
      store.setNodeAnalysisError('n1', 'capture failed')

      const node = store.nodes.find((n) => n.id === 'n1')
      expect(node?.data.analyzing).toBe(false)
      expect(node?.data.analysisError).toBe('capture failed')
    })

    it('setEdgeAnalysisResult sets status/findings and clears analyzing + error', () => {
      const store = useCanvasStore()
      store.setEdgeAnalyzing('e1', true)

      store.setEdgeAnalysisResult('e1', {
        status: 'ok',
        findings: [{ type: 'confirmed', severity: 'none', text: 'fine' }],
      })

      const edge = store.edges.find((e) => e.id === 'e1')
      expect(edge?.data.status).toBe('ok')
      expect(edge?.data.findings).toEqual([{ type: 'confirmed', severity: 'none', text: 'fine' }])
      expect(edge?.data.analyzing).toBe(false)
      expect(edge?.data.analysisError).toBeNull()
    })

    it('setEdgeAnalysisError clears analyzing and records the message', () => {
      const store = useCanvasStore()
      store.setEdgeAnalyzing('e1', true)
      store.setEdgeAnalysisError('e1', 'both steps need analysis first')

      const edge = store.edges.find((e) => e.id === 'e1')
      expect(edge?.data.analyzing).toBe(false)
      expect(edge?.data.analysisError).toBe('both steps need analysis first')
    })

    it('setNodeAnalyzing/setEdgeAnalyzing on an unknown id is a no-op, not a throw', () => {
      const store = useCanvasStore()
      expect(() => store.setNodeAnalyzing('does-not-exist', true)).not.toThrow()
      expect(() => store.setEdgeAnalyzing('does-not-exist', true)).not.toThrow()
    })
  })
})
