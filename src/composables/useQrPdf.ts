import { ref } from 'vue'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import type { ColumnMapping, GridConfig, ParsedRow } from '@/types/csv'

// A4 dimensions en mm
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const PAGE_MARGIN = 10

export interface CardDimensions {
    cardWidth: number
    cardHeight: number
}

export function computeCardDimensions(config: GridConfig): CardDimensions {
    const cardWidth = (PAGE_WIDTH - 2 * PAGE_MARGIN) / config.cols
    const cardHeight = (PAGE_HEIGHT - 2 * PAGE_MARGIN) / config.rows
    return { cardWidth, cardHeight }
}

export function totalPages(rowCount: number, config: GridConfig): number {
    const perPage = config.cols * config.rows
    return Math.ceil(rowCount / perPage)
}

async function generateQrDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 256,
    })
}

export type SortBy = 'none' | 'name' | 'firstname'

export interface GenerateOptions {
    deduplicateAvs: boolean
    skipInvalidRows: boolean
    sortBy?: SortBy
}

export const DEFAULT_GENERATE_OPTIONS: GenerateOptions = {
    deduplicateAvs: true,
    skipInvalidRows: true,
    sortBy: 'name',
}

export interface GenerateSummary {
    total: number
    printed: number
    duplicatesSkipped: number
    invalidSkipped: number
}

export function useQrPdf() {
    const progress = ref(0)
    const isGenerating = ref(false)
    const skippedCount = ref(0)
    const summary = ref<GenerateSummary | null>(null)

    async function generateAndDownload(
        rows: ParsedRow[],
        mapping: ColumnMapping,
        config: GridConfig,
        options: GenerateOptions = DEFAULT_GENERATE_OPTIONS,
        filename = 'qr-codes.pdf'
    ): Promise<GenerateSummary> {
        if (!mapping.avs_number || !mapping.name) {
            throw new Error(
                'Le mapping des colonnes « nom » et « numéro AVS » est requis.'
            )
        }

        isGenerating.value = true
        progress.value = 0
        skippedCount.value = 0
        summary.value = null

        const { cardWidth, cardHeight } = computeCardDimensions(config)
        const perPage = config.cols * config.rows

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        })

        const seenAvs = new Set<string>()
        let duplicatesSkipped = 0
        let invalidSkipped = 0

        type ValidRow = {
            row: ParsedRow
            avsValue: string
            nameValue: string
            firstnameValue: string
            originalIndex: number
        }
        const validRows: ValidRow[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const avsValue = (row[mapping.avs_number] ?? '').trim()
            const nameValue = (row[mapping.name] ?? '').trim()
            const firstnameValue = mapping.firstname
                ? (row[mapping.firstname] ?? '').trim()
                : ''

            if (!avsValue || !nameValue) {
                if (options.skipInvalidRows) {
                    invalidSkipped++
                    skippedCount.value++
                    continue
                } else {
                    throw new Error(
                        `La ligne ${i + 1} est incomplète (nom ou numéro AVS manquant).`
                    )
                }
            }

            if (options.deduplicateAvs) {
                if (seenAvs.has(avsValue)) {
                    duplicatesSkipped++
                    skippedCount.value++
                    continue
                }
                seenAvs.add(avsValue)
            }

            validRows.push({
                row,
                avsValue,
                nameValue,
                firstnameValue,
                originalIndex: i,
            })
        }

        const sortBy = options.sortBy ?? 'name'
        const effectiveSortBy =
            sortBy === 'firstname' && !mapping.firstname ? 'name' : sortBy

        if (effectiveSortBy === 'name') {
            validRows.sort((a, b) => {
                const nameCmp = a.nameValue.localeCompare(
                    b.nameValue,
                    undefined,
                    { sensitivity: 'base' }
                )
                if (nameCmp !== 0) return nameCmp
                const firstnameCmp = a.firstnameValue.localeCompare(
                    b.firstnameValue,
                    undefined,
                    { sensitivity: 'base' }
                )
                if (firstnameCmp !== 0) return firstnameCmp
                return a.originalIndex - b.originalIndex
            })
        } else if (effectiveSortBy === 'firstname') {
            validRows.sort((a, b) => {
                const firstnameCmp = a.firstnameValue.localeCompare(
                    b.firstnameValue,
                    undefined,
                    { sensitivity: 'base' }
                )
                if (firstnameCmp !== 0) return firstnameCmp
                const nameCmp = a.nameValue.localeCompare(
                    b.nameValue,
                    undefined,
                    { sensitivity: 'base' }
                )
                if (nameCmp !== 0) return nameCmp
                return a.originalIndex - b.originalIndex
            })
        }

        let cardIndex = 0

        for (const { avsValue, nameValue, firstnameValue } of validRows) {
            const posInPage = cardIndex % perPage
            if (cardIndex > 0 && posInPage === 0) {
                doc.addPage()
            }

            const col = posInPage % config.cols
            const rowIndex = Math.floor(posInPage / config.cols)

            const xCard = PAGE_MARGIN + col * cardWidth
            const yCard = PAGE_MARGIN + rowIndex * cardHeight

            const qrSize = Math.min(cardHeight * 0.8, cardWidth * 0.45)
            const qrX = xCard + 3
            const qrY = yCard + (cardHeight - qrSize) / 2

            const dataUrl = await generateQrDataUrl(avsValue)
            doc.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

            const textX = qrX + qrSize + 4
            const textAreaWidth = cardWidth - qrSize - 3 - 4 - 3

            const lines = [firstnameValue, nameValue].filter(Boolean)

            let fontSize = 11
            doc.setFont('helvetica', 'bold')
            while (fontSize > 5) {
                doc.setFontSize(fontSize)
                const fits = lines.every(
                    (line) => doc.getTextWidth(line) <= textAreaWidth
                )
                if (fits) break
                fontSize -= 0.5
            }
            doc.setFontSize(fontSize)

            const lineHeight = fontSize * 0.3528 * 1.35
            const totalTextHeight = lines.length * lineHeight
            const textStartY =
                yCard + (cardHeight - totalTextHeight) / 2 + lineHeight / 2

            lines.forEach((line, idx) => {
                doc.text(line, textX, textStartY + idx * lineHeight, {
                    baseline: 'middle',
                    maxWidth: textAreaWidth,
                })
            })

            doc.setDrawColor(220, 220, 220)
            doc.rect(xCard, yCard, cardWidth, cardHeight)

            cardIndex++
            progress.value = Math.round((cardIndex / validRows.length) * 100)
        }

        if (cardIndex === 0) {
            throw new Error(
                "Aucune ligne valide à générer. Le PDF n'a pas été créé."
            )
        }

        doc.save(filename)
        isGenerating.value = false

        const result: GenerateSummary = {
            total: rows.length,
            printed: cardIndex,
            duplicatesSkipped,
            invalidSkipped,
        }
        summary.value = result
        return result
    }

    return {
        progress,
        isGenerating,
        skippedCount,
        summary,
        generateAndDownload,
    }
}
