<script setup lang="ts">
import { useCanvasStore } from '~/stores/canvas'

const store = useCanvasStore()
const draft = ref('')
const error = ref('')

watch(
  () => store.urlModalNodeId,
  (id) => {
    if (id) {
      draft.value = ''
      error.value = ''
    }
  },
)

function save() {
  const value = draft.value.trim()
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
  } catch {
    error.value = 'Enter a full URL, e.g. https://example.com'
    return
  }
  store.saveUrl(value)
}

function cancel() {
  store.closeUrlModal()
}
</script>

<template>
  <div
    v-if="store.urlModalNodeId"
    class="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
    @click="cancel"
  >
    <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 w-[480px]" @click.stop>
      <div class="text-sm font-medium mb-2 text-neutral-100">Funnel step URL</div>
      <input
        v-model="draft"
        autofocus
        type="text"
        placeholder="https://example.com/checkout"
        class="w-full bg-neutral-800 text-xs rounded p-2 text-neutral-200 outline-none border border-neutral-700 focus:border-emerald-500"
        @keyup.enter="save"
      />
      <div v-if="error" class="text-xs text-red-400 mt-1.5">{{ error }}</div>
      <div class="flex justify-end gap-2 mt-3">
        <button class="text-xs px-3 py-1.5 rounded-md text-neutral-400 hover:text-neutral-200" @click="cancel">Cancel</button>
        <button class="text-xs px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>
