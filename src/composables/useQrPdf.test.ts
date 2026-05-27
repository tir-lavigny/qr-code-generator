// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    computeCardDimensions,
    totalPages,
    DEFAULT_GENERATE_OPTIONS,
    downloadPdf,
} from './useQrPdf'
import type { GridConfig } from '@/types/csv'

const {
    mockOutput,
    mockAddImage,
    mockAddPage,
    mockText,
    mockRect,
    mockSetFontSize,
    mockSetFont,
    mockSetDrawColor,
    mockGetTextWidth,
} = vi.hoisted(() => ({
    mockOutput: vi
        .fn()
        .mockReturnValue(new Blob(['fake'], { type: 'application/pdf' })),
    mockAddImage: vi.fn(),
    mockAddPage: vi.fn(),
    mockText: vi.fn(),
    mockRect: vi.fn(),
    mockSetFontSize: vi.fn(),
    mockSetFont: vi.fn(),
    mockSetDrawColor: vi.fn(),
    mockGetTextWidth: vi.fn().mockReturnValue(10),
}))

vi.mock('jspdf', () => {
    const instance = {
        addImage: mockAddImage,
        addPage: mockAddPage,
        text: mockText,
        rect: mockRect,
        setFontSize: mockSetFontSize,
        setFont: mockSetFont,
        setDrawColor: mockSetDrawColor,
        output: mockOutput,
        getTextWidth: mockGetTextWidth,
    }
    return {
        jsPDF: vi.fn().mockImplementation(function () {
            return instance
        }),
    }
})

vi.mock('qrcode', () => ({
    default: {
        toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE'),
    },
}))

const mockClick = vi.fn()
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:fake-url')
const mockRevokeObjectURL = vi.fn()

beforeEach(() => {
    vi.clearAllMocks()
    mockGetTextWidth.mockReturnValue(10)
    mockOutput.mockReturnValue(new Blob(['fake'], { type: 'application/pdf' }))
    mockCreateObjectURL.mockReturnValue('blob:fake-url')

    vi.stubGlobal('URL', {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
    })

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
            return {
                href: '',
                download: '',
                click: mockClick,
            } as unknown as HTMLElement
        }
        return document.createElement(tag)
    })
})

describe('computeCardDimensions', () => {
    it('computes correct card size for 2x5 grid on A4', () => {
        const config: GridConfig = { cols: 2, rows: 5 }
        const { cardWidth, cardHeight } = computeCardDimensions(config)
        expect(cardWidth).toBeCloseTo((210 - 20) / 2)
        expect(cardHeight).toBeCloseTo((297 - 20) / 5)
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
        expect(totalPages(21, { cols: 3, rows: 3 })).toBe(3)
    })
})

describe('downloadPdf', () => {
    it('creates an object URL from the blob and triggers a link click', () => {
        const blob = new Blob(['pdf'], { type: 'application/pdf' })
        downloadPdf(blob, 'test.pdf')

        expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
        expect(mockClick).toHaveBeenCalledTimes(1)
    })

    it('sets the correct download filename on the anchor', () => {
        const blob = new Blob(['pdf'], { type: 'application/pdf' })
        let capturedAnchor: {
            href: string
            download: string
            click: () => void
        } | null = null
        vi.spyOn(document, 'createElement').mockImplementation(
            (tag: string) => {
                if (tag === 'a') {
                    capturedAnchor = {
                        href: '',
                        download: '',
                        click: mockClick,
                    }
                    return capturedAnchor as unknown as HTMLElement
                }
                return document.createElement(tag)
            }
        )

        downloadPdf(blob, 'my-file.pdf')

        expect(capturedAnchor!.download).toBe('my-file.pdf')
        expect(capturedAnchor!.href).toBe('blob:fake-url')
    })

    it('revokes the object URL after clicking', () => {
        const blob = new Blob(['pdf'], { type: 'application/pdf' })
        downloadPdf(blob, 'test.pdf')

        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
    })

    it('uses qr-codes.pdf as the default filename', () => {
        const blob = new Blob(['pdf'], { type: 'application/pdf' })
        let capturedAnchor: {
            href: string
            download: string
            click: () => void
        } | null = null
        vi.spyOn(document, 'createElement').mockImplementation(
            (tag: string) => {
                if (tag === 'a') {
                    capturedAnchor = {
                        href: '',
                        download: '',
                        click: mockClick,
                    }
                    return capturedAnchor as unknown as HTMLElement
                }
                return document.createElement(tag)
            }
        )

        downloadPdf(blob)

        expect(capturedAnchor!.download).toBe('qr-codes.pdf')
    })
})

