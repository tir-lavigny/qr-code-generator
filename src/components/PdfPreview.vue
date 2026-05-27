<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { GenerateSummary } from '@/composables/useQrPdf'
import { downloadPdf } from '@/composables/useQrPdf'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeftIcon, DownloadIcon, CheckCircleIcon } from 'lucide-vue-next'

const props = defineProps<{
    blob: Blob
    summary: GenerateSummary
}>()

const emit = defineEmits<{
    back: []
}>()

const objectUrl = ref('')

onMounted(() => {
    objectUrl.value = URL.createObjectURL(props.blob)
})

onUnmounted(() => {
    if (objectUrl.value) {
        URL.revokeObjectURL(objectUrl.value)
    }
})

function onDownload() {
    downloadPdf(props.blob)
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div>
            <Button variant="ghost" size="sm" @click="emit('back')">
                <ArrowLeftIcon class="mr-2 size-4" />
                Retour
            </Button>
        </div>

        <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div class="min-h-[70vh] flex-1 overflow-hidden rounded-lg border">
                <iframe
                    v-if="objectUrl"
                    :src="objectUrl"
                    class="h-full min-h-[70vh] w-full"
                    title="Prévisualisation du PDF"
                />
            </div>

            <div class="w-full lg:w-72">
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2 text-base">
                            <CheckCircleIcon class="text-primary size-4" />
                            Génération terminée
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-3">
                        <ul class="text-muted-foreground space-y-1.5 text-sm">
                            <li>
                                <span class="text-foreground font-medium">{{
                                    summary.total
                                }}</span>
                                lignes dans le fichier
                            </li>
                            <li>
                                <span class="text-foreground font-medium">{{
                                    summary.printed
                                }}</span>
                                QR codes générés
                            </li>
                            <li v-if="summary.duplicatesSkipped > 0">
                                <span class="text-foreground font-medium">{{
                                    summary.duplicatesSkipped
                                }}</span>
                                numéro{{
                                    summary.duplicatesSkipped > 1 ? 's' : ''
                                }}
                                AVS en doublon ignoré{{
                                    summary.duplicatesSkipped > 1 ? 's' : ''
                                }}
                            </li>
                            <li v-if="summary.invalidSkipped > 0">
                                <span class="text-foreground font-medium">{{
                                    summary.invalidSkipped
                                }}</span>
                                ligne{{
                                    summary.invalidSkipped > 1 ? 's' : ''
                                }}
                                ignorée{{
                                    summary.invalidSkipped > 1 ? 's' : ''
                                }}
                                (données manquantes)
                            </li>
                        </ul>

                        <Separator />

                        <Button class="w-full" @click="onDownload">
                            <DownloadIcon class="mr-2 size-4" />
                            Télécharger le PDF
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
</template>
