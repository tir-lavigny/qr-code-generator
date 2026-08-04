<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWifiQr } from '@/composables/useWifiQr'
import type { WifiConfig, WifiGridConfig } from '@/types/wifi'
import type { GenerateSummary } from '@/composables/useQrPdf'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    NumberField,
    NumberFieldContent,
    NumberFieldDecrement,
    NumberFieldIncrement,
    NumberFieldInput,
} from '@/components/ui/number-field'
import { toast } from 'vue-sonner'
import {
    TriangleAlertIcon,
    FileDownIcon,
    EyeIcon,
    EyeOffIcon,
} from 'lucide-vue-next'

const ssid = defineModel<string>('ssid', { required: true })
const password = defineModel<string>('password', { required: true })
const authType = defineModel<WifiConfig['authType']>('authType', {
    required: true,
})
const hidden = defineModel<boolean>('hidden', { required: true })
const layoutMode = defineModel<WifiGridConfig['mode']>('layoutMode', {
    required: true,
})
const gridCols = defineModel<number>('gridCols', { required: true })
const gridRows = defineModel<number>('gridRows', { required: true })

const showPassword = ref(false)

const emit = defineEmits<{
    generated: [{ blob: Blob; summary: GenerateSummary }]
}>()

const needsPassword = computed(() => authType.value !== 'nopass')

watch(authType, (val) => {
    if (val === 'nopass') {
        password.value = ''
        showPassword.value = false
    }
})

const gridConfig = computed<WifiGridConfig>(() => ({
    mode: layoutMode.value,
    cols: gridCols.value,
    rows: gridRows.value,
}))

const validationError = computed(() => {
    if (!ssid.value.trim()) return 'L\'SSID est requis.'
    if (needsPassword.value && !password.value)
        return 'Le mot de passe est requis pour WPA et WEP.'
    return null
})

const isValid = computed(() => !validationError.value)

const { progress, isGenerating, generatePdf } = useWifiQr()

async function onGenerate() {
    if (!isValid.value) return

    const config: WifiConfig = {
        ssid: ssid.value.trim(),
        password: password.value,
        authType: authType.value,
        hidden: hidden.value,
    }

    try {
        const result = await generatePdf(config, gridConfig.value)
        emit('generated', result)
    } catch (err) {
        toast.error('Échec de la génération du PDF', {
            description: err instanceof Error ? err.message : String(err),
        })
    }
}
</script>

<template>
    <Card class="w-full">
        <CardHeader>
            <CardTitle>Configurer le QR Code WiFi</CardTitle>
            <CardDescription>
                Entrez les informations du réseau WiFi pour générer un QR code
                de connexion automatique.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
            <div class="space-y-1.5">
                <Label for="ssid">
                    SSID (nom du réseau)
                    <span class="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                    id="ssid"
                    v-model="ssid"
                    placeholder="Nom du réseau WiFi"
                    autocomplete="off"
                />
            </div>

            <div class="space-y-1.5">
                <Label>Type d'authentification</Label>
                <Select v-model="authType">
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="WPA">WPA/WPA2/WPA3</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="nopass">Réseau ouvert</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div v-if="needsPassword" class="space-y-1.5">
                <Label for="wifi-password">
                    Mot de passe
                    <span class="text-destructive ml-0.5">*</span>
                </Label>
                <div class="relative">
                    <Input
                        id="wifi-password"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="Mot de passe du réseau"
                        autocomplete="off"
                        class="pr-10"
                    />
                    <button
                        type="button"
                        class="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
                        @click="showPassword = !showPassword"
                    >
                        <EyeOffIcon v-if="showPassword" class="size-4" />
                        <EyeIcon v-else class="size-4" />
                    </button>
                </div>
            </div>

            <div class="flex items-start gap-3">
                <Checkbox
                    id="hidden-network"
                    v-model:checked="hidden"
                />
                <div class="space-y-0.5">
                    <Label for="hidden-network" class="cursor-pointer">
                        Réseau masqué
                    </Label>
                    <p class="text-muted-foreground text-xs">
                        Cochez si le réseau WiFi ne diffuse pas son SSID.
                    </p>
                </div>
            </div>

            <Alert v-if="validationError" variant="destructive">
                <TriangleAlertIcon class="size-4" />
                <AlertDescription>{{ validationError }}</AlertDescription>
            </Alert>

            <Separator />

            <div class="space-y-3">
                <p class="text-sm font-medium">Mise en page (A4)</p>
                <div class="space-y-1.5">
                    <Label>Mode d'affichage</Label>
                    <Select v-model="layoutMode">
                        <SelectTrigger class="w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="single">
                                QR code centré (une page)
                            </SelectItem>
                            <SelectItem value="grid">Grille</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div v-if="layoutMode === 'grid'" class="flex flex-wrap items-end gap-6">
                    <div class="space-y-1.5">
                        <Label>Colonnes par page</Label>
                        <NumberField
                            v-model="gridCols"
                            :min="1"
                            :max="10"
                            class="w-32"
                        >
                            <NumberFieldContent>
                                <NumberFieldDecrement />
                                <NumberFieldInput />
                                <NumberFieldIncrement />
                            </NumberFieldContent>
                        </NumberField>
                    </div>

                    <div class="space-y-1.5">
                        <Label>Lignes par page</Label>
                        <NumberField
                            v-model="gridRows"
                            :min="1"
                            :max="20"
                            class="w-32"
                        >
                            <NumberFieldContent>
                                <NumberFieldDecrement />
                                <NumberFieldInput />
                                <NumberFieldIncrement />
                            </NumberFieldContent>
                        </NumberField>
                    </div>
                </div>
            </div>

            <Separator />

            <div class="space-y-3">
                <Button
                    :disabled="!isValid || isGenerating"
                    class="w-full sm:w-auto"
                    @click="onGenerate"
                >
                    <FileDownIcon class="mr-2 size-4" />
                    {{
                        isGenerating ? 'Génération en cours…' : 'Générer le PDF'
                    }}
                </Button>

                <Progress
                    v-if="isGenerating"
                    :model-value="progress"
                    class="h-2"
                />
            </div>
        </CardContent>
    </Card>
</template>