describe('useQrPdf.generatePdf', () => {
    it('throws when name mapping is missing', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        await expect(
            generatePdf(
                [{ avs_number: '756.1234.5678.90' }],
                { name: null, firstname: null, avs_number: 'avs_number' },
                { cols: 2, rows: 5 }
            )
        ).rejects.toThrow(/« nom »/)
    })

    it('throws when avs_number mapping is missing', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        await expect(
            generatePdf(
                [{ name: 'Doe' }],
                { name: 'name', firstname: null, avs_number: null },
                { cols: 2, rows: 5 }
            )
        ).rejects.toThrow(/« numéro AVS »/)
    })

    it('progress starts at 0 and isGenerating starts false', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { progress, isGenerating } = useQrPdf()
        expect(progress.value).toBe(0)
        expect(isGenerating.value).toBe(false)
    })

    it('throws on missing required row data when skipInvalidRows is false', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        await expect(
            generatePdf(
                [{ name: '', avs_number: '' }],
                { name: 'name', firstname: null, avs_number: 'avs_number' },
                { cols: 2, rows: 5 },
                { deduplicateAvs: false, skipInvalidRows: false }
            )
        ).rejects.toThrow(/incomplète/)
    })

    it('skips invalid rows when skipInvalidRows is true and throws if all skipped', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf, skippedCount } = useQrPdf()

        await expect(
            generatePdf(
                [{ name: '', avs_number: '' }],
                { name: 'name', firstname: null, avs_number: 'avs_number' },
                { cols: 2, rows: 5 },
                { deduplicateAvs: false, skipInvalidRows: true }
            )
        ).rejects.toThrow(/Aucune ligne valide/)

        expect(skippedCount.value).toBe(1)
    })

    it('DEFAULT_GENERATE_OPTIONS has deduplicateAvs=true, skipInvalidRows=true, sortBy=name', () => {
        expect(DEFAULT_GENERATE_OPTIONS.deduplicateAvs).toBe(true)
        expect(DEFAULT_GENERATE_OPTIONS.skipInvalidRows).toBe(true)
        expect(DEFAULT_GENERATE_OPTIONS.sortBy).toBe('name')
    })

    it('returns a blob and correct summary for valid rows', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf, progress, isGenerating, summary } = useQrPdf()

        const rows = [
            { name: 'Doe', firstname: 'Jane', avs_number: '756.1234.5678.97' },
            {
                name: 'Smith',
                firstname: 'John',
                avs_number: '756.9876.5432.10',
            },
        ]
        const mapping = {
            name: 'name',
            firstname: 'firstname',
            avs_number: 'avs_number',
        }
        const config: GridConfig = { cols: 2, rows: 5 }

        const result = await generatePdf(rows, mapping, config, {
            deduplicateAvs: false,
            skipInvalidRows: true,
        })

        expect(result.summary.total).toBe(2)
        expect(result.summary.printed).toBe(2)
        expect(result.summary.duplicatesSkipped).toBe(0)
        expect(result.summary.invalidSkipped).toBe(0)
        expect(result.blob).toBeInstanceOf(Blob)
        expect(mockOutput).toHaveBeenCalledWith('blob')
        expect(mockAddImage).toHaveBeenCalledTimes(2)
        expect(progress.value).toBe(100)
        expect(isGenerating.value).toBe(false)
        expect(summary.value).toEqual(result.summary)
    })

    it('shrinks font size when a name is too wide for the text area', async () => {
        mockGetTextWidth.mockReturnValue(999)
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        await generatePdf(
            [
                {
                    name: 'VeryLongLastNameThatOverflows',
                    avs_number: '756.1234.5678.97',
                },
            ],
            { name: 'name', firstname: null, avs_number: 'avs_number' },
            { cols: 2, rows: 5 },
            { deduplicateAvs: false, skipInvalidRows: true }
        )

        const fontSizeCalls = mockSetFontSize.mock.calls.map((c) => c[0])
        expect(Math.min(...fontSizeCalls)).toBeLessThan(11)
    })

    it('deduplicates AVS numbers when deduplicateAvs is true', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            { name: 'Doe', avs_number: '756.1234.5678.97' },
            { name: 'Doe2', avs_number: '756.1234.5678.97' },
            { name: 'Smith', avs_number: '756.9876.5432.10' },
        ]
        const mapping = {
            name: 'name',
            firstname: null,
            avs_number: 'avs_number',
        }

        const result = await generatePdf(
            rows,
            mapping,
            { cols: 2, rows: 5 },
            {
                deduplicateAvs: true,
                skipInvalidRows: true,
            }
        )

        expect(result.summary.total).toBe(3)
        expect(result.summary.printed).toBe(2)
        expect(result.summary.duplicatesSkipped).toBe(1)
        expect(mockAddImage).toHaveBeenCalledTimes(2)
    })

    it('adds a new page when cards exceed perPage', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = Array.from({ length: 3 }, (_, i) => ({
            name: `Name${i}`,
            avs_number: `756.000${i}.0000.0${i}`,
        }))
        const mapping = {
            name: 'name',
            firstname: null,
            avs_number: 'avs_number',
        }

        await generatePdf(
            rows,
            mapping,
            { cols: 1, rows: 1 },
            {
                deduplicateAvs: false,
                skipInvalidRows: true,
            }
        )

        expect(mockAddPage).toHaveBeenCalledTimes(2)
    })
})

