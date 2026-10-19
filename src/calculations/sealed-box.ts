export function calculateQtc(qts: number, vas: number, vb: number): number {
    if (vb <= 0) return Infinity
    return qts * Math.sqrt(vas / vb + 1)
}

export function calculateFc(fs: number, vas: number, vb: number): number {
    if (vb <= 0) return Infinity
    return fs * Math.sqrt(vas / vb + 1)
}

export function calculateF3(fc: number, qtc: number): number {
    if (qtc <= 0) return Infinity

    const qtc2 = qtc * qtc
    const term1 = 1 / qtc2 - 2
    const innerSqrt = Math.sqrt(Math.pow(term1, 2) + 4)
    const ratio = Math.sqrt((term1 + innerSqrt) / 2)

    return fc * ratio
}

/**
 * Calculate sealed box SPL at a given frequency.
 * Uses the 2nd-order high-pass transfer function:
 * G(s) = s² / (s² + s/Qtc + 1)
 * where s = j·f/fc
 *
 * @param f Frequency (Hz)
 * @param fc Closed-box resonance frequency (Hz)
 * @param qtc Closed-box Q
 * @param sensitivity Driver sensitivity (dB/W/m)
 * @returns SPL in dB
 */
export function calculateSealedBoxSPL(
    f: number,
    fc: number,
    qtc: number,
    sensitivity: number
): number {
    if (f <= 0 || fc <= 0 || qtc <= 0) return sensitivity - 60

    const s = f / fc  // normalized frequency
    const s2 = s * s

    // G(j·s) = -s² / (-s² + j·s/Qtc + 1)
    //         = s² / ((s² - 1) - j·s/Qtc)  ... wait
    // H(s) = s² / (s² + s/Qtc + 1)
    // At s = jw:  (jw)² = -w²
    // H(jw) = -w² / (-w² + jw/Qtc + 1)
    //       = w² / (w² - 1 - jw/Qtc)  [multiply top and bottom by -1]
    // Actually: H(jw) = -w² / (1 - w² + jw/Qtc)
    // |H(jw)|^2 = w^4 / ((1 - w²)² + (w/Qtc)²)
    const realPart = 1 - s2
    const imagPart = s / qtc
    const denomSq = realPart * realPart + imagPart * imagPart

    if (denomSq === 0) return sensitivity

    const magSq = (s2 * s2) / denomSq
    const gainDb = 10 * Math.log10(Math.max(magSq, 1e-15))

    return sensitivity + gainDb
}

/**
 * Generate full sealed box SPL frequency response curve.
 */
export function generateSealedBoxSPLCurve(
    fs: number,
    qts: number,
    vas: number,
    vb: number,
    sensitivity: number,
    startFreq: number = 10,
    endFreq: number = 1000,
    points: number = 200
): Array<{ frequency: number; spl: number }> {
    const fc = calculateFc(fs, vas, vb)
    const qtc = calculateQtc(qts, vas, vb)

    const data: Array<{ frequency: number; spl: number }> = []
    const logStart = Math.log10(startFreq)
    const logEnd = Math.log10(endFreq)
    const step = (logEnd - logStart) / (points - 1)

    for (let i = 0; i < points; i++) {
        const f = Math.pow(10, logStart + i * step)
        const spl = calculateSealedBoxSPL(f, fc, qtc, sensitivity)
        data.push({
            frequency: Math.round(f * 10) / 10,
            spl: Math.round(spl * 10) / 10
        })
    }
    return data
}
