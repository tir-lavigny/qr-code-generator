export type WifiAuthType = 'WPA' | 'WEP' | 'nopass'

export interface WifiConfig {
    ssid: string
    password: string
    authType: WifiAuthType
    hidden: boolean
}

export interface WifiGridConfig {
    mode: 'single' | 'grid'
    cols: number
    rows: number
    repeatCount: number
}

export const DEFAULT_WIFI_GRID_CONFIG: WifiGridConfig = {
    mode: 'single',
    cols: 2,
    rows: 5,
    repeatCount: 1,
}
