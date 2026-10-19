/**
 * E-Series Component Value Snapping
 * Snaps calculated C/L/R values to nearest standard E12 or E24 values.
 */

// E12 series (10% tolerance): 12 values per decade
const E12_BASE = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2]

// E24 series (5% tolerance): 24 values per decade
const E24_BASE = [
    1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
    3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1
]

/**
 * Generate all E-series values across multiple decades.
 */
function generateSeriesValues(base: number[], minDecade: number = -2, maxDecade: number = 4): number[] {
    const values: number[] = []
    for (let dec = minDecade; dec <= maxDecade; dec++) {
        const multiplier = Math.pow(10, dec)
        for (const v of base) {
            values.push(v * multiplier)
        }
    }
    return values
}

/**
 * Snap a value to the nearest E-series value.
 * @param value The calculated value
 * @param series 'E12' or 'E24'
 * @returns The nearest standard value
 */
export function snapToESeries(value: number, series: 'E12' | 'E24' = 'E24'): number {
    if (value <= 0) return 0

    const base = series === 'E12' ? E12_BASE : E24_BASE
    const allValues = generateSeriesValues(base)

    let closest = allValues[0]
    let minRatio = Infinity

    for (const sv of allValues) {
        // Use log-space distance for better matching across decades
        const ratio = Math.abs(Math.log10(value / sv))
        if (ratio < minRatio) {
            minRatio = ratio
            closest = sv
        }
    }

    return closest
}

/**
 * Snap and return both original and snapped values.
 */
export function snapComponent(value: number, unit: string, series: 'E12' | 'E24' = 'E24'): {
    original: number
    snapped: number
    unit: string
    deviation: number // percentage
} {
    const snapped = snapToESeries(value, series)
    const deviation = value > 0 ? ((snapped - value) / value) * 100 : 0
    return {
        original: Math.round(value * 1000) / 1000,
        snapped: Math.round(snapped * 1000) / 1000,
        unit,
        deviation: Math.round(deviation * 10) / 10
    }
}
