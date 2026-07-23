import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AssetType, FunnelEdgeData, FunnelNodeData, SeamStatus } from '~/types/canvas'

// Deliberately not `Node<FunnelNodeData>` / `Edge<FunnelEdgeData>` from
// @vue-flow/core: those generics are self-referential (Node's class/style
// fields reference GraphNode<Data>, which extends Node again) and blow up
// TS's instantiation depth once wrapped in a Pinia store's inferred return
// type. <VueFlow :nodes :edges> only needs these fields structurally, so a
// plain, non-recursive shape is both sufficient and safe to type-check.
export interface FunnelNode {
  id: string
  type: AssetType
  position: { x: number; y: number }
  data: FunnelNodeData
}

export interface FunnelEdge {
  id: string
  source: string
  target: string
  type: 'seam'
  data: FunnelEdgeData
}

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

export const useCanvasStore = defineStore('canvas', () => {
  const nodes = ref<FunnelNode[]>(structuredClone(initialNodes))
  const edges = ref<FunnelEdge[]>(structuredClone(initialEdges))
  const selectedKind = ref<SelectionKind>(null)
  const selectedId = ref<string | null>(null)
  const emailModalNodeId = ref<string | null>(null)

  const selectedNode = computed<FunnelNode | null>(() => {
    if (selectedKind.value !== 'node') return null
    return nodes.value.find((n) => n.id === selectedId.value) ?? null
  })

  const selectedEdge = computed<FunnelEdge | null>(() => {
    if (selectedKind.value !== 'edge') return null
    return edges.value.find((e) => e.id === selectedId.value) ?? null
  })

  function selectNode(id: string) {
    selectedKind.value = 'node'
    selectedId.value = id
  }

  function selectEdge(id: string) {
    selectedKind.value = 'edge'
    selectedId.value = id
  }

  function clearSelection() {
    selectedKind.value = null
    selectedId.value = null
  }

  function addNode(type: AssetType) {
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
    nodes.value.push(node)
    return id
  }

  function setNodeImage(id: string, dataUrl: string, fileName: string) {
    const node = nodes.value.find((n) => n.id === id)
    if (!node) return
    node.data.imageSrc = dataUrl
    node.data.sub = fileName
  }

  function openEmailModal(id: string) {
    emailModalNodeId.value = id
  }

  function closeEmailModal() {
    emailModalNodeId.value = null
  }

  function saveEmail(text: string) {
    const id = emailModalNodeId.value
    if (!id) return
    const node = nodes.value.find((n) => n.id === id)
    if (node) {
      node.data.emailText = text
      node.data.sub = text.split('\n')[0]?.slice(0, 40) || 'Pasted email'
    }
    emailModalNodeId.value = null
  }

  function deleteNode(id: string) {
    nodes.value = nodes.value.filter((n) => n.id !== id)
    edges.value = edges.value.filter((e) => e.source !== id && e.target !== id)
    if (selectedId.value === id) clearSelection()
  }

  function deleteEdge(id: string) {
    edges.value = edges.value.filter((e) => e.id !== id)
    if (selectedId.value === id) clearSelection()
  }

  function connect(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const exists = edges.value.some(
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
    edges.value.push(edge)
  }

  function updateNodePosition(id: string, position: { x: number; y: number }) {
    const node = nodes.value.find((n) => n.id === id)
    if (node) node.position = position
  }

  return {
    nodes,
    edges,
    selectedKind,
    selectedId,
    emailModalNodeId,
    selectedNode,
    selectedEdge,
    selectNode,
    selectEdge,
    clearSelection,
    addNode,
    setNodeImage,
    openEmailModal,
    closeEmailModal,
    saveEmail,
    deleteNode,
    deleteEdge,
    connect,
    updateNodePosition,
  }
})
