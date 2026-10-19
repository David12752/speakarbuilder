export interface SimulationParams {
    woocommerce?: {
        hz: number
        spl: number
    }[]
}

/**
 * Generate logarithmic frequency points from startFreq to endFreq
 */
export function generateLogFrequencies(startFreq: number = 20, endFreq: number = 20000, points: number = 200): number[] {
    const freqs: number[] = []
    const logStart = Math.log10(startFreq)
    const logEnd = Math.log10(endFreq)
    const step = (logEnd - logStart) / (points - 1)

    for (let i = 0; i < points; i++) {
        freqs.push(Math.pow(10, logStart + i * step))
    }
    return freqs
}

/**
 * Acoustic roll-off of a sealed box (2nd order high pass)
 */
export function calculateSealedRollOff(f: number, fc: number, qtc: number): number {
    if (f <= 0 || fc <= 0 || qtc <= 0) return 0
    const normalized = f / fc
    const denomSq = Math.pow(Math.pow(normalized, 2) - 1, 2) + Math.pow(normalized / qtc, 2)
    const mag = Math.pow(normalized, 2) / Math.sqrt(denomSq)
    if (mag <= 0) return -100 // essentially silence
    return 20 * Math.log10(mag)
}

/**
 * Filter attenuation
 */
export function calculateFilterAttenuation(
    f: number,
    fc: number,
    type: 'HPF' | 'LPF',
    order: 1 | 2 | 3 | 4,
    alignment: string = 'butterworth'
): number {
    if (f <= 0 || fc <= 0) return 0

    const ratio = type === 'LPF' ? f / fc : fc / f

    if (order === 1) {
        // 1st order: 6dB/oct
        const magSq = 1 / (1 + Math.pow(ratio, 2))
        return 10 * Math.log10(magSq)
    } else if (order === 2) {
        if (alignment === 'linkwitz-riley') {
            // LR2 is two cascaded 1st order
            const magSq = Math.pow(1 / (1 + Math.pow(ratio, 2)), 2)
            return 10 * Math.log10(magSq)
        } else if (alignment === 'bessel') {
            // Bessel 2nd order: H(s) = 3 / (s² + 3s + 3)
            // |H(jw)|² = 9 / ((3 - w²)² + (3w)²) where w = ratio (normalized)
            const w = ratio
            const magSq = 9 / (Math.pow(3 - w * w, 2) + Math.pow(3 * w, 2))
            return 10 * Math.log10(Math.max(magSq, 1e-15))
        } else if (alignment === 'chebyshev') {
            // Chebyshev 0.5dB: steeper rolloff with ripple
            const epsilon = Math.sqrt(Math.pow(10, 0.05) - 1) // 0.5dB ripple
            const Tn = 2 * ratio * ratio - 1  // Chebyshev T2
            const magSq = 1 / (1 + epsilon * epsilon * Tn * Tn)
            return 10 * Math.log10(magSq)
        } else {
            // Butterworth (default)
            const magSq = 1 / (1 + Math.pow(ratio, 4))
            return 10 * Math.log10(magSq)
        }
    } else if (order === 3) {
        if (alignment === 'bessel') {
            // Bessel 3rd order: H(s) = 15 / (s³ + 6s² + 15s + 15)
            // |H(jw)|² = 225 / ((15 - 6w²)² + (15w - w³)²)
            const w = ratio
            const realPart = 15 - 6 * w * w
            const imagPart = 15 * w - w * w * w
            const magSq = 225 / (realPart * realPart + imagPart * imagPart)
            return 10 * Math.log10(Math.max(magSq, 1e-15))
        } else if (alignment === 'chebyshev') {
            const epsilon = Math.sqrt(Math.pow(10, 0.05) - 1)
            const Tn = 4 * Math.pow(ratio, 3) - 3 * ratio  // Chebyshev T3
            const magSq = 1 / (1 + epsilon * epsilon * Tn * Tn)
            return 10 * Math.log10(magSq)
        } else {
            // Butterworth
            const magSq = 1 / (1 + Math.pow(ratio, 6))
            return 10 * Math.log10(magSq)
        }
    } else {
        // 4th order
        if (alignment === 'linkwitz-riley') {
            // LR4 is two cascaded 2nd order Butterworths
            const magSq = Math.pow(1 / (1 + Math.pow(ratio, 4)), 2)
            return 10 * Math.log10(magSq)
        } else {
            // Butterworth (default)
            const magSq = 1 / (1 + Math.pow(ratio, 8))
            return 10 * Math.log10(magSq)
        }
    }
}

/**
 * Calculate simple coherent SPL sum
 */
export function sumSPL(spl1: number, spl2: number): number {
    // Coherent addition (RMS voltage summed in phase)
    // 20 * log10( 10^(spl1/20) + 10^(spl2/20) )
    // If one is way lower, it won't impact much. If they are -100, just return -100
    if (spl1 < -50 && spl2 < -50) return Math.max(spl1, spl2)
    const p1 = Math.pow(10, spl1 / 20)
    const p2 = Math.pow(10, spl2 / 20)
    return 20 * Math.log10(p1 + p2)
}
