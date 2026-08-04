import { ref } from 'vue'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import type { WifiConfig, WifiGridConfig } from '@/types/wifi'
import {
    computeCardDimensions,
    downloadPdf,
} from '@/composables/useQrPdf'
import type { GenerateSummary } from '@/composables/useQrPdf'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const PAGE_MARGIN = 10

function escapeWifiField(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/:/g, '\\:')
}

export function generateWifiString(config: WifiConfig): string {
    let str = `WIFI:T:${config.authType};S:${escapeWifiField(config.ssid)}`
    if (config.authType !== 'nopass') {
        str += `;P:${escapeWifiField(config.password)}`
    }
    if (config.hidden) {
        str += ';H:true'
    }
    str += ';;'
    return str
}

function validateConfig(config: WifiConfig): void {
    if (!config.ssid.trim()) {
        throw new Error('L\'SSID est requis.')
    }
    if (config.authType !== 'nopass' && !config.password) {
        throw new Error(
            'Le mot de passe est requis pour une authentification WPA ou WEP.'
        )
    }
}

async function generateQrDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 256,
    })
}

export function useWifiQr() {
    const progress = ref(0)
    const isGenerating = ref(false)

    async function generatePdf(
        config: WifiConfig,
        grid: WifiGridConfig
    ): Promise<{ summary: GenerateSummary; blob: Blob }> {
        validateConfig(config)

        isGenerating.value = true
        progress.value = 0

        const wifiString = generateWifiString(config)
        const dataUrl = await generateQrDataUrl(wifiString)

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        })

        if (grid.mode === 'single') {
            const qrSize = 80
            const qrX = (PAGE_WIDTH - qrSize) / 2
            const qrY = (PAGE_HEIGHT - qrSize) / 2 - 15

            doc.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(14)
            const textY = qrY + qrSize + 10
            doc.text(config.ssid, PAGE_WIDTH / 2, textY, { align: 'center' })

            const authLabel =
                config.authType === 'nopass'
                    ? 'Réseau ouvert'
                    : config.authType === 'WPA'
                      ? 'WPA/WPA2'
                      : 'WEP'
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(10)
            doc.text(authLabel, PAGE_WIDTH / 2, textY + 6, { align: 'center' })

            if (config.hidden) {
                doc.text(
                    'Réseau masqué',
                    PAGE_WIDTH / 2,
                    textY + 12,
                    { align: 'center' }
                )
            }
        } else {
            const { cardWidth, cardHeight } = computeCardDimensions(grid)
            const col = 0
            const rowIndex = 0

            const xCard = PAGE_MARGIN + col * cardWidth
            const yCard = PAGE_MARGIN + rowIndex * cardHeight

            const qrSize = Math.min(cardHeight * 0.6, cardWidth * 0.8)
            const qrX = xCard + (cardWidth - qrSize) / 2
            const qrY = yCard + 5

            doc.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            const textY = qrY + qrSize + 4
            doc.text(config.ssid, xCard + cardWidth / 2, textY, {
                align: 'center',
                maxWidth: cardWidth - 4,
            })

            doc.setDrawColor(220, 220, 220)
            doc.rect(xCard, yCard, cardWidth, cardHeight)
        }

        isGenerating.value = false
        progress.value = 100

        const summary: GenerateSummary = {
            total: 1,
            printed: 1,
            duplicatesSkipped: 0,
            invalidSkipped: 0,
        }

        const blob = doc.output('blob')
        return { summary, blob }
    }

    async function generateAndDownload(
        config: WifiConfig,
        grid: WifiGridConfig,
        filename = 'wifi-qr-code.pdf'
    ): Promise<GenerateSummary> {
        const { summary, blob } = await generatePdf(config, grid)
        downloadPdf(blob, filename)
        return summary
    }

    return {
        progress,
        isGenerating,
        generatePdf,
        generateAndDownload,
    }
}
