// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateWifiString } from './useWifiQr'
import type { WifiConfig } from '@/types/wifi'

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

describe('generateWifiString', () => {
    it('generates WPA string with password', () => {
        const config: WifiConfig = {
            ssid: 'MyNetwork',
            password: 'secret123',
            authType: 'WPA',
            hidden: false,
        }
        expect(generateWifiString(config)).toBe(
            'WIFI:T:WPA;S:MyNetwork;P:secret123;;'
        )
    })

    it('generates WEP string with password', () => {
        const config: WifiConfig = {
            ssid: 'LegacyNet',
            password: 'abcdef',
            authType: 'WEP',
            hidden: false,
        }
        expect(generateWifiString(config)).toBe(
            'WIFI:T:WEP;S:LegacyNet;P:abcdef;;'
        )
    })

    it('generates nopass string without password', () => {
        const config: WifiConfig = {
            ssid: 'OpenWiFi',
            password: '',
            authType: 'nopass',
            hidden: false,
        }
        expect(generateWifiString(config)).toBe('WIFI:T:nopass;S:OpenWiFi;;')
    })

    it('includes H:true for hidden networks', () => {
        const config: WifiConfig = {
            ssid: 'HiddenNet',
            password: 'pass',
            authType: 'WPA',
            hidden: true,
        }
        expect(generateWifiString(config)).toBe(
            'WIFI:T:WPA;S:HiddenNet;P:pass;H:true;;'
        )
    })

    it('omits H field when network is not hidden', () => {
        const config: WifiConfig = {
            ssid: 'VisibleNet',
            password: 'pass',
            authType: 'WPA',
            hidden: false,
        }
        expect(generateWifiString(config)).not.toContain(';H:')
    })

    it('escapes special characters in SSID', () => {
        const config: WifiConfig = {
            ssid: 'My;Network,Name',
            password: 'pass',
            authType: 'WPA',
            hidden: false,
        }
        const result = generateWifiString(config)
        expect(result).toContain('S:My\\;Network\\,Name')
    })

    it('escapes special characters in password', () => {
        const config: WifiConfig = {
            ssid: 'Net',
            password: 'p;a,s:s',
            authType: 'WPA',
            hidden: false,
        }
        const result = generateWifiString(config)
        expect(result).toContain('P:p\\;a\\,s\\:s')
    })

    it('handles empty password for WPA gracefully', () => {
        const config: WifiConfig = {
            ssid: 'Net',
            password: '',
            authType: 'WPA',
            hidden: false,
        }
        expect(generateWifiString(config)).toBe('WIFI:T:WPA;S:Net;P:;;')
    })
})

