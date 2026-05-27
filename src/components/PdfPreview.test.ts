// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PdfPreview from './PdfPreview.vue'
import type { GenerateSummary } from '@/composables/useQrPdf'

const { mockDownloadPdf } = vi.hoisted(() => ({
    mockDownloadPdf: vi.fn(),
}))

vi.mock('@/composables/useQrPdf', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/composables/useQrPdf')>()
    return { ...actual, downloadPdf: mockDownloadPdf }
})

const mockCreateObjectURL = vi.fn().mockReturnValue('blob:fake-preview-url')
const mockRevokeObjectURL = vi.fn()

beforeEach(() => {
    vi.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:fake-preview-url')
    vi.stubGlobal('URL', {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
    })
})

function makeProps(overrides: Partial<GenerateSummary> = {}) {
    const summary: GenerateSummary = {
        total: 10,
        printed: 8,
        duplicatesSkipped: 1,
        invalidSkipped: 1,
        ...overrides,
    }
    const blob = new Blob(['fake-pdf'], { type: 'application/pdf' })
    return { blob, summary }
}

describe('PdfPreview', () => {
    it('creates an object URL from the blob on mount', () => {
        const props = makeProps()
        mount(PdfPreview, { props })

        expect(mockCreateObjectURL).toHaveBeenCalledWith(props.blob)
    })

    it('sets the iframe src to the object URL', async () => {
        const props = makeProps()
        const wrapper = mount(PdfPreview, { props })
        await nextTick()

        const iframe = wrapper.find('iframe')
        expect(iframe.exists()).toBe(true)
        expect(iframe.attributes('src')).toBe('blob:fake-preview-url')
    })

    it('revokes the object URL on unmount', () => {
        const props = makeProps()
        const wrapper = mount(PdfPreview, { props })

        wrapper.unmount()

        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:fake-preview-url')
    })

    it('renders all four stats', () => {
        const props = makeProps({ total: 20, printed: 15, duplicatesSkipped: 3, invalidSkipped: 2 })
        const wrapper = mount(PdfPreview, { props })
        const text = wrapper.text()

        expect(text).toContain('20')
        expect(text).toContain('15')
        expect(text).toContain('3')
        expect(text).toContain('2')
    })

    it('hides duplicatesSkipped row when count is 0', () => {
        const props = makeProps({ duplicatesSkipped: 0 })
        const wrapper = mount(PdfPreview, { props })

        expect(wrapper.text()).not.toContain('doublon')
    })

    it('hides invalidSkipped row when count is 0', () => {
        const props = makeProps({ invalidSkipped: 0 })
        const wrapper = mount(PdfPreview, { props })

        expect(wrapper.text()).not.toContain('données manquantes')
    })

    it('calls downloadPdf with the blob when download button is clicked', async () => {
        const props = makeProps()
        const wrapper = mount(PdfPreview, { props })

        await wrapper.find('button[class*="w-full"]').trigger('click')

        expect(mockDownloadPdf).toHaveBeenCalledWith(props.blob)
    })

    it('emits back when the back button is clicked', async () => {
        const props = makeProps()
        const wrapper = mount(PdfPreview, { props })

        await wrapper.findAll('button')[0].trigger('click')

        expect(wrapper.emitted('back')).toBeTruthy()
    })
})
