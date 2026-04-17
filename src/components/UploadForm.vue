<script setup lang="ts">
import { ref, computed } from 'vue'
import { parseCsv, detectColumnMapping } from '@/composables/useCsvParser'
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
    parsed: [
        data: { headers: string[]; rows: ParsedRow[]; mapping: ColumnMapping },
    ]
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

    const result = await parseCsv(file)

    if (result.error) {
        error.value = result.error
        return
    }

    headers.value = result.headers
    rows.value = result.rows

    const mapping = detectColumnMapping(result.headers)

    emit('parsed', {
        headers: result.headers,
        rows: result.rows,
        mapping,
    })
}
</script>

<template>
    <Card class="w-full">
        <CardHeader>
            <CardTitle>Importer un CSV</CardTitle>
            <CardDescription>
                Sélectionnez un fichier CSV contenant les colonnes nom, prénom
                et numéro AVS.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <div class="grid w-full items-center gap-1.5">
                <Label for="csv-file">Fichier CSV</Label>
                <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
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
