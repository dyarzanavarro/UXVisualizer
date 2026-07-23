<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Link2, Image as ImageIcon, Loader2, Mail, Trash2, TriangleAlert } from '@lucide/vue'
import type { FunnelNodeData } from '~/types/canvas'
import { useCanvasStore } from '~/stores/canvas'

const props = defineProps<{ id: string; data: FunnelNodeData; selected?: boolean }>()

const store = useCanvasStore()

const typeIcon = { url: Link2, image: ImageIcon, email: Mail }

function scoreColor(score: number | null) {
  if (score === null) return '#6b7280'
  if (score >= 80) return '#3fb88c'
  if (score >= 60) return '#e3a008'
  return '#d9603a'
}

function onDelete(e: MouseEvent) {
  e.stopPropagation()
  store.deleteNode(props.id)
}
</script>

<template>
  <div
    class="w-[220px] min-h-[92px] rounded-lg border select-none group bg-[#171b21]"
    :style="{ borderColor: selected ? '#3fb88c' : '#2a3038', boxShadow: selected ? '0 0 0 1px #3fb88c' : 'none' }"
  >
    <Handle type="target" :position="Position.Left" class="!bg-neutral-700 !border-neutral-950" />

    <img v-if="data.imageSrc" :src="data.imageSrc" alt="" class="w-full h-20 object-cover rounded-t-lg" />

    <div class="p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5 text-neutral-400">
          <component :is="typeIcon[data.type]" :size="12" />
          <span class="text-[10px] uppercase tracking-wide">{{ data.type }}</span>
        </div>
        <div class="flex items-center gap-2">
          <Loader2 v-if="data.analyzing" :size="12" class="animate-spin text-neutral-400" />
          <TriangleAlert v-else-if="data.analysisError" :size="12" color="#d9603a" />
          <span v-else-if="data.score !== null" class="text-xs font-mono font-semibold" :style="{ color: scoreColor(data.score) }">{{ data.score }}</span>
          <button class="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition" @click="onDelete">
            <Trash2 :size="11" />
          </button>
        </div>
      </div>
      <div class="font-medium text-sm text-neutral-100">{{ data.label }}</div>
      <div class="text-xs text-neutral-500 mt-0.5 truncate">{{ data.sub }}</div>
    </div>

    <Handle type="source" :position="Position.Right" class="!bg-neutral-700 !border-neutral-950 hover:!bg-emerald-500" />
  </div>
</template>
