<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQrPdf } from '@/composables/useQrPdf'
import { totalPages } from '@/composables/useQrPdf'
import type { ColumnMapping, GridConfig, ParsedRow } from '@/types/csv'
import { DEFAULT_GRID_CONFIG } from '@/types/csv'
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
import { TriangleAlertIcon, FileDownIcon } from 'lucide-vue-next'

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
const { progress, isGenerating, generateAndDownload } = useQrPdf()

async function onGenerate() {
    if (!isValid.value) return
    try {
        await generateAndDownload(props.rows, mapping.value, gridConfig.value)
        toast.success('PDF downloaded successfully!', {
            description: `${props.rows.length} QR codes across ${pageCount.value} page(s).`,
        })
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
            </div>
        </CardContent>
    </Card>
</template>
