<script setup lang="ts">
import { Link2, Loader2, Mail, Play, Upload } from '@lucide/vue'
import { useCanvasStore } from '~/stores/canvas'
import { useRunAnalysis } from '~/composables/useRunAnalysis'

const store = useCanvasStore()
const { run, running } = useRunAnalysis()
const fileInput = ref<HTMLInputElement | null>(null)
const pendingImageNodeId = ref<string | null>(null)

function addUrlNode() {
  const id = store.addNode('url')
  store.openUrlModal(id)
}

function triggerImageUpload() {
  pendingImageNodeId.value = store.addNode('image')
  fileInput.value?.click()
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !pendingImageNodeId.value) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    store.setNodeImage(pendingImageNodeId.value!, ev.target?.result as string, file.name)
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function addEmailNode() {
  const id = store.addNode('email')
  store.openEmailModal(id)
}
</script>

<template>
  <div class="border-b border-neutral-800 px-5 py-3 flex items-center justify-between bg-neutral-900">
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelected" />
    <div class="flex items-center gap-2">
      <span class="font-semibold text-sm tracking-tight text-neutral-100">funnel/seams</span>
      <span class="text-neutral-500 text-xs ml-2">canvas · drag handles to connect</span>
    </div>
    <div class="flex items-center gap-2">
      <button class="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-3 py-1.5 rounded-md transition" @click="addUrlNode">
        <Link2 :size="13" /> Add URL
      </button>
      <button class="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-3 py-1.5 rounded-md transition" @click="triggerImageUpload">
        <Upload :size="13" /> Upload image
      </button>
      <button class="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-3 py-1.5 rounded-md transition" @click="addEmailNode">
        <Mail :size="13" /> Paste email
      </button>
      <button
        class="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md transition font-medium ml-2"
        :disabled="running"
        @click="run"
      >
        <Loader2 v-if="running" :size="13" class="animate-spin" />
        <Play v-else :size="13" />
        {{ running ? 'Analyzing…' : 'Run analysis' }}
      </button>
    </div>
  </div>
</template>
