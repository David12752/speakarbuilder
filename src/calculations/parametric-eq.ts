/**
 * Parametric EQ calculations for real-time frequency response correction.
 * Implements standard biquad filter responses.
 */

export interface PEQBand {
    id: string
    enabled: boolean
    type: 'peak' | 'lowShelf' | 'highShelf' | 'notch'
    frequency: number   // Hz
    gain: number        // dB (-12 to +12)
    q: number           // 0.1 to 30
}

/**
 * Calculate the gain of a parametric EQ band at a given frequency.
 * Uses analog prototype biquad transfer function magnitude.
 */
export function calculatePEQGain(band: PEQBand, freq: number): number {
    if (!band.enabled || band.gain === 0 && band.type === 'peak') return 0

    const w0 = 2 * Math.PI * band.frequency
    const w = 2 * Math.PI * freq
    const ratio = w / w0

    switch (band.type) {
        case 'peak': {
            // Peaking EQ: H(s) approximated for magnitude response
            const A = Math.pow(10, band.gain / 40) // amplitude
            const bw = 1 / band.q // bandwidth
            const num2 = Math.pow(ratio * ratio - 1, 2) + Math.pow(ratio * bw * A, 2)
            const den2 = Math.pow(ratio * ratio - 1, 2) + Math.pow(ratio * bw / A, 2)
            return 10 * Math.log10(num2 / den2)
        }
        case 'lowShelf': {
            // Low shelf biquad (analog s-domain prototype)
            // H(s) = A × (s² + √A/Q × s + A) / (A·s² + √A/Q × s + 1)
            // At s = j·w/w0, let u = w/w0 = freq/band.frequency
            const A = Math.pow(10, band.gain / 40)
            const u = ratio // freq / band.frequency
            const u2 = u * u
            const sqrtA = Math.sqrt(A)
            const bwTerm = sqrtA / band.q

            // Numerator: A × ((A - u²) + j·u·bwTerm)
            // |Num|² = A² × ((A - u²)² + u²·bwTerm²)
            const numMagSq = A * A * ((A - u2) * (A - u2) + u2 * bwTerm * bwTerm)

            // Denominator: (1 - A·u²) + j·u·bwTerm
            // |Den|² = (1 - A·u²)² + u²·bwTerm²
            const denMagSq = (1 - A * u2) * (1 - A * u2) + u2 * bwTerm * bwTerm

            if (denMagSq === 0) return band.gain
            return 10 * Math.log10(Math.max(numMagSq / denMagSq, 1e-15))
        }
        case 'highShelf': {
            // High shelf biquad (analog s-domain prototype)
            // H(s) = A × (A·s² + √A/Q × s + 1) / (s² + √A/Q × s + A)
            const A = Math.pow(10, band.gain / 40)
            const u = ratio // freq / band.frequency
            const u2 = u * u
            const sqrtA = Math.sqrt(A)
            const bwTerm = sqrtA / band.q

            // Numerator: A × ((1 - A·u²) + j·u·bwTerm)  [evaluating at s = ju]
            // Wait, H(jw) = A × (-A·u² + j·u·bwTerm + 1) / (-u² + j·u·bwTerm + A)
            const numRe = 1 - A * u2
            const numIm = u * bwTerm
            const numMagSq = A * A * (numRe * numRe + numIm * numIm)

            const denRe = A - u2
            const denIm = u * bwTerm
            const denMagSq = denRe * denRe + denIm * denIm

            if (denMagSq === 0) return band.gain
            return 10 * Math.log10(Math.max(numMagSq / denMagSq, 1e-15))
        }
        case 'notch': {
            // Notch filter: deep cut at frequency
            const bw = 1 / band.q
            const den = Math.pow(ratio * ratio - 1, 2) + Math.pow(ratio * bw, 2)
            const num = Math.pow(ratio * ratio - 1, 2)
            if (den === 0) return -60
            return 10 * Math.log10(num / den)
        }
        default:
            return 0
    }
}

/**
 * Calculate total PEQ response at a frequency from all bands.
 */
export function calculateTotalPEQResponse(bands: PEQBand[], freq: number): number {
    return bands.reduce((sum, band) => sum + calculatePEQGain(band, freq), 0)
}

/**
 * Generate a default set of PEQ bands for speaker correction.
 */
export function createDefaultPEQBands(): PEQBand[] {
    return [
        { id: 'peq1', enabled: false, type: 'lowShelf', frequency: 80, gain: 0, q: 0.707 },
        { id: 'peq2', enabled: false, type: 'peak', frequency: 250, gain: 0, q: 2 },
        { id: 'peq3', enabled: false, type: 'peak', frequency: 1000, gain: 0, q: 2 },
        { id: 'peq4', enabled: false, type: 'peak', frequency: 3000, gain: 0, q: 2 },
        { id: 'peq5', enabled: false, type: 'highShelf', frequency: 8000, gain: 0, q: 0.707 },
    ]
}
