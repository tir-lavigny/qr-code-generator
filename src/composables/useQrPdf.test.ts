import { describe, it, expect } from 'vitest'
import {
    computeCardDimensions,
    totalPages,
    DEFAULT_GENERATE_OPTIONS,
} from './useQrPdf'
import type { GridConfig } from '@/types/csv'

// ---------------------------------------------------------------------------
// computeCardDimensions
// ---------------------------------------------------------------------------

describe('computeCardDimensions', () => {
    it('computes correct card size for 2x5 grid on A4', () => {
        const config: GridConfig = { cols: 2, rows: 5 }
        const { cardWidth, cardHeight } = computeCardDimensions(config)
        // A4: 210×297mm, margin 10mm each side
        expect(cardWidth).toBeCloseTo((210 - 20) / 2) // 95mm
        expect(cardHeight).toBeCloseTo((297 - 20) / 5) // 55.4mm
    })

    it('computes correct card size for 3x4 grid', () => {
        const config: GridConfig = { cols: 3, rows: 4 }
        const { cardWidth, cardHeight } = computeCardDimensions(config)
        expect(cardWidth).toBeCloseTo((210 - 20) / 3)
        expect(cardHeight).toBeCloseTo((297 - 20) / 4)
    })

    it('computes correct card size for 1x1 grid (full page card)', () => {
        const config: GridConfig = { cols: 1, rows: 1 }
        const { cardWidth, cardHeight } = computeCardDimensions(config)
        expect(cardWidth).toBeCloseTo(190)
        expect(cardHeight).toBeCloseTo(277)
    })
})

// ---------------------------------------------------------------------------
// totalPages
// ---------------------------------------------------------------------------

describe('totalPages', () => {
    it('returns 1 page for exactly 10 rows with 2x5 grid', () => {
        expect(totalPages(10, { cols: 2, rows: 5 })).toBe(1)
    })

    it('returns 2 pages for 11 rows with 2x5 grid', () => {
        expect(totalPages(11, { cols: 2, rows: 5 })).toBe(2)
    })

    it('returns 1 page for 1 row', () => {
        expect(totalPages(1, { cols: 2, rows: 5 })).toBe(1)
    })

    it('returns 0 pages for 0 rows', () => {
        expect(totalPages(0, { cols: 2, rows: 5 })).toBe(0)
    })

    it('handles non-divisible row counts correctly', () => {
        expect(totalPages(21, { cols: 3, rows: 3 })).toBe(3) // 9 per page → ceil(21/9)=3
    })
})

// ---------------------------------------------------------------------------
// useQrPdf — generateAndDownload validation
// ---------------------------------------------------------------------------

describe('useQrPdf.generateAndDownload', () => {
    it('throws when name mapping is missing', async () => {
        // Dynamically import to keep mock scope clean
        const { useQrPdf } = await import('./useQrPdf')
        const { generateAndDownload } = useQrPdf()

        await expect(
            generateAndDownload(
                [{ avs_number: '756.1234.5678.90' }],
                { name: null, firstname: null, avs_number: 'avs_number' },
                { cols: 2, rows: 5 }
            )
        ).rejects.toThrow(/"name"/)
    })

    it('throws when avs_number mapping is missing', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generateAndDownload } = useQrPdf()

        await expect(
            generateAndDownload(
                [{ name: 'Doe' }],
                { name: 'name', firstname: null, avs_number: null },
                { cols: 2, rows: 5 }
            )
        ).rejects.toThrow(/"avs_number"/)
    })

    it('progress starts at 0 and isGenerating starts false', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { progress, isGenerating } = useQrPdf()
        expect(progress.value).toBe(0)
        expect(isGenerating.value).toBe(false)
    })

    it('throws on missing required row data when skipInvalidRows is false', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generateAndDownload } = useQrPdf()

        await expect(
            generateAndDownload(
                [{ name: '', avs_number: '' }],
                { name: 'name', firstname: null, avs_number: 'avs_number' },
                { cols: 2, rows: 5 },
                { deduplicateAvs: false, skipInvalidRows: false }
            )
        ).rejects.toThrow(/missing required data/)
    })

    it('skips invalid rows when skipInvalidRows is true and throws if all skipped', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generateAndDownload, skippedCount } = useQrPdf()

        await expect(
            generateAndDownload(
                [{ name: '', avs_number: '' }],
                { name: 'name', firstname: null, avs_number: 'avs_number' },
                { cols: 2, rows: 5 },
                { deduplicateAvs: false, skipInvalidRows: true }
            )
        ).rejects.toThrow(/No valid rows/)

        expect(skippedCount.value).toBe(1)
    })

    it('DEFAULT_GENERATE_OPTIONS has deduplicateAvs=true and skipInvalidRows=true', () => {
        expect(DEFAULT_GENERATE_OPTIONS.deduplicateAvs).toBe(true)
        expect(DEFAULT_GENERATE_OPTIONS.skipInvalidRows).toBe(true)
    })
})
