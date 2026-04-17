<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQrPdf } from '@/composables/useQrPdf'
import { totalPages } from '@/composables/useQrPdf'
import type { ColumnMapping, GridConfig, ParsedRow } from '@/types/csv'
import { DEFAULT_GRID_CONFIG } from '@/types/csv'
import type { GenerateOptions } from '@/composables/useQrPdf'
import { DEFAULT_GENERATE_OPTIONS } from '@/composables/useQrPdf'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    NumberField,
    NumberFieldContent,
    NumberFieldDecrement,
    NumberFieldIncrement,
    NumberFieldInput,
} from '@/components/ui/number-field'
import { toast } from 'vue-sonner'
import {
    TriangleAlertIcon,
    FileDownIcon,
    CheckCircleIcon,
} from 'lucide-vue-next'
import { Checkbox } from '@/components/ui/checkbox'

const props = defineProps<{
    headers: string[]
    rows: ParsedRow[]
    initialMapping: ColumnMapping
}>()

// — Column mapping —
const mappingName = ref<string>(props.initialMapping.name ?? '')
const mappingFirstname = ref<string>(props.initialMapping.firstname ?? '')
const mappingAvs = ref<string>(props.initialMapping.avs_number ?? '')

// Sync when parent re-emits (new file uploaded)
watch(
    () => props.initialMapping,
    (m) => {
        mappingName.value = m.name ?? ''
        mappingFirstname.value = m.firstname ?? ''
        mappingAvs.value = m.avs_number ?? ''
    }
)

const mapping = computed<ColumnMapping>(() => ({
    name: mappingName.value || null,
    firstname: mappingFirstname.value || null,
    avs_number: mappingAvs.value || null,
}))

const isValid = computed(
    () => !!mapping.value.name && !!mapping.value.avs_number
)

const validationError = computed(() => {
    if (!mapping.value.name && !mapping.value.avs_number)
        return 'Please map the "Name" and "AVS Number" columns.'
    if (!mapping.value.name) return 'Please map the "Name" column.'
    if (!mapping.value.avs_number) return 'Please map the "AVS Number" column.'
    return null
})

// — Grid config —
const gridCols = ref(DEFAULT_GRID_CONFIG.cols)
const gridRows = ref(DEFAULT_GRID_CONFIG.rows)

const gridConfig = computed<GridConfig>(() => ({
    cols: gridCols.value,
    rows: gridRows.value,
}))

const pageCount = computed(() =>
    totalPages(props.rows.length, gridConfig.value)
)

// — PDF generation —
const { progress, isGenerating, summary, generateAndDownload } = useQrPdf()

// — Generation options —
const deduplicateAvs = ref(DEFAULT_GENERATE_OPTIONS.deduplicateAvs)
const skipInvalidRows = ref(DEFAULT_GENERATE_OPTIONS.skipInvalidRows)

const generateOptions = computed<GenerateOptions>(() => ({
    deduplicateAvs: deduplicateAvs.value,
    skipInvalidRows: skipInvalidRows.value,
}))

async function onGenerate() {
    if (!isValid.value) return
    try {
        await generateAndDownload(
            props.rows,
            mapping.value,
            gridConfig.value,
            generateOptions.value
        )
        toast.success('PDF downloaded successfully!')
    } catch (err) {
        toast.error('Failed to generate PDF', {
            description: err instanceof Error ? err.message : String(err),
        })
    }
}

// Null option label
const NONE_VALUE = '__none__'
</script>

