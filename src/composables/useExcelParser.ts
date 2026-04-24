import * as XLSX from 'xlsx'
import type { ParsedRow } from '@/types/csv'
import type { CsvParseResult } from './useCsvParser'

export interface ExcelParseResult {
    sheetNames: string[]
    error: string | null
    workbook: XLSX.WorkBook | null
}

export interface ExcelSheetParseResult extends CsvParseResult {
    sheetName: string
}

/**
 * Reads an .xlsx file and returns the list of sheet names and the raw workbook.
 * Does not parse any sheet yet — call parseExcelSheet() after the user picks a sheet.
 */
export async function readExcelFile(file: File): Promise<ExcelParseResult> {
    try {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

        if (workbook.SheetNames.length === 0) {
            return {
                sheetNames: [],
                error: 'The Excel file contains no sheets.',
                workbook: null,
            }
        }

        return { sheetNames: workbook.SheetNames, error: null, workbook }
    } catch (e) {
        return {
            sheetNames: [],
            error:
                e instanceof Error ? e.message : 'Failed to read Excel file.',
            workbook: null,
        }
    }
}

/**
 * Parses a specific sheet from a workbook into the standard CsvParseResult format.
 * Values are converted to strings (dates formatted as ISO date strings).
 */
export function parseExcelSheet(
    workbook: XLSX.WorkBook,
    sheetName: string
): ExcelSheetParseResult {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
        return {
            sheetName,
            headers: [],
            rows: [],
            error: `Sheet "${sheetName}" not found.`,
        }
    }

    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
        worksheet,
        {
            defval: '',
            raw: false, // format dates and numbers as strings
        }
    )

    if (rawRows.length === 0) {
        return { sheetName, headers: [], rows: [], error: null }
    }

    const headers = Object.keys(rawRows[0])

    if (headers.length === 0) {
        return {
            sheetName,
            headers: [],
            rows: [],
            error: 'No columns found in the selected sheet.',
        }
    }

    const rows: ParsedRow[] = rawRows
        .filter((row) => Object.values(row).some((v) => v !== '' && v != null))
        .map((row) => {
            const cleaned: ParsedRow = {}
            for (const key of headers) {
                const val = row[key]
                cleaned[key] = val == null ? '' : String(val)
            }
            return cleaned
        })

    return { sheetName, headers, rows, error: null }
}
