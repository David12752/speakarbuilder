/**
 * Active / DSP crossover calculations.
 * Outputs digital biquad filter parameters instead of passive component values.
 */

export interface DSPFilterParams {
    type: 'LPF' | 'HPF' | 'BPF' | 'Notch' | 'PEQ' | 'AllPass' | 'HighShelf' | 'LowShelf'
    frequency: number   // Hz
    q: number           // Q factor
    gainDb: number      // dB (for PEQ, shelves)
    slope: string       // e.g. "12dB/oct", "24dB/oct"
    order: number
    alignment: string
}

export interface DSPCrossoverResult {
    /** Filters applied to the high-frequency driver (tweeter) */
    highPass: DSPFilterParams[]
    /** Filters applied to the low-frequency driver (woofer) */
    lowPass: DSPFilterParams[]
    /** Delay applied to one channel for time-alignment (ms) */
    delayMs: number
    /** Which channel is delayed */
    delayChannel: 'tweeter' | 'woofer'
    /** L-Pad equivalent: digital gain trim (dB) */
    tweeterTrimDb: number
    /** Additional correction filters */
    correctionFilters: DSPFilterParams[]
}

/**
 * Q values for different alignments and orders.
 */
const ALIGNMENT_Q: Record<string, Record<number, number[]>> = {
    'butterworth': {
        1: [0.707], // not really Q, just placeholder
        2: [0.707],
        3: [0.707], // cascaded: one 1st + one 2nd
        4: [0.707, 0.707], // two cascaded 2nd-order sections
    },
    'linkwitz-riley': {
        2: [0.5],
        4: [0.707, 0.707], // two cascaded Butterworth sections
    },
    'bessel': {
        2: [0.577],
        3: [0.691], // approximate
    },
    'chebyshev': {
        2: [0.864], // 0.5dB ripple
        3: [1.065], // 0.5dB ripple
    },
}

function getSlopeLabel(order: number): string {
    return `${order * 6}dB/oct`
}

/**
 * Calculate DSP crossover parameters.
 */
export function calculateDSPCrossover(
    fc: number,
    order: 1 | 2 | 3 | 4,
    alignment: string,
    tweeterSensitivity: number,
    wooferSensitivity: number,
    acousticOffsetMm: number = 0
): DSPCrossoverResult {
    const sensDiff = tweeterSensitivity - wooferSensitivity
    const tweeterTrimDb = sensDiff > 0 ? -sensDiff : 0

    // Time alignment delay
    const delayMs = acousticOffsetMm > 0 ? (acousticOffsetMm / 1000) / 343 * 1000 : 0
    const delayChannel: 'tweeter' | 'woofer' = 'tweeter' // tweeter is usually recessed

    const slope = getSlopeLabel(order)
    const alignKey = alignment in ALIGNMENT_Q ? alignment : 'butterworth'
    const qValues = ALIGNMENT_Q[alignKey]?.[order] ?? [0.707]

    const highPass: DSPFilterParams[] = []
    const lowPass: DSPFilterParams[] = []

    if (order === 1) {
        highPass.push({
            type: 'HPF', frequency: fc, q: 0.707, gainDb: 0, slope, order: 1, alignment
        })
        lowPass.push({
            type: 'LPF', frequency: fc, q: 0.707, gainDb: 0, slope, order: 1, alignment
        })
    } else if (order === 2) {
        highPass.push({
            type: 'HPF', frequency: fc, q: qValues[0], gainDb: 0, slope, order: 2, alignment
        })
        lowPass.push({
            type: 'LPF', frequency: fc, q: qValues[0], gainDb: 0, slope, order: 2, alignment
        })
    } else if (order === 3) {
        // 3rd order = 1st order + 2nd order cascaded
        highPass.push({
            type: 'HPF', frequency: fc, q: 0.707, gainDb: 0, slope: '6dB/oct', order: 1, alignment
        })
        highPass.push({
            type: 'HPF', frequency: fc, q: qValues[0], gainDb: 0, slope: '12dB/oct', order: 2, alignment
        })
        lowPass.push({
            type: 'LPF', frequency: fc, q: 0.707, gainDb: 0, slope: '6dB/oct', order: 1, alignment
        })
        lowPass.push({
            type: 'LPF', frequency: fc, q: qValues[0], gainDb: 0, slope: '12dB/oct', order: 2, alignment
        })
    } else if (order === 4) {
        // 4th order = two cascaded 2nd-order sections (LR4)
        highPass.push({
            type: 'HPF', frequency: fc, q: qValues[0], gainDb: 0, slope: '12dB/oct', order: 2, alignment
        })
        highPass.push({
            type: 'HPF', frequency: fc, q: qValues.length > 1 ? qValues[1] : qValues[0], gainDb: 0, slope: '12dB/oct', order: 2, alignment
        })
        lowPass.push({
            type: 'LPF', frequency: fc, q: qValues[0], gainDb: 0, slope: '12dB/oct', order: 2, alignment
        })
        lowPass.push({
            type: 'LPF', frequency: fc, q: qValues.length > 1 ? qValues[1] : qValues[0], gainDb: 0, slope: '12dB/oct', order: 2, alignment
        })
    }

    // Correction filters
    const correctionFilters: DSPFilterParams[] = []

    // If Baffle Step would be needed — suggest a low-shelf EQ
    correctionFilters.push({
        type: 'LowShelf',
        frequency: 500, // typical baffle step region
        q: 0.707,
        gainDb: -3,
        slope: '6dB/oct',
        order: 1,
        alignment: 'shelf'
    })

    // Notch at woofer Fs if impedance peak is problematic — not needed in DSP but helpful
    // This would be implemented as parametric EQ in practice

    return {
        highPass,
        lowPass,
        delayMs,
        delayChannel,
        tweeterTrimDb,
        correctionFilters
    }
}

/**
 * Generate miniDSP-compatible export string.
 */
export function generateMiniDSPConfig(result: DSPCrossoverResult): string {
    const lines: string[] = [
        '# miniDSP-style Crossover Configuration',
        '# Generated by SpeakarBuilder',
        '',
        '## Channel 1 (Woofer / Low-Pass)',
    ]

    result.lowPass.forEach((f, i) => {
        lines.push(`Filter ${i + 1}: ${f.type} Fc=${f.frequency}Hz Q=${f.q.toFixed(4)} Gain=${f.gainDb.toFixed(1)}dB`)
    })

    lines.push('')
    lines.push('## Channel 2 (Tweeter / High-Pass)')
    result.highPass.forEach((f, i) => {
        lines.push(`Filter ${i + 1}: ${f.type} Fc=${f.frequency}Hz Q=${f.q.toFixed(4)} Gain=${f.gainDb.toFixed(1)}dB`)
    })

    if (result.tweeterTrimDb !== 0) {
        lines.push(`Gain: ${result.tweeterTrimDb.toFixed(1)}dB`)
    }

    if (result.delayMs > 0) {
        lines.push('')
        lines.push(`## Time Alignment`)
        lines.push(`${result.delayChannel} delay: ${result.delayMs.toFixed(3)}ms`)
    }

    lines.push('')
    lines.push('## Suggested Correction Filters')
    result.correctionFilters.forEach((f, i) => {
        lines.push(`Correction ${i + 1}: ${f.type} Fc=${f.frequency}Hz Q=${f.q.toFixed(4)} Gain=${f.gainDb.toFixed(1)}dB`)
    })

    return lines.join('\n')
}
