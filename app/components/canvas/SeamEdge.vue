<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@vue-flow/core'
import type { FunnelEdgeData } from '~/types/canvas'
import { useCanvasStore } from '~/stores/canvas'

const props = defineProps<EdgeProps<FunnelEdgeData>>()

const store = useCanvasStore()

function edgeColor(status: FunnelEdgeData['status']) {
  if (status === 'ok') return '#3fb88c'
  if (status === 'break') return '#e3a008'
  return '#4a5160'
}

const path = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  }),
)

const color = computed(() => edgeColor(props.data!.status))
const dash = computed(() => (props.data!.status === 'unanalyzed' ? '2,4' : '5,5'))

function onSelect() {
  store.selectEdge(props.id)
}
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-end="markerEnd"
    :style="{ stroke: color, strokeWidth: 2, strokeDasharray: dash, cursor: 'pointer' }"
    @click="onSelect"
  />
  <EdgeLabelRenderer>
    <div
      class="absolute pointer-events-auto cursor-pointer rounded-full"
      data-testid="seam-dot"
      :data-seam-id="id"
      :style="{
        transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)`,
        width: '18px',
        height: '18px',
        background: color,
      }"
      @click="onSelect"
    />
  </EdgeLabelRenderer>
</template>
