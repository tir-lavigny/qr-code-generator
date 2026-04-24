<script setup lang="ts">
import { ref } from 'vue'
import type { WorkBook } from 'xlsx'
import UploadForm from '@/components/UploadForm.vue'
import SheetSelector from '@/components/SheetSelector.vue'
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
import { UploadIcon, TableIcon, SlidersHorizontalIcon } from 'lucide-vue-next'

type Step = 'upload' | 'sheet' | 'map'

const step = ref<Step>('upload')
const csvHeaders = ref<string[]>([])
const csvRows = ref<ParsedRow[]>([])
const csvMapping = ref<ColumnMapping>({
    name: null,
    firstname: null,
    avs_number: null,
})

// Excel-specific state
const excelWorkbook = ref<WorkBook | null>(null)
const excelSheetNames = ref<string[]>([])

const STEPS = [
    { id: 'upload', label: 'Importer', icon: UploadIcon },
    { id: 'sheet', label: 'Feuille', icon: TableIcon },
    { id: 'map', label: 'Mapper & Générer', icon: SlidersHorizontalIcon },
] as const

/** Current 1-based step index for the Stepper component */
function stepIndex(s: Step): number {
    return s === 'upload' ? 1 : s === 'sheet' ? 2 : 3
}

/** Called when a CSV is uploaded — skip the sheet selection step */
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

/** Called when an Excel file is uploaded — go to sheet selection */
function onExcelLoaded(data: { sheetNames: string[]; workbook: WorkBook }) {
    excelSheetNames.value = data.sheetNames
    excelWorkbook.value = data.workbook
    step.value = 'sheet'
}

/** Called once the user has selected a sheet */
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

function goToStep(target: Step) {
    if (target === 'upload') step.value = 'upload'
    if (target === 'sheet' && excelWorkbook.value) step.value = 'sheet'
}
</script>

<template>
    <Sonner position="bottom-right" rich-colors />

    <main class="bg-background min-h-screen w-full px-4 py-10">
        <div class="mx-auto max-w-3xl space-y-8">
            <div class="space-y-1">
                <h1 class="text-2xl font-bold tracking-tight">
                    Générateur de QR Codes
                </h1>
                <p class="text-muted-foreground text-sm">
                    Importez un fichier CSV ou Excel, mappez les colonnes, et
                    téléchargez un PDF prêt à imprimer avec les QR codes.
                </p>
            </div>

            <Stepper
                :model-value="stepIndex(step)"
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

            <div v-else class="space-y-4">
                <UploadForm
                    @csv-parsed="onCsvParsed"
                    @excel-loaded="onExcelLoaded"
                />
                <ColumnMapper
                    :headers="csvHeaders"
                    :rows="csvRows"
                    :initial-mapping="csvMapping"
                />
            </div>
        </div>
    </main>
</template>
