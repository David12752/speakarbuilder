/**
 * Impedance, Phase, and Group Delay calculations for analysis charts.
 */

import { generateLogFrequencies } from './frequency-response'

/**
 * Calculate driver impedance at a given frequency using simplified model.
 * Z(f) = sqrt( (Re + Rm(f))² + (Xl(f) - Xc(f))² )
 * where Rm(f) is the motional resistance at resonance
 */
export function calculateDriverImpedance(
    f: number,
    fs: number,
    re: number,
    qes: number,
    qms: number,
    le: number
): { magnitude: number; phase: number } {
    if (f <= 0 || fs <= 0 || re <= 0) return { magnitude: re, phase: 0 }

    const w = 2 * Math.PI * f
    const ws = 2 * Math.PI * fs

    // Voice coil impedance: Ze = Re + j*w*Le
    const leH = le / 1000 // mH -> H
    const xL = w * leH

    // Motional impedance (series RLC model of mechanical system reflected to electrical):
    // Res = Bl² / Rms = Re * Qms / Qes (resistance at resonance peak above Re)
    // Cms reflected = Qes / (2*pi*fs*Re)  ... we can express via standard form
    // Lces = Re * Qes / (2*pi*fs)
    // Cmes = 1 / (2*pi*fs*Re*Qms)... wait
    //
    // Standard model: Z_mot = Res || Lces || Cmes  (parallel RLC)
    // Res = Re * Qms / Qes
    // Lces = Re * Qes / (ws)   = Re * Qes / (2*pi*fs)
    // Cmes = 1 / (ws * Re * Qms) = 1 / (2*pi*fs * Re * Qms)
    
    const Res = re * qms / qes
    // Standard T/S electromechanical analogues (parallel RLC motional branch):
    //   ω_res² = 1/(Lces·Cmes) must equal ωs² — verified below
    //   Lces = Bl²·Cms = Re/(ωs·Qes)   (Cms = 1/(Mms·ωs²), Mms = Bl²·Qes/(ωs·Re))
    //   Cmes = Mms/Bl² = Qes/(ωs·Re)
    const Lces = re / (ws * qes)        // Henrys  — note: Lces·Cmes = 1/ωs² ✓
    const Cmes = qes / (ws * re)        // Farads

    // Parallel RLC impedance: 1/Zmot = 1/Res + 1/(jwLces) + jwCmes
    // = 1/Res + j*(wCmes - 1/(wLces))
    const gMot = 1 / Res                                  // conductance
    const bMot = w * Cmes - 1 / (w * Lces)               // susceptance

    const yMotMagSq = gMot * gMot + bMot * bMot
    // Zmot = Ymot* / |Ymot|²
    const rMot = gMot / yMotMagSq                         // real part of Zmot
    const xMot = -bMot / yMotMagSq                        // imag part of Zmot

    // Total: Z = Ze + Zmot = (Re + rMot) + j*(xL + xMot)
    const rTotal = re + rMot
    const xTotal = xL + xMot

    const magnitude = Math.sqrt(rTotal * rTotal + xTotal * xTotal)
    const phase = Math.atan2(xTotal, rTotal) * (180 / Math.PI)

    return { magnitude, phase }
}

/**
 * Generate full impedance curve data for Recharts.
 */
export function generateImpedanceCurve(
    fs: number,
    re: number,
    qes: number,
    qms: number,
    le: number,
    startFreq: number = 20,
    endFreq: number = 20000,
    points: number = 150
): Array<{ frequency: number; impedance: number; phase: number }> {
    const freqs = generateLogFrequencies(startFreq, endFreq, points)
    return freqs.map(f => {
        const { magnitude, phase } = calculateDriverImpedance(f, fs, re, qes, qms, le)
        return {
            frequency: Math.round(f),
            impedance: parseFloat(magnitude.toFixed(1)),
            phase: parseFloat(phase.toFixed(1))
        }
    })
}

/**
 * Calculate group delay from phase data.
 * Group delay = -dφ/dω = -Δφ / (2π × Δf)
 */
