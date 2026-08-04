<script setup lang="ts">
import { ref } from 'vue'
import { Toaster as Sonner } from '@/components/ui/sonner'
import LandingPage from '@/views/LandingPage.vue'
import AvsQrView from '@/views/AvsQrView.vue'
import WifiQrView from '@/views/WifiQrView.vue'

type Feature = 'avs' | 'wifi' | null

const feature = ref<Feature>(null)
</script>

<template>
    <Sonner position="bottom-right" rich-colors />

    <main class="bg-background min-h-screen w-full px-4 py-10">
        <div class="mx-auto max-w-5xl space-y-8">
            <LandingPage v-if="!feature" @select="feature = $event" />
            <AvsQrView v-else-if="feature === 'avs'" @back="feature = null" />
            <WifiQrView v-else-if="feature === 'wifi'" @back="feature = null" />
        </div>
    </main>
</template>
