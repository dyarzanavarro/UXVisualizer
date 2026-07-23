<script setup lang="ts">
import { X, CheckCircle2, AlertTriangle, Trash2 } from '@lucide/vue'
import { useCanvasStore } from '~/stores/canvas'

const store = useCanvasStore()

function scoreColor(score: number | null) {
  if (score === null) return '#6b7280'
  if (score >= 80) return '#3fb88c'
  if (score >= 60) return '#e3a008'
  return '#d9603a'
}

function verdictColor(verdict: string) {
  return verdict === 'present' ? '#3fb88c' : '#e3a008'
}
</script>

<template>
  <div class="w-80 border-l border-neutral-800 bg-neutral-900 p-4 overflow-y-auto">
    <div v-if="!store.selectedNode && !store.selectedEdge" class="text-sm text-neutral-500 mt-8 text-center">
      Click a node or seam to see findings.
      <br /><br />
      Drag the small dot on a node's right edge to another node to draw a new seam.
    </div>

    <div v-if="store.selectedNode">
      <div class="flex items-center justify-between mb-1">
        <div class="font-medium text-sm text-neutral-100">{{ store.selectedNode.data.label }}</div>
        <button class="text-neutral-500 hover:text-neutral-300" @click="store.clearSelection()">
          <X :size="14" />
        </button>
      </div>
      <div class="text-xs text-neutral-500 mb-4">{{ store.selectedNode.data.sub }}</div>

      <div v-if="store.selectedNode.data.emailText" class="text-xs text-neutral-400 bg-neutral-800 rounded p-2 mb-4 whitespace-pre-wrap max-h-32 overflow-y-auto">
        {{ store.selectedNode.data.emailText }}
      </div>

      <template v-if="store.selectedNode.data.score !== null">
        <div class="text-2xl font-mono font-semibold mb-4" :style="{ color: scoreColor(store.selectedNode.data.score) }">
          {{ store.selectedNode.data.score }}<span class="text-sm text-neutral-500">/100</span>
        </div>
        <div class="space-y-3">
          <div
            v-for="(f, i) in store.selectedNode.data.findings"
            :key="i"
            class="text-xs border-l-2 pl-2.5"
            :style="{ borderColor: verdictColor(f.verdict) }"
          >
            <div class="font-mono text-neutral-500 mb-0.5">{{ f.id }} · {{ f.verdict.replace(/_/g, ' ') }}</div>
            <div class="text-neutral-300 leading-relaxed">{{ f.text }}</div>
          </div>
        </div>
      </template>
      <div v-else class="text-xs text-neutral-500 italic">Not analyzed yet.</div>
    </div>

    <div v-if="store.selectedEdge">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-1.5 font-medium text-sm text-neutral-100">
          <CheckCircle2 v-if="store.selectedEdge.data!.status === 'ok'" :size="14" color="#3fb88c" />
          <AlertTriangle v-else-if="store.selectedEdge.data!.status === 'break'" :size="14" color="#e3a008" />
          <span v-else class="w-3.5 h-3.5 rounded-full bg-neutral-600 inline-block" />
          Seam finding
        </div>
        <div class="flex items-center gap-2">
          <button class="text-neutral-600 hover:text-red-400" @click="store.deleteEdge(store.selectedEdge.id)">
            <Trash2 :size="13" />
          </button>
          <button class="text-neutral-500 hover:text-neutral-300" @click="store.clearSelection()">
            <X :size="14" />
          </button>
        </div>
      </div>
      <div class="space-y-3">
        <div
          v-for="(f, i) in store.selectedEdge.data!.findings"
          :key="i"
          class="text-xs border-l-2 pl-2.5"
          :style="{ borderColor: f.severity === 'none' ? '#3fb88c' : '#e3a008' }"
        >
          <div class="font-mono text-neutral-500 mb-0.5">
            {{ f.type.replace(/_/g, ' ') }}<template v-if="f.severity !== 'none'"> · {{ f.severity }}</template>
          </div>
          <div class="text-neutral-300 leading-relaxed">{{ f.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
