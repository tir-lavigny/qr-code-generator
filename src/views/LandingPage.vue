<script setup lang="ts">
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { CreditCardIcon, WifiIcon } from 'lucide-vue-next'

const emit = defineEmits<{
    select: [feature: 'avs' | 'wifi']
}>()
</script>

<template>
    <div class="space-y-6">
        <div class="space-y-1">
            <h1 class="text-2xl font-bold tracking-tight">
                Générateur de QR Codes
            </h1>
            <p class="text-muted-foreground text-sm">
                Choisissez le type de QR code à générer.
            </p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
                class="hover:bg-accent/50 ring-border cursor-pointer rounded-xl p-0 text-left ring-1 transition-colors"
                @click="emit('select', 'avs')"
            >
                <Card class="border-0 shadow-none">
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2">
                            <CreditCardIcon class="text-primary size-5" />
                            QR Codes AVS
                        </CardTitle>
                        <CardDescription>
                            Importez un fichier CSV ou Excel contenant les
                            données de vos membres pour générer des QR codes
                            avec numéros AVS.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p class="text-muted-foreground text-xs">
                            Impression en lot · Dédoublonnage · Tri configurable
                        </p>
                    </CardContent>
                </Card>
            </button>

            <button
                class="ring-border cursor-pointer rounded-xl p-0 text-left opacity-50 ring-1 transition-colors"
                disabled
            >
                <Card class="border-0 shadow-none">
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2">
                            <WifiIcon class="size-5" />
                            QR Code WiFi
                        </CardTitle>
                        <CardDescription>
                            Générez un QR code pour connecter automatiquement à
                            un réseau WiFi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p class="text-muted-foreground text-xs">
                            Bientôt disponible
                        </p>
                    </CardContent>
                </Card>
            </button>
        </div>
    </div>
</template>
