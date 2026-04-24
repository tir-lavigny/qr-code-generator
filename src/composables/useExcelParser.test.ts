import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { readExcelFile, parseExcelSheet } from './useExcelParser'
import { detectColumnMapping } from './useCsvParser'

function makeWorkbook(
    sheets: Record<string, Record<string, string>[]>
): XLSX.WorkBook {
    const wb = XLSX.utils.book_new()
    for (const [name, data] of Object.entries(sheets)) {
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, name)
    }
    return wb
}

function workbookToFile(wb: XLSX.WorkBook, filename = 'test.xlsx'): File {
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    return new File([buf], filename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
}

describe('parseExcelSheet', () => {
    it('returns headers and rows from a valid sheet', () => {
        const wb = makeWorkbook({
            Members: [
                { FirstName: 'John', LastName: 'Doe', InsuranceNumber: '756.1234.5678.90' },
                { FirstName: 'Jane', LastName: 'Smith', InsuranceNumber: '756.9876.5432.10' },
            ],
        })
        const result = parseExcelSheet(wb, 'Members')
        expect(result.error).toBeNull()
        expect(result.headers).toEqual(['FirstName', 'LastName', 'InsuranceNumber'])
        expect(result.rows).toHaveLength(2)
        expect(result.rows[0]['FirstName']).toBe('John')
        expect(result.rows[0]['InsuranceNumber']).toBe('756.1234.5678.90')
    })

    it('returns error for a missing sheet name', () => {
        const wb = makeWorkbook({ Sheet1: [{ a: '1' }] })
        const result = parseExcelSheet(wb, 'NonExistent')
        expect(result.error).not.toBeNull()
        expect(result.headers).toHaveLength(0)
        expect(result.rows).toHaveLength(0)
    })

    it('returns empty rows for an empty sheet', () => {
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'Empty')
        const result = parseExcelSheet(wb, 'Empty')
        expect(result.error).toBeNull()
        expect(result.rows).toHaveLength(0)
    })

    it('returns error when a sheet row has no column keys', () => {
        const wb = XLSX.utils.book_new()
        const ws: XLSX.WorkSheet = {}
        wb.SheetNames = ['NoHeaders']
        wb.Sheets = { NoHeaders: ws }
        const result = parseExcelSheet(wb, 'NoHeaders')
        expect(result.rows).toHaveLength(0)
    })

    it('converts all values to strings', () => {
        const wb = makeWorkbook({
            Data: [{ Name: 'Alice', Count: '42', Active: 'true' }],
        })
        const result = parseExcelSheet(wb, 'Data')
        expect(typeof result.rows[0]['Count']).toBe('string')
        expect(result.rows[0]['Count']).toBe('42')
    })

    it('filters out fully-empty rows', () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['FirstName', 'LastName'],
            ['John', 'Doe'],
            ['', ''],
            ['Jane', 'Smith'],
        ])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
        const result = parseExcelSheet(wb, 'Sheet1')
        expect(result.rows).toHaveLength(2)
    })
})

describe('readExcelFile', () => {
    it('returns sheet names and workbook for a valid .xlsx file', async () => {
        const wb = makeWorkbook({
            DataSource: [{ FirstName: 'A', LastName: 'B', InsuranceNumber: '756.0000.0000.00' }],
            Translations: [{ key: 'val' }],
        })
        const file = workbookToFile(wb)
        const result = await readExcelFile(file)
        expect(result.error).toBeNull()
        expect(result.workbook).not.toBeNull()
        expect(result.sheetNames).toEqual(['DataSource', 'Translations'])
    })

    it('returns the correct sheet names', async () => {
        const wb = makeWorkbook({
            DataSource: [{ FirstName: 'A', LastName: 'B', InsuranceNumber: '756.0000.0000.00' }],
            Translations: [{ key: 'val' }],
        })
        const file = workbookToFile(wb)
        const result = await readExcelFile(file)
        expect(result.error).toBeNull()
        expect(result.workbook).not.toBeNull()
        expect(result.sheetNames).toEqual(['DataSource', 'Translations'])
    })
})

describe('FST template column auto-detection', () => {
    it('auto-detects FirstName, LastName and InsuranceNumber', () => {
        const headers = ['FirstName', 'LastName', 'InsuranceNumber']
        const mapping = detectColumnMapping(headers)
        expect(mapping.firstname).toBe('FirstName')
        expect(mapping.name).toBe('LastName')
        expect(mapping.avs_number).toBe('InsuranceNumber')
    })
})
