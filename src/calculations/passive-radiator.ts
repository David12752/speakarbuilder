/**
 * Passive Radiator Calculator
 * A passive radiator (drone cone) replaces the port in a vented enclosure.
 * It provides bass reflex behavior without the port noise/chuffing issues.
 * 
 * The passive radiator resonant frequency with added mass determines the tuning.
 * Fb = Fs_pr * sqrt(1 + Mms_pr / (Mms_pr_added))
 * Where Mms_pr is the passive radiator's moving mass.
 */

export interface PassiveRadiatorParams {
    /** Passive radiator resonance frequency (Hz) */
    fsPr: number
    /** Passive radiator total moving mass (g) — including cone + surround + spider */
    mmsPr: number
    /** Passive radiator equivalent compliance volume (liters) */
    vasPr: number
    /** Passive radiator surface area (cm²) */
    sdPr: number
    /** Passive radiator mechanical Q */
    qmsPr: number
}

export interface PassiveRadiatorResult {
    /** Box volume in liters */
    boxVolume: number
    /** Required additional mass (grams) to add to the PR to achieve tuning */
    additionalMassGrams: number
    /** Final tuning frequency (Hz) */
    tuningFrequency: number
    /** Effective total moving mass of PR (g) */
    totalMassPr: number
    /** F3 — -3dB low frequency (Hz) */
    f3: number
    /** Whether the PR Sd is adequate (should be ≥ Sd of driver) */
    sdAdequate: boolean
    /** Xmax requirement for the PR (mm) */
    requiredXmax: number
    /** Number of PRs recommended */
    recommendedCount: number
}

/**
 * Calculate passive radiator enclosure parameters.
 * 
 * @param fs Driver resonant frequency (Hz)
 * @param qts Driver total Q
 * @param vas Driver equivalent volume (liters)
 * @param sd Driver surface area (cm²)
 * @param xmax Driver Xmax (mm)
 * @param pr Passive radiator parameters
 */
export function calculatePassiveRadiator(
    fs: number,
    qts: number,
    vas: number,
    sd: number,
    xmax: number,
    pr: PassiveRadiatorParams
): PassiveRadiatorResult {
    if (fs <= 0 || qts <= 0 || vas <= 0 || pr.fsPr <= 0 || pr.mmsPr <= 0) {
        return {
            boxVolume: 0, additionalMassGrams: 0, tuningFrequency: 0,
            totalMassPr: 0, f3: 0, sdAdequate: false,
            requiredXmax: 0, recommendedCount: 1
        }
    }

    // Target tuning frequency: similar to bass reflex
    // Fb_target ≈ Fs * 0.85 (for QB3 alignment-like)
    const fbTarget = fs * 0.85

    // Box volume: similar to bass reflex — Vb ≈ Vas * (Qts^1.4) * 15
    // Or simplified: Vb ≈ Vas * Qts for moderate Qts
    const vbMultiplier = Math.max(0.5, Math.min(15 * Math.pow(qts, 1.4), 3))
    const boxVolume = vas * vbMultiplier

    // The PR's resonant frequency in the box:
    // Fb = Fpr * sqrt(Vas_pr / (Vas_pr + Vb))... but we need to match Fb_target
    // More accurately: to tune to Fb, we add mass to lower Fpr:
    // Fb = Fpr * sqrt(Mms_pr / (Mms_pr + M_added))
    // Solving for M_added:
    // M_added = Mms_pr * ((Fpr/Fb)² - 1)
    const massRatio = (pr.fsPr / fbTarget) ** 2 - 1
    const additionalMassGrams = Math.max(0, pr.mmsPr * massRatio)
    const totalMassPr = pr.mmsPr + additionalMassGrams

    // Actual tuning frequency with added mass:
    const tuningFrequency = pr.fsPr * Math.sqrt(pr.mmsPr / totalMassPr)

    // F3 estimation: for a PR system, F3 ≈ Fb * 0.7
    const f3 = tuningFrequency * 0.7

    // PR surface area should be >= driver Sd for adequate air movement
    const sdAdequate = pr.sdPr >= sd * 0.8

    // Required PR Xmax: Volume displacement must match driver
    // Vd_driver = Sd * Xmax
    // Vd_PR = Sd_PR * Xmax_PR → Xmax_PR = (Sd * Xmax) / Sd_PR
    const requiredXmax = (sd * xmax) / pr.sdPr

    // If PR Sd is much smaller than driver Sd, recommend multiple PRs
    const recommendedCount = Math.ceil(sd / pr.sdPr)

    return {
        boxVolume: Math.round(boxVolume * 10) / 10,
        additionalMassGrams: Math.round(additionalMassGrams),
        tuningFrequency: Math.round(tuningFrequency * 10) / 10,
        totalMassPr: Math.round(totalMassPr),
        f3: Math.round(f3),
        sdAdequate,
        requiredXmax: Math.round(requiredXmax * 10) / 10,
        recommendedCount
    }
}

/**
 * Generate frequency response for passive radiator enclosure.
 */
export function generatePassiveRadiatorResponse(
    result: PassiveRadiatorResult,
    fs: number,
    sensitivity: number = 85,
    startHz: number = 10,
    endHz: number = 1000,
    points: number = 200
): Array<{ frequency: number; spl: number }> {
    const data: Array<{ frequency: number; spl: number }> = []
    const logStart = Math.log10(startHz)
    const logEnd = Math.log10(endHz)
    const step = (logEnd - logStart) / points

    const fb = result.tuningFrequency

    for (let i = 0; i <= points; i++) {
        const f = Math.pow(10, logStart + i * step)
        const ratio = f / fb

        // 4th order high-pass (similar to bass reflex)
        const gain4 = Math.pow(ratio, 4) / (Math.pow(ratio, 4) + 1)
        // Additional driver rolloff below Fs
        const driverRolloff = f < fs ? Math.pow(f / fs, 2) : 1

        const totalGain = gain4 * driverRolloff
        const gainDb = 10 * Math.log10(Math.max(totalGain, 1e-10))

        data.push({
            frequency: Math.round(f * 10) / 10,
            spl: Math.round((sensitivity + gainDb) * 10) / 10
        })
    }

    return data
}
