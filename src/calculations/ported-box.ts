/**
 * Calculate the length of a bass reflex port.
 * 
 * Formula: Lv = (23562.5 × Dv² × Np) / (Fb² × Vb) - 0.732 × Dv
 * 
 * @param fb Tuning frequency (Hz)
 * @param vb Box volume (Liters)
 * @param dv Port diameter (cm)
 * @param np Number of ports
 * @returns Port length (Lv) in cm
 */
export function calculatePortLength(fb: number, vb: number, dv: number, np: number = 1): number {
    if (fb <= 0 || vb <= 0 || dv <= 0 || np <= 0) return 0;

    const numerator = 23562.5 * Math.pow(dv, 2) * np;
    const denominator = Math.pow(fb, 2) * vb;

    const lv = (numerator / denominator) - (0.732 * dv);
    return lv > 0 ? lv : 0; // Return 0 if the math dictates negative length
}

/**
 * Validates if the air velocity in the port exceeds 5% of speed of sound.
 * Rule of thumb: V = (0.83 * Fb * Vd) / Ap (simplified, where Vd is displacement, Ap is port area)
 * Actual complex math is needed for accurate velocity, but usually it requires peak power or excursion.
 * This is a placeholder or basic check, usually Vport < 17m/s is good.
 * For now we just return a stub structure.
 */
export function isAirVelocitySafe(portVelocityMetersPerSecond: number): boolean {
    return portVelocityMetersPerSecond < 17.15; // 5% of 343 m/s
}

/**
 * Calculate port air velocity at a given frequency.
 * Based on cone displacement and port area.
 * 
 * Vport = (Sd × Xpeak × 2π × f) / Ap
 * where Xpeak is the cone displacement at that frequency and power level.
 * 
 * @param f Frequency (Hz)
 * @param sd Effective cone area (cm²)
 * @param xpeak Peak cone displacement at this frequency (mm)
 * @param portDiameterCm Port diameter (cm)
 * @param numPorts Number of ports
 * @returns Port air velocity in m/s
 */
export function calculatePortVelocity(
    f: number,
    sd: number,
    xpeak: number,
    portDiameterCm: number,
    numPorts: number = 1
): number {
    if (f <= 0 || sd <= 0 || xpeak <= 0 || portDiameterCm <= 0) return 0

    const sdM2 = sd / 10000 // cm² → m²
    const xpeakM = xpeak / 1000 // mm → m
    const portRadiusM = (portDiameterCm / 100) / 2
    const portArea = Math.PI * portRadiusM * portRadiusM * numPorts

    if (portArea <= 0) return 0

    const velocity = (sdM2 * xpeakM * 2 * Math.PI * f) / portArea
    return Math.abs(velocity) // m/s
}

/**
 * Generate port velocity curve data across frequency range.
 */
export function generatePortVelocityCurve(
    fs: number,
    qts: number,
    sd: number,
    bl: number,
    re: number,
    powerWatts: number,
    portDiameterCm: number,
    fb: number,
    numPorts: number = 1,
    startFreq: number = 10,
    endFreq: number = 500,
    points: number = 100
): Array<{ frequency: number; velocity: number; safe: boolean }> {
    const result: Array<{ frequency: number; velocity: number; safe: boolean }> = []

    for (let i = 0; i < points; i++) {
        const f = startFreq * Math.pow(endFreq / startFreq, i / (points - 1))

        // Cone excursion using electromechanical transfer function (same model as analysis.ts)
        const voltage = Math.sqrt(powerWatts * re)
        const w = 2 * Math.PI * f
        const ws = 2 * Math.PI * fs
        // X(jw) = V / (Bl × |ws² - w² + j×w×ws/Qts|)
        const realPart = ws * ws - w * w
        const imagPart = w * ws / qts
        const denom = Math.sqrt(realPart * realPart + imagPart * imagPart)
        const xMeters = voltage / (bl * denom)
        const xMm = Math.abs(xMeters * 1000)

        // Port velocity enhancement near tuning frequency
        const portResonanceFactor = 1 / Math.sqrt(Math.pow(f / fb - fb / f, 2) + 0.25)
        const effectiveX = xMm * Math.min(portResonanceFactor, 5)

        const velocity = calculatePortVelocity(f, sd, effectiveX, portDiameterCm, numPorts)

        result.push({
            frequency: Math.round(f),
            velocity: parseFloat(velocity.toFixed(2)),
            safe: velocity < 17.15
        })
    }

    return result
}

/**
 * Calculate the SPL of a ported (vented) box at a given frequency.
 * Uses the 4th-order high-pass transfer function model.
 *
 * Transfer function: G(s) = s⁴ / D(s)
 * D(s) = s⁴ + s³·(h/Qts + h/(alpha·Ql)) + s²·(h² + 1 + h²/alpha + h/(alpha·Qts·Ql))
 *      + s·(h/Qts + h³/(alpha·Ql)) + h²
 * where s = j·f/fs, h = fb/fs, alpha = Vas/Vb, Ql = box loss Q
 *
 * @param f Frequency (Hz)
 * @param fs Driver resonance (Hz)
 * @param qts Driver total Q
 * @param vas Driver equivalent volume (liters)
 * @param vb Box volume (liters)
 * @param fb Port tuning frequency (Hz)
 * @param sensitivity Driver sensitivity (dB/W/m)
 * @param ql Box loss Q (default 7, typical range 5–20)
 * @returns SPL in dB at 1m for 1W input
 */
