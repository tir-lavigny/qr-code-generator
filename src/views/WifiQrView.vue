<script setup lang="ts">
import { ref } from 'vue'
import WifiForm from '@/components/WifiForm.vue'
import PdfPreview from '@/components/PdfPreview.vue'
import { Button } from '@/components/ui/button'
import type { GenerateSummary } from '@/composables/useQrPdf'
import type { WifiConfig, WifiGridConfig } from '@/types/wifi'
import { DEFAULT_WIFI_GRID_CONFIG } from '@/types/wifi'
import { ArrowLeftIcon } from 'lucide-vue-next'

const emit = defineEmits<{
    back: []
}>()

type Step = 'form' | 'preview'

const step = ref<Step>('form')
const previewBlob = ref<Blob | null>(null)
const previewSummary = ref<GenerateSummary | null>(null)

const formSsid = ref('')
const formPassword = ref('')
const formAuthType = ref<WifiConfig['authType']>('WPA')
const formHidden = ref(false)
const formLayoutMode = ref<WifiGridConfig['mode']>(DEFAULT_WIFI_GRID_CONFIG.mode)
const formGridCols = ref(DEFAULT_WIFI_GRID_CONFIG.cols)
const formGridRows = ref(DEFAULT_WIFI_GRID_CONFIG.rows)
const formRepeatCount = ref(DEFAULT_WIFI_GRID_CONFIG.repeatCount)

function onGenerated(data: { blob: Blob; summary: GenerateSummary }) {
    previewBlob.value = data.blob
    previewSummary.value = data.summary
    step.value = 'preview'
}
</script>

<template>
    <div class="space-y-8">
        <div class="flex items-start justify-between">
            <div class="space-y-1">
                <h1 class="text-2xl font-bold tracking-tight">
                    QR Code WiFi
                </h1>
                <p class="text-muted-foreground text-sm">
                    Générez un QR code pour connecter automatiquement à un réseau
                    WiFi.
                </p>
            </div>
            <Button variant="ghost" size="sm" @click="emit('back')">
                <ArrowLeftIcon class="mr-2 size-4" />
                Menu
            </Button>
        </div>

        <WifiForm
            v-if="step === 'form'"
            v-model:ssid="formSsid"
            v-model:password="formPassword"
            v-model:auth-type="formAuthType"
            v-model:hidden="formHidden"
            v-model:layout-mode="formLayoutMode"
            v-model:grid-cols="formGridCols"
            v-model:grid-rows="formGridRows"
            v-model:repeat-count="formRepeatCount"
            @generated="onGenerated"
        />

        <PdfPreview
            v-if="step === 'preview' && previewBlob && previewSummary"
            :blob="previewBlob"
            :summary="previewSummary"
            @back="step = 'form'"
        />
    </div>
</template>
