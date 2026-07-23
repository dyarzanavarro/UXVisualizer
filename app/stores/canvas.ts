import { defineStore } from 'pinia'
import type { Edge, Node } from '@vue-flow/core'
import type { AssetType, FunnelEdgeData, FunnelNodeData, SeamStatus } from '~/types/canvas'

export type FunnelNode = Node<FunnelNodeData>
export type FunnelEdge = Edge<FunnelEdgeData>

type SelectionKind = 'node' | 'edge' | null

const initialNodes: FunnelNode[] = [
  {
    id: 'n1',
    type: 'url',
    position: { x: 60, y: 160 },
    data: {
      id: 'n1',
      type: 'url',
      label: 'Homepage',
      sub: 'mybacs.ch',
      score: 78,
      imageSrc: null,
      emailText: null,
      findings: [
        { id: 'PC-035', verdict: 'present', text: 'Trustpilot 4.6 badge + press logos build immediate authority.' },
        { id: 'PC-072', verdict: 'absent_where_expected', text: 'No guarantee/risk-reversal signal on this page.' },
      ],
    },
  },
  {
    id: 'n2',
    type: 'url',
    position: { x: 420, y: 100 },
    data: {
      id: 'n2',
      type: 'url',
      label: 'Product page',
      sub: 'Dailybacs® Women',
      score: 84,
      imageSrc: null,
      emailText: null,
      findings: [
        { id: 'PC-072', verdict: 'present', text: '60-day money-back guarantee, explicit refund-or-credit choice.' },
        { id: 'PC-041', verdict: 'present', text: 'Honest "not suitable for pregnant/breastfeeding" disclosure.' },
      ],
    },
  },
  {
    id: 'n3',
    type: 'url',
    position: { x: 780, y: 160 },
    data: {
      id: 'n3',
      type: 'url',
      label: 'Cart',
      sub: 'Checkout entry',
      score: 71,
      imageSrc: null,
      emailText: null,
      findings: [
        { id: 'VA-09', verdict: 'present', text: 'Trustpilot stars carried through into cart.' },
      ],
    },
  },
]

const initialEdges: FunnelEdge[] = [
  {
    id: 'e1',
    source: 'n1',
    target: 'n2',
    type: 'seam',
    data: {
      id: 'e1',
      from: 'n1',
      to: 'n2',
      status: 'break',
      findings: [
        {
          type: 'promise_unfulfilled',
          severity: 'medium',
          text: 'Homepage promises a free gift on 3-month sub. Product page shows a different threshold-based mechanic, uncross-referenced.',
        },
      ],
    },
  },
  {
    id: 'e2',
    source: 'n2',
    target: 'n3',
    type: 'seam',
    data: {
      id: 'e2',
      from: 'n2',
      to: 'n3',
      status: 'ok',
      findings: [
        { type: 'confirmed', severity: 'none', text: 'Trust signals carry through cleanly into cart.' },
      ],
    },
  },
]

let idCounter = 0
function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}_${Date.now()}_${idCounter}`
}

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    nodes: initialNodes as FunnelNode[],
    edges: initialEdges as FunnelEdge[],
    selectedKind: null as SelectionKind,
    selectedId: null as string | null,
    emailModalNodeId: null as string | null,
  }),

  getters: {
    selectedNode(state): FunnelNode | null {
      if (state.selectedKind !== 'node') return null
      return state.nodes.find((n) => n.id === state.selectedId) ?? null
    },
    selectedEdge(state): FunnelEdge | null {
      if (state.selectedKind !== 'edge') return null
      return state.edges.find((e) => e.id === state.selectedId) ?? null
    },
  },

  actions: {
    selectNode(id: string) {
      this.selectedKind = 'node'
      this.selectedId = id
    },
    selectEdge(id: string) {
      this.selectedKind = 'edge'
      this.selectedId = id
    },
    clearSelection() {
      this.selectedKind = null
      this.selectedId = null
    },

    addNode(type: AssetType) {
      const id = nextId('n')
      const defaults: Record<AssetType, { label: string; sub: string }> = {
        url: { label: 'New URL', sub: 'Paste link, not analyzed' },
        image: { label: 'New image', sub: 'Not analyzed yet' },
        email: { label: 'New email', sub: 'Paste content →' },
      }
      const node: FunnelNode = {
        id,
        type,
        position: { x: 100 + Math.random() * 300, y: 380 + Math.random() * 80 },
        data: {
          id,
          type,
          label: defaults[type].label,
          sub: defaults[type].sub,
          score: null,
          imageSrc: null,
          emailText: null,
          findings: [],
        },
      }
      this.nodes.push(node)
      return id
    },

    setNodeImage(id: string, dataUrl: string, fileName: string) {
      const node = this.nodes.find((n) => n.id === id)
      if (!node) return
      node.data.imageSrc = dataUrl
      node.data.sub = fileName
    },

    openEmailModal(id: string) {
      this.emailModalNodeId = id
    },
    closeEmailModal() {
      this.emailModalNodeId = null
    },
    saveEmail(text: string) {
      const id = this.emailModalNodeId
      if (!id) return
      const node = this.nodes.find((n) => n.id === id)
      if (node) {
        node.data.emailText = text
        node.data.sub = text.split('\n')[0]?.slice(0, 40) || 'Pasted email'
      }
      this.emailModalNodeId = null
    },

    deleteNode(id: string) {
      this.nodes = this.nodes.filter((n) => n.id !== id)
      this.edges = this.edges.filter((e) => e.source !== id && e.target !== id)
      if (this.selectedId === id) this.clearSelection()
    },

    deleteEdge(id: string) {
      this.edges = this.edges.filter((e) => e.id !== id)
      if (this.selectedId === id) this.clearSelection()
    },

    connect(sourceId: string, targetId: string) {
      if (sourceId === targetId) return
      const exists = this.edges.some(
        (e) => (e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId),
      )
      if (exists) return
      const id = nextId('e')
      const edge: FunnelEdge = {
        id,
        source: sourceId,
        target: targetId,
        type: 'seam',
        data: {
          id,
          from: sourceId,
          to: targetId,
          status: 'unanalyzed' as SeamStatus,
          findings: [{ type: 'not_yet_analyzed', severity: 'none', text: 'Run analysis to score this seam.' }],
        },
      }
      this.edges.push(edge)
    },

    updateNodePosition(id: string, position: { x: number; y: number }) {
      const node = this.nodes.find((n) => n.id === id)
      if (node) node.position = position
    },
  },
})
