export type ParsedRow = Record<string, string>

export interface ColumnMapping {
    name: string | null
    firstname: string | null
    avs_number: string | null
}

export interface GridConfig {
    cols: number
    rows: number
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
    cols: 2,
    rows: 5,
}