<template>
    <Card class="w-full">
        <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
                Match your CSV column names to the required fields, then
                configure the print layout.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
            <!-- Column mapping -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <!-- Name (required) -->
                <div class="space-y-1.5">
                    <Label>
                        Name
                        <span class="text-destructive ml-0.5">*</span>
                    </Label>
                    <Select v-model="mappingName">
                        <SelectTrigger>
                            <SelectValue placeholder="Select column…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem
                                v-for="h in headers"
                                :key="h"
                                :value="h"
                            >
                                {{ h }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Firstname (optional) -->
                <div class="space-y-1.5">
                    <Label>Firstname</Label>
                    <Select v-model="mappingFirstname">
                        <SelectTrigger>
                            <SelectValue placeholder="Select column…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem :value="NONE_VALUE">
                                — none —
                            </SelectItem>
                            <SelectItem
                                v-for="h in headers"
                                :key="h"
                                :value="h"
                            >
                                {{ h }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- AVS Number (required) -->
                <div class="space-y-1.5">
                    <Label>
                        AVS Number
                        <span class="text-destructive ml-0.5">*</span>
                    </Label>
                    <Select v-model="mappingAvs">
                        <SelectTrigger>
                            <SelectValue placeholder="Select column…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem
                                v-for="h in headers"
                                :key="h"
                                :value="h"
                            >
                                {{ h }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Alert v-if="validationError" variant="destructive">
                <TriangleAlertIcon class="size-4" />
                <AlertDescription>{{ validationError }}</AlertDescription>
            </Alert>

            <Separator />

            <!-- Grid config -->
            <div class="space-y-3">
                <p class="text-sm font-medium">Print Layout (A4)</p>
                <div class="flex flex-wrap items-end gap-6">
                    <div class="space-y-1.5">
                        <Label>Columns per page</Label>
                        <NumberField
                            v-model="gridCols"
                            :min="1"
                            :max="10"
                            class="w-32"
                        >
                            <NumberFieldContent>
                                <NumberFieldDecrement />
                                <NumberFieldInput />
                                <NumberFieldIncrement />
                            </NumberFieldContent>
                        </NumberField>
                    </div>

                    <div class="space-y-1.5">
                        <Label>Rows per page</Label>
                        <NumberField
                            v-model="gridRows"
                            :min="1"
                            :max="20"
                            class="w-32"
                        >
                            <NumberFieldContent>
                                <NumberFieldDecrement />
                                <NumberFieldInput />
                                <NumberFieldIncrement />
                            </NumberFieldContent>
                        </NumberField>
                    </div>

                    <p class="text-muted-foreground text-sm">
                        {{ gridCols * gridRows }} cards/page &mdash;
                        {{ pageCount }} page(s) for {{ rows.length }} rows
                    </p>
                </div>
            </div>

            <Separator />

            <!-- Processing options -->
            <div class="space-y-3">
                <p class="text-sm font-medium">Processing Options</p>
                <div class="space-y-3">
                    <div class="flex items-start gap-3">
                        <Checkbox
                            id="dedup-avs"
                            :default-value="deduplicateAvs"
                            v-model:checked="deduplicateAvs"
                        />
                        <div class="space-y-0.5">
                            <Label for="dedup-avs" class="cursor-pointer">
                                Deduplicate by AVS number
                            </Label>
                            <p class="text-muted-foreground text-xs">
                                Only generate one QR code per unique AVS number.
                                Subsequent duplicates are skipped.
                            </p>
                        </div>
                    </div>

                    <div class="flex items-start gap-3">
                        <Checkbox
                            id="skip-invalid"
                            :default-value="skipInvalidRows"
                            v-model:checked="skipInvalidRows"
                        />
                        <div class="space-y-0.5">
                            <Label for="skip-invalid" class="cursor-pointer">
                                Skip rows with missing data
                            </Label>
                            <p class="text-muted-foreground text-xs">
                                Silently ignore rows where name or AVS number is
                                empty. When unchecked, missing data causes an
                                error.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <!-- Generate -->
            <div class="space-y-3">
                <Button
                    :disabled="!isValid || isGenerating"
                    class="w-full sm:w-auto"
                    @click="onGenerate"
                >
                    <FileDownIcon class="mr-2 size-4" />
                    {{
                        isGenerating ? 'Generating…' : 'Generate & Download PDF'
                    }}
                </Button>

                <Progress
                    v-if="isGenerating"
                    :model-value="progress"
                    class="h-2"
                />

                <!-- Summary -->
                <div
                    v-if="summary && !isGenerating"
                    class="bg-muted rounded-lg border p-4 text-sm"
                >
                    <div class="mb-2 flex items-center gap-2 font-medium">
                        <CheckCircleIcon class="text-primary size-4" />
                        Generation complete
                    </div>
                    <ul class="text-muted-foreground space-y-1">
                        <li>
                            <span class="text-foreground font-medium">{{
                                summary.total
                            }}</span>
                            total rows in CSV
                        </li>
                        <li>
                            <span class="text-foreground font-medium">{{
                                summary.printed
                            }}</span>
                            QR codes printed
                        </li>
                        <li v-if="summary.duplicatesSkipped > 0">
                            <span class="text-foreground font-medium">{{
                                summary.duplicatesSkipped
                            }}</span>
                            duplicate AVS
                            {{
                                summary.duplicatesSkipped === 1
                                    ? 'number'
                                    : 'numbers'
                            }}
                            skipped
                        </li>
                        <li v-if="summary.invalidSkipped > 0">
                            <span class="text-foreground font-medium">{{
                                summary.invalidSkipped
                            }}</span>
                            {{ summary.invalidSkipped === 1 ? 'row' : 'rows' }}
                            skipped due to missing data
                        </li>
                    </ul>
                </div>
            </div>
        </CardContent>
    </Card>
</template>
