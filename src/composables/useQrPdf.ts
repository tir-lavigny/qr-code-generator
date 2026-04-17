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

export interface GenerateOptions {
    deduplicateAvs: boolean
    skipInvalidRows: boolean
}

export const DEFAULT_GENERATE_OPTIONS: GenerateOptions = {
    deduplicateAvs: true,
    skipInvalidRows: true,
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
        let cardIndex = 0
        let duplicatesSkipped = 0
        let invalidSkipped = 0

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
                    progress.value = Math.round(((i + 1) / rows.length) * 100)
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
                    progress.value = Math.round(((i + 1) / rows.length) * 100)
                    continue
                }
                seenAvs.add(avsValue)
            }

            const displayName = [firstnameValue, nameValue]
                .filter(Boolean)
                .join(' ')

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
            const textY = yCard + cardHeight / 2

            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text(displayName, textX, textY, { baseline: 'middle' })

            doc.setDrawColor(220, 220, 220)
            doc.rect(xCard, yCard, cardWidth, cardHeight)

            cardIndex++
            progress.value = Math.round(((i + 1) / rows.length) * 100)
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
