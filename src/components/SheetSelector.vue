<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WorkBook } from 'xlsx'
import { parseExcelSheet } from '@/composables/useExcelParser'
import { detectColumnMapping } from '@/composables/useCsvParser'
import type { ColumnMapping, ParsedRow } from '@/types/csv'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { TableIcon } from 'lucide-vue-next'

const PREVIEW_ROWS = 10

const props = defineProps<{
    sheetNames: string[]
    workbook: WorkBook
}>()

const emit = defineEmits<{
    selected: [
        data: { headers: string[]; rows: ParsedRow[]; mapping: ColumnMapping },
    ]
}>()

const selectedSheet = ref<string>(props.sheetNames[0] ?? '')
const error = ref<string | null>(null)

const sheetData = computed(() => {
    if (!selectedSheet.value) return null
    return parseExcelSheet(props.workbook, selectedSheet.value)
})

const rowCount = computed(() => sheetData.value?.rows.length ?? null)
const previewHeaders = computed(() => sheetData.value?.headers ?? [])
const previewRows = computed(() => sheetData.value?.rows.slice(0, PREVIEW_ROWS) ?? [])

function onConfirm() {
    if (!selectedSheet.value || !sheetData.value) return
    if (sheetData.value.error) {
        error.value = sheetData.value.error
        return
    }
    const mapping = detectColumnMapping(sheetData.value.headers)
    emit('selected', {
        headers: sheetData.value.headers,
        rows: sheetData.value.rows,
        mapping,
    })
}
</script>

<template>
    <Card class="w-full">
        <CardHeader>
            <CardTitle>Sélectionner une feuille</CardTitle>
            <CardDescription>
                Choisissez la feuille Excel à utiliser pour la génération des QR
                codes.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <div class="flex items-center gap-3">
                <Select v-model="selectedSheet">
                    <SelectTrigger class="w-72">
                        <SelectValue placeholder="Choisir une feuille…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="name in sheetNames"
                            :key="name"
                            :value="name"
                        >
                            <span class="flex items-center gap-2">
                                <TableIcon class="size-3.5 shrink-0" />
                                {{ name }}
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Badge v-if="rowCount !== null" variant="secondary">
                    {{ rowCount }} ligne{{ rowCount !== 1 ? 's' : '' }}
                </Badge>
            </div>

            <p v-if="error" class="text-destructive text-sm">{{ error }}</p>

            <div
                v-if="previewRows.length > 0"
                class="space-y-2"
            >
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">Aperçu</span>
                    <span
                        v-if="rowCount !== null && rowCount > PREVIEW_ROWS"
                        class="text-muted-foreground text-xs"
                    >
                        {{ PREVIEW_ROWS }} premières lignes affichées
                    </span>
                </div>

                <div class="max-h-72 overflow-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    v-for="header in previewHeaders"
                                    :key="header"
                                >
                                    {{ header }}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow
                                v-for="(row, i) in previewRows"
                                :key="i"
                            >
                                <TableCell
                                    v-for="header in previewHeaders"
                                    :key="header"
                                >
                                    {{ row[header] }}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Button :disabled="!selectedSheet" @click="onConfirm">
                Continuer
            </Button>
        </CardContent>
    </Card>
</template>