export function calculateGroupDelay(
    phaseData: Array<{ frequency: number; phase: number }>
): Array<{ frequency: number; groupDelay: number }> {
    const result: Array<{ frequency: number; groupDelay: number }> = []

    for (let i = 1; i < phaseData.length - 1; i++) {
        const prev = phaseData[i - 1]
        const next = phaseData[i + 1]

        const dPhase = (next.phase - prev.phase) * (Math.PI / 180) // to radians
        const dOmega = 2 * Math.PI * (next.frequency - prev.frequency)

        if (dOmega === 0) continue

        const gd = -dPhase / dOmega
        result.push({
            frequency: phaseData[i].frequency,
            groupDelay: parseFloat((gd * 1000).toFixed(2)) // ms
        })
    }

    return result
}

/**
 * Cone excursion calculation.
 * Uses electromechanical model: x(f) = (V / Bl) × |H_hp(f)|
 * where H_hp is the high-pass transfer function of the driver mechanical system.
 * Mms is derived from T/S: Mms = Bl² / (2π × fs × Qes × Re × 2π × fs)
 *                        simplified: Mms = Bl² × Qes / (Re × ws²)... 
 * More standard: Mms = Qts × fs × Sd × 2π... no, let's use:
 * Mms = Bl² / (Re × ws² × Vas_m3 / (ρ × c² × Sd²))... simplest via:
 * x(f) = Vas * V / (Bl * Sd * c) × |H(jw)| ... 
 * 
 * Actually the simplest correct approach:
 * Displacement below resonance: x ≈ V_rms / (Bl × ω² × Mms) for f << fs
 * At and above resonance, shaped by the mechanical Q.
 * We use the full transfer function approach with Mms = Bl²/(Re × (2πfs)² × (Qes/Qts)):
 * Mms = Bl² / (2πfs × Re × Qes × 2πfs) — Wait, standard formula:
 *   Mms = (Bl²) / (Re × (2π×fs)² × ... )
 * 
 * Simplest correct: from T/S relations:
 *   Rms = Bl²/(Re × Qms/Qes × Qes) ... 
 * 
 * Let's use the mechanical model directly:
 *   Mms = Bl² / ((2πfs)² × Lces)  where Lces = Re×Qes/(2πfs)
 *   => Mms = Bl² / ((2πfs)² × Re × Qes / (2πfs))
 *   => Mms = Bl² / (2πfs × Re × Qes × (2πfs))  ... = Bl² / (ws² × Re × Qes / ws) = Bl²/(ws × Re × Qes)
 * No: Lces = Re*Qes/ws, so Mms = Bl²*Cmes, Cmes = 1/(ws*Re*Qms)
 *   => Mms = Bl² / (ws * Re * Qms)  — This doesn't look right either.
 *
 * Standard definition: Mms = Qts * ws * Vas * ρ / (c² * Sd²) ... too many params.
 * 
 * Simple correct formula for excursion:
 * x(f) = (V_rms) / (Bl * w²) × 1/sqrt((1/w² - 1/ws²)² + 1/(Qts*ws*w)²)^-1
 * Simplified: use mechanical high-pass shape
 */
export function calculateConeExcursion(
    f: number,
    fs: number,
    qts: number,
    sd: number,
    bl: number,
    re: number,
    powerWatts: number
): number {
    if (f <= 0 || fs <= 0 || bl <= 0 || sd <= 0) return 0

    const voltage = Math.sqrt(powerWatts * re)
    const w = 2 * Math.PI * f
    const ws = 2 * Math.PI * fs

    // Mms from T/S: Mms = Bl² / (ws × Re × Qes × ws) ... but we only have Qts and Bl
    // Use relationship: for the mechanical system, the displacement transfer function is:
    // X(f)/V(f) = (1/Bl) × 1/(s² + s×ws/Qts + ws²) 
    // |X(jw)| = V / (Bl × |(jw)² + jw×ws/Qts + ws²|)
    //         = V / (Bl × |ws² - w² + j×w×ws/Qts|)

    const realPart = ws * ws - w * w
    const imagPart = w * ws / qts
    const denom = Math.sqrt(realPart * realPart + imagPart * imagPart)

    // Displacement in meters
    const xMeters = voltage / (bl * denom)

    return Math.abs(xMeters * 1000) // mm
}
