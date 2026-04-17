import { ref } from 'vue'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import type { ColumnMapping, GridConfig, ParsedRow } from '@/types/csv'

// A4 dimensions in mm
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

export function useQrPdf() {
    const progress = ref(0)
    const isGenerating = ref(false)

    async function generateAndDownload(
        rows: ParsedRow[],
        mapping: ColumnMapping,
        config: GridConfig,
        filename = 'qr-codes.pdf'
    ): Promise<void> {
        if (!mapping.avs_number || !mapping.name) {
            throw new Error(
                'Column mapping for "name" and "avs_number" are required.'
            )
        }

        isGenerating.value = true
        progress.value = 0

        const { cardWidth, cardHeight } = computeCardDimensions(config)
        const perPage = config.cols * config.rows

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        })

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const avsValue = row[mapping.avs_number] ?? ''
            const nameValue = row[mapping.name] ?? ''
            const firstnameValue = mapping.firstname
                ? (row[mapping.firstname] ?? '')
                : ''

            const displayName = [firstnameValue, nameValue]
                .filter(Boolean)
                .join(' ')

            // Page break
            const posInPage = i % perPage
            if (i > 0 && posInPage === 0) {
                doc.addPage()
            }

            const col = posInPage % config.cols
            const row_ = Math.floor(posInPage / config.cols)

            const xCard = PAGE_MARGIN + col * cardWidth
            const yCard = PAGE_MARGIN + row_ * cardHeight

            // QR code
            const qrSize = Math.min(cardHeight * 0.8, cardWidth * 0.45)
            const qrX = xCard + 3
            const qrY = yCard + (cardHeight - qrSize) / 2

            const dataUrl = await generateQrDataUrl(avsValue)
            doc.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

            // Name text — vertically centered, to the right of QR
            const textX = qrX + qrSize + 4
            const textY = yCard + cardHeight / 2

            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text(displayName, textX, textY, { baseline: 'middle' })

            // Optional card border (subtle)
            doc.setDrawColor(220, 220, 220)
            doc.rect(xCard, yCard, cardWidth, cardHeight)

            progress.value = Math.round(((i + 1) / rows.length) * 100)
        }

        doc.save(filename)
        isGenerating.value = false
    }

    return { progress, isGenerating, generateAndDownload }
}
