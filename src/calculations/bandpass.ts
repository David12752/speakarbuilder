/**
 * Bandpass Enclosure Calculator
 * Calculates 4th-order single-reflex bandpass enclosure parameters.
 * A bandpass enclosure has a sealed rear chamber and a ported front chamber.
 * The driver fires into the sealed chamber; sound exits through the port.
 */

export interface BandpassResult {
    /** Sealed (rear) chamber volume in liters */
    sealedVolume: number
    /** Ported (front) chamber volume in liters */
    portedVolume: number
    /** Port tuning frequency in Hz */
    portTuningHz: number
    /** Port length in mm (for given diameter) */
    portLengthMm: number
    /** Lower -3dB frequency in Hz */
    f3Low: number
    /** Upper -3dB frequency in Hz */
    f3High: number
    /** Bandwidth ratio */
    bandwidthOctaves: number
    /** Estimated peak SPL gain over free-air (dB) */
    peakGainDb: number
    /** Efficiency bandwidth product */
    ebp: number
}

/**
 * Calculate 4th-order single-reflex bandpass enclosure.
 * 
 * @param fs Driver resonant frequency (Hz)
 * @param qts Driver total Q factor
 * @param vas Driver equivalent volume (liters)
 * @param sd Driver surface area (cm²)
 * @param portDiameterCm Port diameter (cm)
 * @param alignmentRatio Ratio parameter: portedVol/sealedVol (default: auto-optimized)
 */
export function calculateBandpass(
    fs: number,
    qts: number,
    vas: number,
    sd: number,
    portDiameterCm: number = 5,
    alignmentRatio?: number
): BandpassResult {
    if (fs <= 0 || qts <= 0 || vas <= 0) {
        return {
            sealedVolume: 0, portedVolume: 0, portTuningHz: 0, portLengthMm: 0,
            f3Low: 0, f3High: 0, bandwidthOctaves: 0, peakGainDb: 0, ebp: fs / qts
        }
    }

    const ebp = fs / qts

    // For 4th-order bandpass, optimal sealed chamber:
    // Vr (sealed rear) ≈ Vas / (Qts² * 20 + 5) — simplified alignment
    // A common approach: Vr = Vas * (Qts² * 2)
    const sealedMultiplier = Math.max(0.3, Math.min(2 * qts * qts, 2))
    const sealedVolume = vas * sealedMultiplier

    // Ported front chamber: ratio determines bandwidth vs. efficiency trade-off
    const ratio = alignmentRatio ?? (ebp > 100 ? 1.5 : ebp > 70 ? 1.2 : 1.0)
    const portedVolume = sealedVolume * ratio

    // Sealed chamber raises Fs: Fc_sealed = Fs * sqrt(1 + Vas/Vr)
    const fcSealed = fs * Math.sqrt(1 + vas / sealedVolume)

    // Port tuning: Fb ≈ Fc_sealed * 0.9 (slightly below the sealed resonance)
    const portTuningHz = fcSealed * 0.9

    // Port length calculation (same formula as ported box)
    const portRadiusCm = portDiameterCm / 2
    const portAreaCm2 = Math.PI * portRadiusCm * portRadiusCm
    const portAreaM2 = portAreaCm2 / 10000
    const portedVolumeM3 = portedVolume / 1000
    const c = 343 // speed of sound m/s

    const portLengthM = (c * c * portAreaM2) / (4 * Math.PI * Math.PI * portTuningHz * portTuningHz * portedVolumeM3) - 0.732 * (portDiameterCm / 100)
    const portLengthMm = Math.max(0, portLengthM * 1000)

    // Bandwidth estimation
    // f3Low ≈ portTuningHz * 0.7
    // f3High ≈ fcSealed * 1.4
    const f3Low = portTuningHz * 0.7
    const f3High = fcSealed * 1.4
    const bandwidthOctaves = Math.log2(f3High / f3Low)

    // Peak gain: bandpass concentrates energy in a narrow band
    // Rough estimate: +3 to +6 dB over the passband
    const peakGainDb = 3 + Math.log2(vas / portedVolume) * 2

    // Use sd to validate — but it doesn't directly affect the core bandpass math
    void sd // Included for completeness; larger Sd = more output capability

    return {
        sealedVolume: Math.round(sealedVolume * 10) / 10,
        portedVolume: Math.round(portedVolume * 10) / 10,
        portTuningHz: Math.round(portTuningHz * 10) / 10,
        portLengthMm: Math.round(portLengthMm),
        f3Low: Math.round(f3Low),
        f3High: Math.round(f3High),
        bandwidthOctaves: Math.round(bandwidthOctaves * 100) / 100,
        peakGainDb: Math.round(peakGainDb * 10) / 10,
        ebp: Math.round(ebp * 10) / 10
    }
}

/**
 * Generate bandpass frequency response curve.
 * Models the 4th-order single-reflex bandpass as two coupled 2nd-order HP+LP
 * transfer functions, giving proper 4th-order rolloff on both sides.
 */
export function generateBandpassResponse(
    result: BandpassResult,
    sensitivity: number = 85,
    startHz: number = 10,
    endHz: number = 1000,
    points: number = 200
): Array<{ frequency: number; spl: number }> {
    const data: Array<{ frequency: number; spl: number }> = []
    const logStart = Math.log10(startHz)
    const logEnd = Math.log10(endHz)
    const step = (logEnd - logStart) / points

    // 4th-order single-reflex BP = 2nd-order HP (sealed side) × 2nd-order LP (ported side)
    // HP corner ≈ f3Low, LP corner ≈ f3High
    const fL = result.f3Low    // HP -3dB
    const fH = result.f3High   // LP -3dB
    const Qhp = 0.707          // Butterworth alignment for sealed side
    const Qlp = 0.707          // Butterworth alignment for ported side

    for (let i = 0; i <= points; i++) {
        const f = Math.pow(10, logStart + i * step)

        // 2nd-order high-pass: |H_hp|² = s⁴/(s⁴ + s²/Q² + 1) where s = f/fL
        const sL = f / fL
        const sL2 = sL * sL
        const hpMag2 = sL2 * sL2 / ((1 - sL2) ** 2 + (sL / Qhp) ** 2)

        // 2nd-order low-pass: |H_lp|² = 1/(1 - s² )² + (s/Q)²) where s = f/fH
        const sH = f / fH
        const sH2 = sH * sH
        const lpMag2 = 1 / ((1 - sH2) ** 2 + (sH / Qlp) ** 2)

        // Combined 4th-order bandpass magnitude
        const totalMag2 = hpMag2 * lpMag2
        const gainDb = 10 * Math.log10(Math.max(totalMag2, 1e-15))

        data.push({
            frequency: Math.round(f * 10) / 10,
            spl: Math.round((sensitivity + result.peakGainDb + gainDb) * 10) / 10
        })
    }

    return data
}
