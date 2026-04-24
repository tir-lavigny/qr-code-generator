import Papa from 'papaparse'
import type { ColumnMapping, ParsedRow } from '@/types/csv'

export interface CsvParseResult {
    headers: string[]
    rows: ParsedRow[]
    error: string | null
}

const FIELD_ALIASES: Record<keyof ColumnMapping, string[]> = {
    name: ['name', 'nom', 'last_name', 'lastname', 'surname', 'nachname'],
    firstname: [
        'firstname',
        'first_name',
        'prenom',
        'prénom',
        'vorname',
        'given_name',
    ],
    avs_number: [
        'avs_number',
        'avs',
        'avs number',
        'numéro avs',
        'numero_avs',
        'numero avs',
        'ahv',
        'ahv_number',
        'ssn',
        'insurancenumber',
        'insurance_number',
        'insurance number',
        'no avs',
        'n° avs',
    ],
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
    const lower = headers.map((h) => h.trim().toLowerCase())

    const findMatch = (aliases: string[]): string | null => {
        for (const alias of aliases) {
            const idx = lower.indexOf(alias)
            if (idx !== -1) return headers[idx]
        }
        return null
    }

    return {
        name: findMatch(FIELD_ALIASES.name),
        firstname: findMatch(FIELD_ALIASES.firstname),
        avs_number: findMatch(FIELD_ALIASES.avs_number),
    }
}

export function parseCsvString(content: string): CsvParseResult {
    const results = Papa.parse<ParsedRow>(content, {
        header: true,
        skipEmptyLines: true,
    })

    if (results.errors.length > 0) {
        return { headers: [], rows: [], error: results.errors[0].message }
    }

    const headers = results.meta.fields ?? []

    if (headers.length === 0) {
        return { headers: [], rows: [], error: 'No columns found in CSV file.' }
    }

    return { headers, rows: results.data, error: null }
}

export async function parseCsv(file: File): Promise<CsvParseResult> {
    const text = await file.text()
    return parseCsvString(text)
}
