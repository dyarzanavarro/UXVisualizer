<script setup lang="ts">
import { useCanvasStore } from '~/stores/canvas'

const store = useCanvasStore()
const draft = ref('')

watch(
  () => store.emailModalNodeId,
  (id) => {
    if (id) draft.value = ''
  },
)

function save() {
  store.saveEmail(draft.value)
}

function cancel() {
  store.closeEmailModal()
}
</script>

<template>
  <div
    v-if="store.emailModalNodeId"
    class="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
    @click="cancel"
  >
    <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 w-[480px]" @click.stop>
      <div class="text-sm font-medium mb-2 text-neutral-100">Paste transactional email</div>
      <textarea
        v-model="draft"
        autofocus
        placeholder="Subject: Your order confirmation..."
        class="w-full h-40 bg-neutral-800 text-xs rounded p-2 text-neutral-200 outline-none border border-neutral-700 focus:border-emerald-500"
      />
      <div class="flex justify-end gap-2 mt-3">
        <button class="text-xs px-3 py-1.5 rounded-md text-neutral-400 hover:text-neutral-200" @click="cancel">Cancel</button>
        <button class="text-xs px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>