export function calculatePortedBoxSPL(
    f: number,
    fs: number,
    qts: number,
    vas: number,
    vb: number,
    fb: number,
    sensitivity: number,
    ql: number = 7
): number {
    if (f <= 0 || fs <= 0 || qts <= 0 || vb <= 0 || fb <= 0) return sensitivity - 60

    const h = fb / fs
    const alpha = vas / vb
    const s = f / fs // normalized frequency (we evaluate the transfer function at s = jw where w = f/fs)
    const s2 = s * s
    const s4 = s2 * s2

    // Coefficients of the denominator polynomial (with s = j·normalized_freq)
    const a3 = h / qts + h / (alpha * ql)
    const a2 = h * h + 1 + h * h / alpha + h / (alpha * qts * ql)
    const a1 = h / qts + (h * h * h) / (alpha * ql)
    const a0 = h * h

    // D(j·s) = (s4 - a2·s2 + a0) + j·s·(-a3·s2 + a1)
    // Numerator: (j·s)^4 = s^4 (real, positive)
    const dReal = s4 - a2 * s2 + a0
    const dImag = s * (-a3 * s2 + a1)
    const dMagSq = dReal * dReal + dImag * dImag

    if (dMagSq === 0) return sensitivity

    // |G|^2 = s^8 / |D|^2
    const gMagSq = (s4 * s4) / dMagSq
    const gainDb = 10 * Math.log10(Math.max(gMagSq, 1e-15))

    return sensitivity + gainDb
}

/**
 * Generate full ported box SPL frequency response curve.
 */
export function generatePortedBoxSPLCurve(
    fs: number,
    qts: number,
    vas: number,
    vb: number,
    fb: number,
    sensitivity: number,
    ql: number = 7,
    startFreq: number = 10,
    endFreq: number = 1000,
    points: number = 200
): Array<{ frequency: number; spl: number }> {
    const data: Array<{ frequency: number; spl: number }> = []
    const logStart = Math.log10(startFreq)
    const logEnd = Math.log10(endFreq)
    const step = (logEnd - logStart) / (points - 1)

    for (let i = 0; i < points; i++) {
        const f = Math.pow(10, logStart + i * step)
        const spl = calculatePortedBoxSPL(f, fs, qts, vas, vb, fb, sensitivity, ql)
        data.push({
            frequency: Math.round(f * 10) / 10,
            spl: Math.round(spl * 10) / 10
        })
    }
    return data
}

/**
 * Calculate optimal ported box alignments: QB3, SC4, SBB4.
 * Returns recommended Vb and Fb for each alignment.
 *
 * @param fs Driver Fs (Hz)
 * @param qts Driver Qts
 * @param vas Driver Vas (liters)
 */
export function calculatePortedAlignments(
    fs: number,
    qts: number,
    vas: number
): Array<{ name: string; vb: number; fb: number; f3: number; description: string }> {
    if (fs <= 0 || qts <= 0 || vas <= 0) return []

    const alignments: Array<{ name: string; vb: number; fb: number; f3: number; description: string }> = []

    // QB3 (Quasi-Butterworth 3rd) — good transient response
    // Vb ≈ Vas × (20 × Qts³·√2)
    // Fb ≈ Fs / Qts
    const qb3Vb = vas * 20 * Math.pow(qts, 3) * Math.SQRT2
    const qb3Fb = fs / qts
    const qb3F3 = qb3Fb * 0.8
    alignments.push({
        name: 'QB3',
        vb: Math.round(qb3Vb * 10) / 10,
        fb: Math.round(qb3Fb * 10) / 10,
        f3: Math.round(qb3F3),
        description: 'תגובת אימפולס טובה — באס מהודק'
    })

    // SC4 (Sub-Chebyshev 4th) — maximally flat passband
    // Vb ≈ Vas × (2.6 × Qts^2.8)
    // Fb ≈ Fs × 0.9 / Qts
    const sc4Vb = vas * 2.6 * Math.pow(qts, 2.8)
    const sc4Fb = fs * 0.9 / qts
    const sc4F3 = sc4Fb * 0.75
    alignments.push({
        name: 'SC4',
        vb: Math.round(sc4Vb * 10) / 10,
        fb: Math.round(sc4Fb * 10) / 10,
        f3: Math.round(sc4F3),
        description: 'Passband שטוח מקסימלית'
    })

    // SBB4 (Super Boom Box 4th) — extended bass, slight hump
    // Vb ≈ Vas × (15 × Qts^2.5)
    // Fb ≈ Fs × 0.7 / Qts
    const sbb4Vb = vas * 15 * Math.pow(qts, 2.5)
    const sbb4Fb = fs * 0.7 / qts
    const sbb4F3 = sbb4Fb * 0.65
    alignments.push({
        name: 'SBB4',
        vb: Math.round(sbb4Vb * 10) / 10,
        fb: Math.round(sbb4Fb * 10) / 10,
        f3: Math.round(sbb4F3),
        description: 'באס מורחב עם האטה קלה'
    })

    return alignments
}
