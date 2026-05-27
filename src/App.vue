<script setup lang="ts">
import { ref } from 'vue'
import type { WorkBook } from 'xlsx'
import UploadForm from '@/components/UploadForm.vue'
import SheetSelector from '@/components/SheetSelector.vue'
import ColumnMapper from '@/components/ColumnMapper.vue'
import PdfPreview from '@/components/PdfPreview.vue'
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
import type { GenerateSummary } from '@/composables/useQrPdf'
import { UploadIcon, TableIcon, SlidersHorizontalIcon, EyeIcon } from 'lucide-vue-next'

type Step = 'upload' | 'sheet' | 'map' | 'preview'

const step = ref<Step>('upload')
const csvHeaders = ref<string[]>([])
const csvRows = ref<ParsedRow[]>([])
const csvMapping = ref<ColumnMapping>({
    name: null,
    firstname: null,
    avs_number: null,
})

const excelWorkbook = ref<WorkBook | null>(null)
const excelSheetNames = ref<string[]>([])

const previewBlob = ref<Blob | null>(null)
const previewSummary = ref<GenerateSummary | null>(null)

const STEPS = [
    { id: 'upload', label: 'Importer', icon: UploadIcon },
    { id: 'sheet', label: 'Feuille', icon: TableIcon },
    { id: 'map', label: 'Mapper & Générer', icon: SlidersHorizontalIcon },
    { id: 'preview', label: 'Prévisualisation', icon: EyeIcon },
] as const

function stepIndex(s: Step): number {
    if (s === 'upload') return 1
    if (s === 'sheet') return 2
    if (s === 'map') return 3
    return 4
}

function onCsvParsed(data: {
    headers: string[]
    rows: ParsedRow[]
    mapping: ColumnMapping
}) {
    csvHeaders.value = data.headers
    csvRows.value = data.rows
    csvMapping.value = data.mapping
    excelWorkbook.value = null
    excelSheetNames.value = []
    step.value = 'map'
}

function onExcelLoaded(data: { sheetNames: string[]; workbook: WorkBook }) {
    excelSheetNames.value = data.sheetNames
    excelWorkbook.value = data.workbook
    step.value = 'sheet'
}

function onSheetSelected(data: {
    headers: string[]
    rows: ParsedRow[]
    mapping: ColumnMapping
}) {
    csvHeaders.value = data.headers
    csvRows.value = data.rows
    csvMapping.value = data.mapping
    step.value = 'map'
}

function onGenerated(data: { blob: Blob; summary: GenerateSummary }) {
    previewBlob.value = data.blob
    previewSummary.value = data.summary
    step.value = 'preview'
}

function goToStep(target: Step) {
    if (target === 'upload') step.value = 'upload'
    if (target === 'sheet' && excelWorkbook.value) step.value = 'sheet'
    if (target === 'map' && csvHeaders.value.length > 0) step.value = 'map'
}
</script>

<template>
    <Sonner position="bottom-right" rich-colors />

    <main class="bg-background min-h-screen w-full px-4 py-10">
        <div class="mx-auto max-w-5xl space-y-8">
            <div class="space-y-1">
                <h1 class="text-2xl font-bold tracking-tight">
                    Générateur de QR Codes
                </h1>
                <p class="text-muted-foreground text-sm">
                    Importez un fichier CSV ou Excel, mappez les colonnes, et
                    téléchargez un PDF prêt à imprimer avec les QR codes.
                </p>
            </div>

            <Stepper :model-value="stepIndex(step)" class="flex w-full gap-2">
                <StepperItem
                    v-for="(s, i) in STEPS"
                    :key="s.id"
                    :step="i + 1"
                    class="flex flex-1 flex-col gap-2"
                >
                    <StepperTrigger
                        class="flex items-center gap-2"
                        @click="goToStep(s.id as Step)"
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

            <UploadForm
                v-if="step === 'upload'"
                @csv-parsed="onCsvParsed"
                @excel-loaded="onExcelLoaded"
            />

            <template v-else-if="step === 'sheet'">
                <UploadForm
                    @csv-parsed="onCsvParsed"
                    @excel-loaded="onExcelLoaded"
                />
                <SheetSelector
                    v-if="excelWorkbook && excelSheetNames.length > 0"
                    :sheet-names="excelSheetNames"
                    :workbook="excelWorkbook"
                    @selected="onSheetSelected"
                />
            </template>

            <template v-else-if="step === 'map'">
                <UploadForm
                    @csv-parsed="onCsvParsed"
                    @excel-loaded="onExcelLoaded"
                />
                <ColumnMapper
                    :headers="csvHeaders"
                    :rows="csvRows"
                    :initial-mapping="csvMapping"
                    @generated="onGenerated"
                />
            </template>

            <PdfPreview
                v-else-if="step === 'preview' && previewBlob && previewSummary"
                :blob="previewBlob"
                :summary="previewSummary"
                @back="step = 'map'"
            />
        </div>
    </main>
</template>
