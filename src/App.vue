<script setup lang="ts">
import { ref } from 'vue'
import UploadForm from '@/components/UploadForm.vue'
import ColumnMapper from '@/components/ColumnMapper.vue'
import { Toaster as Sonner } from '@/components/ui/sonner'
import {
    Stepper,
    StepperItem,
    StepperSeparator,
    StepperIndicator,
    StepperTitle,
    StepperTrigger,
} from '@/components/ui/stepper'
import type { ColumnMapping, ParsedRow } from '@/types/csv'
import { UploadIcon, SlidersHorizontalIcon } from 'lucide-vue-next'

type Step = 'upload' | 'map'

const step = ref<Step>('upload')
const csvHeaders = ref<string[]>([])
const csvRows = ref<ParsedRow[]>([])
const csvMapping = ref<ColumnMapping>({
    name: null,
    firstname: null,
    avs_number: null,
})

const STEPS = [
    { id: 'upload', label: 'Importer', icon: UploadIcon },
    { id: 'map', label: 'Mapper & Générer', icon: SlidersHorizontalIcon },
] as const

function onParsed(data: {
    headers: string[]
    rows: ParsedRow[]
    mapping: ColumnMapping
}) {
    csvHeaders.value = data.headers
    csvRows.value = data.rows
    csvMapping.value = data.mapping
    step.value = 'map'
}

function goToStep(target: Step) {
    // Only allow going back to upload
    if (target === 'upload') step.value = 'upload'
}
</script>

<template>
    <Sonner position="bottom-right" rich-colors />

    <main class="bg-background min-h-screen w-full px-4 py-10">
        <div class="mx-auto max-w-3xl space-y-8">
            <!-- Header -->
            <div class="space-y-1">
                <h1 class="text-2xl font-bold tracking-tight">
                    Générateur de QR Codes
                </h1>
                <p class="text-muted-foreground text-sm">
                    Importez un fichier CSV, mappez les colonnes, et téléchargez
                    un PDF prêt à imprimer avec les QR codes.
                </p>
            </div>

            <!-- Stepper -->
            <Stepper
                :model-value="step === 'upload' ? 1 : 2"
                class="flex w-full gap-2"
            >
                <StepperItem
                    v-for="(s, i) in STEPS"
                    :key="s.id"
                    :step="i + 1"
                    class="flex flex-1 flex-col gap-2"
                >
                    <StepperTrigger
                        class="flex items-center gap-2"
                        @click="goToStep(s.id)"
                    >
                        <StepperIndicator>
                            <component :is="s.icon" class="size-4" />
                        </StepperIndicator>
                        <StepperTitle>{{ s.label }}</StepperTitle>
                    </StepperTrigger>
                    <StepperSeparator
                        v-if="i < STEPS.length - 1"
                        class="flex-1"
                    />
                </StepperItem>
            </Stepper>

            <!-- Step content -->
            <UploadForm v-if="step === 'upload'" @parsed="onParsed" />

            <div v-else class="space-y-4">
                <!-- Allow re-uploading from step 2 -->
                <UploadForm @parsed="onParsed" />
                <ColumnMapper
                    :headers="csvHeaders"
                    :rows="csvRows"
                    :initial-mapping="csvMapping"
                />
            </div>
        </div>
    </main>
</template>