describe('useWifiQr.generatePdf', () => {
    it('throws when SSID is empty', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        await expect(
            generatePdf(
                { ssid: '', password: 'pass', authType: 'WPA', hidden: false },
                { mode: 'single', cols: 2, rows: 5, repeatCount: 1 }
            )
        ).rejects.toThrow(/SSID/)
    })

    it('throws when password is missing for WPA', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        await expect(
            generatePdf(
                { ssid: 'Net', password: '', authType: 'WPA', hidden: false },
                { mode: 'single', cols: 2, rows: 5, repeatCount: 1 }
            )
        ).rejects.toThrow(/mot de passe/)
    })

    it('throws when password is missing for WEP', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        await expect(
            generatePdf(
                { ssid: 'Net', password: '', authType: 'WEP', hidden: false },
                { mode: 'single', cols: 2, rows: 5, repeatCount: 1 }
            )
        ).rejects.toThrow(/mot de passe/)
    })

    it('does not require password for nopass', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        const result = await generatePdf(
            {
                ssid: 'OpenNet',
                password: '',
                authType: 'nopass',
                hidden: false,
            },
            { mode: 'single', cols: 2, rows: 5, repeatCount: 1 }
        )

        expect(result.blob).toBeInstanceOf(Blob)
        expect(result.summary.printed).toBe(1)
    })

    it('generates a single centered QR in single mode', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        const result = await generatePdf(
            {
                ssid: 'TestNet',
                password: 'pass123',
                authType: 'WPA',
                hidden: false,
            },
            { mode: 'single', cols: 2, rows: 5, repeatCount: 1 }
        )

        expect(result.blob).toBeInstanceOf(Blob)
        expect(result.summary.printed).toBe(1)
        expect(mockAddImage).toHaveBeenCalledTimes(1)
        expect(mockAddPage).not.toHaveBeenCalled()
    })

    it('generates QR codes in grid mode', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        const result = await generatePdf(
            {
                ssid: 'TestNet',
                password: 'pass123',
                authType: 'WPA',
                hidden: false,
            },
            { mode: 'grid', cols: 2, rows: 5, repeatCount: 1 }
        )

        expect(result.blob).toBeInstanceOf(Blob)
        expect(result.summary.printed).toBe(1)
        expect(mockAddImage).toHaveBeenCalledTimes(1)
    })

    it('reports correct summary', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        const result = await generatePdf(
            { ssid: 'MyNet', password: 'pw', authType: 'WPA', hidden: false },
            { mode: 'single', cols: 2, rows: 5, repeatCount: 1 }
        )

        expect(result.summary).toEqual({
            total: 1,
            printed: 1,
            duplicatesSkipped: 0,
            invalidSkipped: 0,
        })
    })

    it('progress starts at 0 and isGenerating starts false', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { progress, isGenerating } = useWifiQr()
        expect(progress.value).toBe(0)
        expect(isGenerating.value).toBe(false)
    })

    it('draws SSID label on the PDF', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        await generatePdf(
            {
                ssid: 'MySSID',
                password: 'pass',
                authType: 'WPA',
                hidden: false,
            },
            { mode: 'single', cols: 2, rows: 5, repeatCount: 1 }
        )

        const textCalls = mockText.mock.calls.map((c) => c[0] as string)
        expect(textCalls).toContain('MySSID')
    })

    it('generates repeatCount QR codes in grid mode', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        const result = await generatePdf(
            {
                ssid: 'TestNet',
                password: 'pass123',
                authType: 'WPA',
                hidden: false,
            },
            { mode: 'grid', cols: 2, rows: 5, repeatCount: 6 }
        )

        expect(result.blob).toBeInstanceOf(Blob)
        expect(result.summary.printed).toBe(6)
        expect(mockAddImage).toHaveBeenCalledTimes(6)
        expect(mockRect).toHaveBeenCalledTimes(6)
    })

    it('adds new pages when repeatCount exceeds perPage in grid mode', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        const result = await generatePdf(
            {
                ssid: 'TestNet',
                password: 'pass123',
                authType: 'WPA',
                hidden: false,
            },
            { mode: 'grid', cols: 2, rows: 5, repeatCount: 12 }
        )

        expect(result.summary.printed).toBe(12)
        expect(mockAddPage).toHaveBeenCalled()
    })

    it('repeatCount is ignored in single mode', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        const result = await generatePdf(
            {
                ssid: 'TestNet',
                password: 'pass123',
                authType: 'WPA',
                hidden: false,
            },
            { mode: 'single', cols: 2, rows: 5, repeatCount: 10 }
        )

        expect(result.summary.printed).toBe(1)
        expect(mockAddImage).toHaveBeenCalledTimes(1)
    })

    it('reports total as repeatCount in grid mode', async () => {
        const { useWifiQr } = await import('./useWifiQr')
        const { generatePdf } = useWifiQr()

        const result = await generatePdf(
            {
                ssid: 'TestNet',
                password: 'pass',
                authType: 'WPA',
                hidden: false,
            },
            { mode: 'grid', cols: 2, rows: 5, repeatCount: 3 }
        )

        expect(result.summary.total).toBe(3)
        expect(result.summary.printed).toBe(3)
    })
})
