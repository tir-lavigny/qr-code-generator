<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQrPdf } from '@/composables/useQrPdf'
import { totalPages } from '@/composables/useQrPdf'
import type { ColumnMapping, GridConfig, ParsedRow } from '@/types/csv'
import { DEFAULT_GRID_CONFIG } from '@/types/csv'
import type {
    GenerateOptions,
    GenerateSummary,
    SortBy,
} from '@/composables/useQrPdf'
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
import { TriangleAlertIcon, FileDownIcon } from 'lucide-vue-next'
import { Checkbox } from '@/components/ui/checkbox'

const props = defineProps<{
    headers: string[]
    rows: ParsedRow[]
    initialMapping: ColumnMapping
}>()

const emit = defineEmits<{
    generated: [{ blob: Blob; summary: GenerateSummary }]
}>()

const mappingName = ref<string>(props.initialMapping.name ?? '')
const mappingFirstname = ref<string>(props.initialMapping.firstname ?? '')
const mappingAvs = ref<string>(props.initialMapping.avs_number ?? '')

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
        return 'Veuillez mapper les colonnes « Nom » et « Numéro AVS ».'
    if (!mapping.value.name) return 'Veuillez mapper la colonne « Nom ».'
    if (!mapping.value.avs_number)
        return 'Veuillez mapper la colonne « Numéro AVS ».'
    return null
})

const gridCols = ref(DEFAULT_GRID_CONFIG.cols)
const gridRows = ref(DEFAULT_GRID_CONFIG.rows)

const gridConfig = computed<GridConfig>(() => ({
    cols: gridCols.value,
    rows: gridRows.value,
}))

const pageCount = computed(() =>
    totalPages(props.rows.length, gridConfig.value)
)

const { progress, isGenerating, generatePdf } = useQrPdf()

const deduplicateAvs = ref(DEFAULT_GENERATE_OPTIONS.deduplicateAvs)
const skipInvalidRows = ref(DEFAULT_GENERATE_OPTIONS.skipInvalidRows)
const sortBy = ref<SortBy>(DEFAULT_GENERATE_OPTIONS.sortBy!)

watch(
    () => mappingFirstname.value,
    (val) => {
        if (!val && sortBy.value === 'firstname') {
            sortBy.value = 'name'
        }
    }
)

const generateOptions = computed<GenerateOptions>(() => ({
    deduplicateAvs: deduplicateAvs.value,
    skipInvalidRows: skipInvalidRows.value,
    sortBy: sortBy.value,
}))

async function onGenerate() {
    if (!isValid.value) return
    try {
        const result = await generatePdf(
            props.rows,
            mapping.value,
            gridConfig.value,
            generateOptions.value
        )
        emit('generated', result)
    } catch (err) {
        toast.error('Échec de la génération du PDF', {
            description: err instanceof Error ? err.message : String(err),
        })
    }
}

const NONE_VALUE = '__none__'
</script>

<template>
    <Card class="w-full">
        <CardHeader>
            <CardTitle>Mapper les colonnes</CardTitle>
            <CardDescription>
                Associez les colonnes de votre CSV aux champs requis, puis
                configurez la mise en page d'impression.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div class="space-y-1.5">
                    <Label>
                        Nom
                        <span class="text-destructive ml-0.5">*</span>
                    </Label>
                    <Select v-model="mappingName">
                        <SelectTrigger>
                            <SelectValue
                                placeholder="Sélectionner une colonne…"
                            />
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

                <div class="space-y-1.5">
                    <Label>Prénom</Label>
                    <Select v-model="mappingFirstname">
                        <SelectTrigger>
                            <SelectValue
                                placeholder="Sélectionner une colonne…"
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem :value="NONE_VALUE">
                                — aucun —
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

                <div class="space-y-1.5">
                    <Label>
                        Numéro AVS
                        <span class="text-destructive ml-0.5">*</span>
                    </Label>
                    <Select v-model="mappingAvs">
                        <SelectTrigger>
                            <SelectValue
                                placeholder="Sélectionner une colonne…"
                            />
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

            <div class="space-y-3">
                <p class="text-sm font-medium">Mise en page (A4)</p>
                <div class="flex flex-wrap items-end gap-6">
                    <div class="space-y-1.5">
                        <Label>Colonnes par page</Label>
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
                        <Label>Lignes par page</Label>
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
                        {{ gridCols * gridRows }} cartes/page &mdash;
                        {{ pageCount }} page(s) pour {{ rows.length }} lignes
                    </p>
                </div>
            </div>

            <Separator />

            <div class="space-y-3">
                <p class="text-sm font-medium">Options de traitement</p>
                <div class="space-y-3">
                    <div class="flex items-start gap-3">
                        <Checkbox
                            id="dedup-avs"
                            v-model:checked="deduplicateAvs"
                            :default-value="deduplicateAvs"
                        />
                        <div class="space-y-0.5">
                            <Label for="dedup-avs" class="cursor-pointer">
                                Dédoublonner par numéro AVS
                            </Label>
                            <p class="text-muted-foreground text-xs">
                                Génère un seul QR code par numéro AVS unique.
                                Les doublons suivants sont ignorés.
                            </p>
                        </div>
                    </div>

                    <div class="flex items-start gap-3">
                        <Checkbox
                            id="skip-invalid"
                            v-model:checked="skipInvalidRows"
                            :default-value="skipInvalidRows"
                        />
                        <div class="space-y-0.5">
                            <Label for="skip-invalid" class="cursor-pointer">
                                Ignorer les lignes incomplètes
                            </Label>
                            <p class="text-muted-foreground text-xs">
                                Ignore silencieusement les lignes sans nom ou
                                numéro AVS. Si décoché, les données manquantes
                                provoquent une erreur.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div class="space-y-3">
                <p class="text-sm font-medium">Ordre de tri</p>
                <div class="space-y-1.5">
                    <Label for="sort-by">Trier par</Label>
                    <Select v-model="sortBy">
                        <SelectTrigger id="sort-by" class="w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Nom (A → Z)</SelectItem>
                            <SelectItem
                                value="firstname"
                                :disabled="!mapping.firstname"
                            >
                                Prénom (A → Z)
                            </SelectItem>
                            <SelectItem value="none">Aucun tri</SelectItem>
                        </SelectContent>
                    </Select>
                    <p
                        v-if="sortBy === 'firstname' && !mapping.firstname"
                        class="text-muted-foreground text-xs"
                    >
                        Aucune colonne « Prénom » mappée — tri par nom appliqué.
                    </p>
                </div>
            </div>

            <Separator />

            <div class="space-y-3">
                <Button
                    :disabled="!isValid || isGenerating"
                    class="w-full sm:w-auto"
                    @click="onGenerate"
                >
                    <FileDownIcon class="mr-2 size-4" />
                    {{
                        isGenerating ? 'Génération en cours…' : 'Générer le PDF'
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