describe('useQrPdf.generateAndDownload', () => {
    it('calls downloadPdf and returns summary', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generateAndDownload } = useQrPdf()

        const rows = [{ name: 'Doe', avs_number: '756.1234.5678.97' }]
        const mapping = {
            name: 'name',
            firstname: null,
            avs_number: 'avs_number',
        }

        const result = await generateAndDownload(
            rows,
            mapping,
            { cols: 2, rows: 5 },
            {
                deduplicateAvs: false,
                skipInvalidRows: true,
            }
        )

        expect(result.printed).toBe(1)
        expect(mockCreateObjectURL).toHaveBeenCalled()
        expect(mockClick).toHaveBeenCalled()
    })
})

describe('useQrPdf.generatePdf sorting', () => {
    const mapping = {
        name: 'name',
        firstname: 'firstname',
        avs_number: 'avs_number',
    }
    const config: GridConfig = { cols: 2, rows: 5 }

    function renderedNames(): string[] {
        return mockText.mock.calls.map((c) => c[0] as string)
    }

    it('sorts by last name A→Z by default', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            {
                name: 'Zoller',
                firstname: 'Anna',
                avs_number: '756.0001.0000.01',
            },
            {
                name: 'Aebischer',
                firstname: 'Marc',
                avs_number: '756.0001.0000.02',
            },
            {
                name: 'Müller',
                firstname: 'Sara',
                avs_number: '756.0001.0000.03',
            },
        ]

        await generatePdf(rows, mapping, config, {
            deduplicateAvs: false,
            skipInvalidRows: true,
            sortBy: 'name',
        })

        const names = renderedNames()
        const lastNames = names.filter((n) =>
            ['Zoller', 'Aebischer', 'Müller'].includes(n)
        )
        expect(lastNames).toEqual(['Aebischer', 'Müller', 'Zoller'])
    })

    it('sorts by last name by default when sortBy is omitted', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            {
                name: 'Zoller',
                firstname: 'Anna',
                avs_number: '756.0002.0000.01',
            },
            {
                name: 'Aebischer',
                firstname: 'Marc',
                avs_number: '756.0002.0000.02',
            },
        ]

        await generatePdf(rows, mapping, config, {
            deduplicateAvs: false,
            skipInvalidRows: true,
        })

        const names = renderedNames()
        const lastNames = names.filter((n) =>
            ['Zoller', 'Aebischer'].includes(n)
        )
        expect(lastNames).toEqual(['Aebischer', 'Zoller'])
    })

    it('tie-breaks last name sort by firstname then original order', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            {
                name: 'Dupont',
                firstname: 'Marc',
                avs_number: '756.0003.0000.01',
            },
            {
                name: 'Dupont',
                firstname: 'Alice',
                avs_number: '756.0003.0000.02',
            },
            {
                name: 'Dupont',
                firstname: 'Marc',
                avs_number: '756.0003.0000.03',
            },
        ]

        await generatePdf(rows, mapping, config, {
            deduplicateAvs: false,
            skipInvalidRows: true,
            sortBy: 'name',
        })

        const names = renderedNames()
        const firstNames = names.filter((n) => ['Marc', 'Alice'].includes(n))
        expect(firstNames[0]).toBe('Alice')
        expect(firstNames[1]).toBe('Marc')
        expect(firstNames[2]).toBe('Marc')
        const marcIndices = firstNames
            .map((n, i) => (n === 'Marc' ? i : -1))
            .filter((i) => i >= 0)
        expect(marcIndices[0]).toBeLessThan(marcIndices[1])
    })

    it('sorts by firstname A→Z when sortBy is firstname', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            { name: 'Smith', firstname: 'Zoé', avs_number: '756.0004.0000.01' },
            { name: 'Doe', firstname: 'Alice', avs_number: '756.0004.0000.02' },
            {
                name: 'Brown',
                firstname: 'Marc',
                avs_number: '756.0004.0000.03',
            },
        ]

        await generatePdf(rows, mapping, config, {
            deduplicateAvs: false,
            skipInvalidRows: true,
            sortBy: 'firstname',
        })

        const names = renderedNames()
        const firstNames = names.filter((n) =>
            ['Zoé', 'Alice', 'Marc'].includes(n)
        )
        expect(firstNames).toEqual(['Alice', 'Marc', 'Zoé'])
    })

    it('tie-breaks firstname sort by lastname', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            {
                name: 'Zoller',
                firstname: 'Anna',
                avs_number: '756.0005.0000.01',
            },
            {
                name: 'Aebischer',
                firstname: 'Anna',
                avs_number: '756.0005.0000.02',
            },
        ]

        await generatePdf(rows, mapping, config, {
            deduplicateAvs: false,
            skipInvalidRows: true,
            sortBy: 'firstname',
        })

        const names = renderedNames()
        const lastNames = names.filter((n) =>
            ['Zoller', 'Aebischer'].includes(n)
        )
        expect(lastNames).toEqual(['Aebischer', 'Zoller'])
    })

    it('preserves original order when sortBy is none', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            {
                name: 'Zoller',
                firstname: 'Anna',
                avs_number: '756.0006.0000.01',
            },
            {
                name: 'Aebischer',
                firstname: 'Marc',
                avs_number: '756.0006.0000.02',
            },
            {
                name: 'Müller',
                firstname: 'Sara',
                avs_number: '756.0006.0000.03',
            },
        ]

        await generatePdf(rows, mapping, config, {
            deduplicateAvs: false,
            skipInvalidRows: true,
            sortBy: 'none',
        })

        const names = renderedNames()
        const lastNames = names.filter((n) =>
            ['Zoller', 'Aebischer', 'Müller'].includes(n)
        )
        expect(lastNames).toEqual(['Zoller', 'Aebischer', 'Müller'])
    })

    it('falls back to lastname sort when sortBy is firstname but no firstname column is mapped', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            { name: 'Zoller', avs_number: '756.0007.0000.01' },
            { name: 'Aebischer', avs_number: '756.0007.0000.02' },
        ]
        const noFirstnameMapping = {
            name: 'name',
            firstname: null,
            avs_number: 'avs_number',
        }

        await generatePdf(rows, noFirstnameMapping, config, {
            deduplicateAvs: false,
            skipInvalidRows: true,
            sortBy: 'firstname',
        })

        const names = renderedNames()
        const lastNames = names.filter((n) =>
            ['Zoller', 'Aebischer'].includes(n)
        )
        expect(lastNames).toEqual(['Aebischer', 'Zoller'])
    })

    it('sorts with locale-sensitive comparison for accented names', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            {
                name: 'Étienne',
                firstname: 'Paul',
                avs_number: '756.0008.0000.01',
            },
            {
                name: 'Dubois',
                firstname: 'Claire',
                avs_number: '756.0008.0000.02',
            },
            {
                name: 'Çelik',
                firstname: 'Deniz',
                avs_number: '756.0008.0000.03',
            },
        ]

        await generatePdf(rows, mapping, config, {
            deduplicateAvs: false,
            skipInvalidRows: true,
            sortBy: 'name',
        })

        const names = renderedNames()
        const lastNames = names.filter((n) =>
            ['Étienne', 'Dubois', 'Çelik'].includes(n)
        )
        expect(lastNames).toEqual(['Çelik', 'Dubois', 'Étienne'])
    })

    it('deduplicates before sorting', async () => {
        const { useQrPdf } = await import('./useQrPdf')
        const { generatePdf } = useQrPdf()

        const rows = [
            {
                name: 'Zoller',
                firstname: 'Anna',
                avs_number: '756.0009.0000.01',
            },
            {
                name: 'ZollerDup',
                firstname: 'Anna',
                avs_number: '756.0009.0000.01',
            },
            {
                name: 'Aebischer',
                firstname: 'Marc',
                avs_number: '756.0009.0000.02',
            },
        ]

        const result = await generatePdf(rows, mapping, config, {
            deduplicateAvs: true,
            skipInvalidRows: true,
            sortBy: 'name',
        })

        expect(result.summary.printed).toBe(2)
        expect(result.summary.duplicatesSkipped).toBe(1)
        const names = renderedNames()
        const lastNames = names.filter((n) =>
            ['Zoller', 'ZollerDup', 'Aebischer'].includes(n)
        )
        expect(lastNames).toEqual(['Aebischer', 'Zoller'])
    })
})
