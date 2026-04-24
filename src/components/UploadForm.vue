<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WorkBook } from 'xlsx'
import { parseCsv, detectColumnMapping } from '@/composables/useCsvParser'
import { readExcelFile } from '@/composables/useExcelParser'
import type { ColumnMapping, ParsedRow } from '@/types/csv'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { TriangleAlertIcon } from 'lucide-vue-next'

const PREVIEW_ROWS = 10

const emit = defineEmits<{
    /** Emitted when a CSV file is fully parsed and ready for column mapping */
    csvParsed: [
        data: { headers: string[]; rows: ParsedRow[]; mapping: ColumnMapping },
    ]
    /** Emitted when an Excel file is loaded — sheet selection is required next */
    excelLoaded: [data: { sheetNames: string[]; workbook: WorkBook }]
}>()

const error = ref<string | null>(null)
const headers = ref<string[]>([])
const rows = ref<ParsedRow[]>([])
const previewRows = computed(() => rows.value.slice(0, PREVIEW_ROWS))

async function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    error.value = null
    headers.value = []
    rows.value = []

    const isExcel =
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.type ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel'

    if (isExcel) {
        const result = await readExcelFile(file)
        if (result.error || !result.workbook) {
            error.value = result.error ?? 'Failed to read Excel file.'
            return
        }
        emit('excelLoaded', {
            sheetNames: result.sheetNames,
            workbook: result.workbook,
        })
        return
    }

    // CSV path
    const result = await parseCsv(file)
    if (result.error) {
        error.value = result.error
        return
    }

    headers.value = result.headers
    rows.value = result.rows

    const mapping = detectColumnMapping(result.headers)
    emit('csvParsed', { headers: result.headers, rows: result.rows, mapping })
}
</script>

<template>
    <Card class="w-full">
        <CardHeader>
            <CardTitle>Importer un fichier</CardTitle>
            <CardDescription>
                Sélectionnez un fichier CSV ou Excel (.xlsx) contenant les
                colonnes nom, prénom et numéro AVS.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <div class="grid w-full items-center gap-1.5">
                <Label for="data-file">Fichier CSV ou Excel</Label>
                <Input
                    id="data-file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    @change="onFileChange"
                />
            </div>

            <Alert v-if="error" variant="destructive">
                <TriangleAlertIcon class="size-4" />
                <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <div v-if="rows.length > 0" class="space-y-2">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">Aperçu</span>
                    <Badge variant="secondary">{{ rows.length }} lignes</Badge>
                    <span
                        v-if="rows.length > PREVIEW_ROWS"
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
                                    v-for="header in headers"
                                    :key="header"
                                >
                                    {{ header }}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="(row, i) in previewRows" :key="i">
                                <TableCell
                                    v-for="header in headers"
                                    :key="header"
                                >
                                    {{ row[header] }}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </CardContent>
    </Card>
</template>
