<script setup lang="ts">
import { VueFlow, type Connection, type NodeMouseEvent, type EdgeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useCanvasStore } from '~/stores/canvas'
import FunnelNode from './FunnelNode.vue'
import SeamEdge from './SeamEdge.vue'
import SidePanel from './SidePanel.vue'
import Toolbar from './Toolbar.vue'
import EmailModal from './EmailModal.vue'
import UrlModal from './UrlModal.vue'

const store = useCanvasStore()

function onConnect(connection: Connection) {
  store.connect(connection.source, connection.target)
}

function onNodeClick(event: NodeMouseEvent) {
  store.selectNode(event.node.id)
}

function onEdgeClick(event: EdgeMouseEvent) {
  store.selectEdge(event.edge.id)
}

function onPaneClick() {
  store.clearSelection()
}

function onNodeDragStop(event: { node: { id: string; position: { x: number; y: number } } }) {
  store.updateNodePosition(event.node.id, event.node.position)
}
</script>

<template>
  <div class="w-full h-screen bg-neutral-950 text-neutral-100 flex flex-col relative">
    <Toolbar />

    <div class="flex-1 flex overflow-hidden">
      <VueFlow
        :nodes="store.nodes"
        :edges="store.edges"
        class="flex-1"
        :default-viewport="{ zoom: 1 }"
        :min-zoom="0.3"
        :max-zoom="2"
        @connect="onConnect"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @pane-click="onPaneClick"
        @node-drag-stop="onNodeDragStop"
      >
        <Background pattern-color="#262626" :gap="22" />
        <Controls />

        <template #node-url="props">
          <FunnelNode v-bind="props" />
        </template>
        <template #node-image="props">
          <FunnelNode v-bind="props" />
        </template>
        <template #node-email="props">
          <FunnelNode v-bind="props" />
        </template>
        <template #edge-seam="props">
          <SeamEdge v-bind="props" />
        </template>
      </VueFlow>

      <SidePanel />
    </div>

    <EmailModal />
    <UrlModal />
  </div>
</template>
