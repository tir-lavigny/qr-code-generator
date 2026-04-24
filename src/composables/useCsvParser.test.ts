import { describe, it, expect } from 'vitest'
import { detectColumnMapping, parseCsvString, parseCsv } from './useCsvParser'
import type { ParsedRow } from '@/types/csv'

describe('detectColumnMapping', () => {
    it('detects exact internal field names', () => {
        const mapping = detectColumnMapping(['name', 'firstname', 'avs_number'])
        expect(mapping).toEqual({
            name: 'name',
            firstname: 'firstname',
            avs_number: 'avs_number',
        })
    })

    it('detects French aliases', () => {
        const mapping = detectColumnMapping(['nom', 'prénom', 'numéro avs'])
        expect(mapping).toEqual({
            name: 'nom',
            firstname: 'prénom',
            avs_number: 'numéro avs',
        })
    })

    it('detects aliases case-insensitively', () => {
        const mapping = detectColumnMapping(['NOM', 'Prénom', 'AVS'])
        expect(mapping.name).toBe('NOM')
        expect(mapping.firstname).toBe('Prénom')
        expect(mapping.avs_number).toBe('AVS')
    })

    it('returns null for unrecognised columns', () => {
        const mapping = detectColumnMapping(['foo', 'bar', 'baz'])
        expect(mapping).toEqual({
            name: null,
            firstname: null,
            avs_number: null,
        })
    })

    it('firstname is null when column is absent', () => {
        const mapping = detectColumnMapping(['name', 'avs_number'])
        expect(mapping.firstname).toBeNull()
    })
})

describe('parseCsvString', () => {
    it('parses a valid CSV and returns headers + rows', () => {
        const csv =
            'name,firstname,avs_number\nDoe,John,756.1234.5678.90\nSmith,Jane,756.9876.5432.10'
        const result = parseCsvString(csv)
        expect(result.error).toBeNull()
        expect(result.headers).toEqual(['name', 'firstname', 'avs_number'])
        expect(result.rows).toHaveLength(2)
        expect((result.rows[0] as ParsedRow)['name']).toBe('Doe')
    })

    it('skips empty lines', () => {
        const csv =
            'name,avs_number\nDoe,756.1234.5678.90\n\n\nSmith,756.9876.5432.10\n'
        const result = parseCsvString(csv)
        expect(result.rows).toHaveLength(2)
    })

    it('returns error for empty string', () => {
        const result = parseCsvString('')
        expect(result.error).not.toBeNull()
        expect(result.headers).toHaveLength(0)
        expect(result.rows).toHaveLength(0)
    })

    it('returns headers even when there are no data rows', () => {
        const csv = 'name,firstname,avs_number\n'
        const result = parseCsvString(csv)
        expect(result.error).toBeNull()
        expect(result.headers).toEqual(['name', 'firstname', 'avs_number'])
        expect(result.rows).toHaveLength(0)
    })

    it('handles extra whitespace in values', () => {
        const csv = 'name,avs_number\n Doe , 756.1234.5678.90 '
        const result = parseCsvString(csv)
        expect(result.rows[0]['name']).toBe(' Doe ')
    })
})

describe('parseCsv', () => {
    it('reads a File and returns parsed headers and rows', async () => {
        const csv = 'name,avs_number\nDoe,756.1234.5678.90'
        const file = new File([csv], 'test.csv', { type: 'text/csv' })
        const result = await parseCsv(file)
        expect(result.error).toBeNull()
        expect(result.headers).toEqual(['name', 'avs_number'])
        expect(result.rows).toHaveLength(1)
    })

    it('returns error for an empty file', async () => {
        const file = new File([''], 'empty.csv', { type: 'text/csv' })
        const result = await parseCsv(file)
        expect(result.error).not.toBeNull()
    })
})
