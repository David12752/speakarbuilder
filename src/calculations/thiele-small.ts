export function calculateEBP(fs: number, qes: number): number {
    if (qes <= 0) {
        throw new Error('Qes must be greater than 0')
    }
    return fs / qes
}

export function evaluateBoxSuitability(ebp: number): 'sealed' | 'ported' | 'both' {
    if (ebp < 50) return 'sealed'
    if (ebp > 100) return 'ported'
    return 'both'
}

/**
 * Calculates optimal Vb (volume) given Vas and Qts, for a standard Butterworth alignment (Qtc = 0.707).
 */
export function calculateOptimalSealedVb(vas: number, qts: number, targetQtc: number = 0.707): number {
    if (qts >= targetQtc) {
        return Infinity;
    }
    return vas / (Math.pow(targetQtc / qts, 2) - 1)
}

// ====== Auto-calc missing T/S parameters ======

/**
 * Derive Qts from Qes and Qms:  Qts = (Qes × Qms) / (Qes + Qms)
 */
export function deriveQts(qes: number, qms: number): number | null {
    if (qes <= 0 || qms <= 0) return null
    return (qes * qms) / (qes + qms)
}

/**
 * Derive Qes from Qts and Qms:  Qes = (Qts × Qms) / (Qms - Qts)
 */
export function deriveQes(qts: number, qms: number): number | null {
    if (qts <= 0 || qms <= 0 || qms <= qts) return null
    return (qts * qms) / (qms - qts)
}

/**
 * Derive Qms from Qts and Qes:  Qms = (Qts × Qes) / (Qes - Qts)
 */
export function deriveQms(qts: number, qes: number): number | null {
    if (qts <= 0 || qes <= 0 || qes <= qts) return null
    return (qts * qes) / (qes - qts)
}

/**
 * Derive Vas from Fs, Qes, Re, Sd, BL:
 * Vas = (ρ × c² × Sd² × Qes) / (2π × Fs × Re / BL²)
 * Simplified: Vas ≈ Sd² × c² × Cms / ρ  
 * Using Cms = Vas/(ρ × c² × Sd²), we can derive Vas from BL, Sd, Fs, Qes, Re
 * Vas = (BL² × Sd² × Qes) / (2π × Fs × Re × ρ × c²) × (ρ × c²) = BL² × Sd² / (2π × Fs × Re / Qes)
 * Actually: Mms = BL²/(2π×Fs×Re/Qes) = BL²×Qes/(2π×Fs×Re),  Cms = 1/(Mms×(2πFs)²)
 * Vas = ρ×c²×Sd²×Cms
 */
export function deriveVas(fs: number, qes: number, sd: number, bl: number, re: number): number | null {
    if (fs <= 0 || qes <= 0 || sd <= 0 || bl <= 0 || re <= 0) return null
    const rho = 1.18 // kg/m³
    const c = 343 // m/s
    const sdM2 = sd / 10000 // cm² → m²
    const w0 = 2 * Math.PI * fs
    // Mms from BL, Re, Qes, Fs
    const mms = (bl * bl * qes) / (w0 * re)
    // Cms
    const cms = 1 / (mms * w0 * w0)
    // Vas in m³
    const vasM3 = rho * c * c * sdM2 * sdM2 * cms
    // Convert to liters
    return vasM3 * 1000
}

/**
 * Derive BL from Mms, Re, Qes, Fs:
 * BL = sqrt(2π × Fs × Re × Mms / Qes)
 * where Mms can be estimated from Sd & Fs if Vas known, else we use Qts/Qes/Qms relationships
 */
export function deriveBL(fs: number, qes: number, _qts: number, re: number, sd: number, vas: number): number | null {
    if (fs <= 0 || qes <= 0 || re <= 0 || sd <= 0 || vas <= 0) return null
    const rho = 1.18
    const c = 343
    const sdM2 = sd / 10000
    const w0 = 2 * Math.PI * fs
    const vasM3 = vas / 1000
    const cms = vasM3 / (rho * c * c * sdM2 * sdM2)
    const mms = 1 / (cms * w0 * w0)
    const bl = Math.sqrt(w0 * re * mms / qes)
    return bl
}

/**
 * Derive Sensitivity (SPL at 1W/1m) from BL, Mms, Sd:
 * SPL = 112.2 + 20×log10(BL×Sd / (Re × Mms))
 * Simplified estimate
 */
export function deriveSensitivity(bl: number, sd: number, re: number, fs: number, qes: number): number | null {
    if (bl <= 0 || sd <= 0 || re <= 0 || fs <= 0 || qes <= 0) return null
    const rho = 1.18   // kg/m³ (air density)
    const c = 343      // m/s (speed of sound)
    const w0 = 2 * Math.PI * fs
    const mms = (bl * bl * qes) / (w0 * re)   // kg
    const sdM2 = sd / 10000                     // cm² → m²
    // Standard reference efficiency: η₀ = ρ₀·Bl²·Sd² / (2π·c·Re·Mms²)
    // Matches Thiele: η₀ = 4π²·fs³·Vas / (c³·Qes)
    const eta0 = (rho * bl * bl * sdM2 * sdM2) / (2 * Math.PI * c * re * mms * mms)
    const spl = 112.1 + 10 * Math.log10(eta0)
    return spl > 60 && spl < 120 ? spl : null
}

export interface AutoCalcResult {
    field: string
    value: number
    label: string
}

/**
 * Given partial T/S params, derive any missing ones and return suggestions.
 */
export function autoCalcMissingParams(params: {
    fs?: number, qts?: number, qes?: number, qms?: number,
    vas?: number, sd?: number, bl?: number, re?: number, sensitivity?: number
}): AutoCalcResult[] {
    const results: AutoCalcResult[] = []
    const { fs, qts, qes, qms, vas, sd, bl, re, sensitivity } = params

    // Derive Qts from Qes + Qms
    if (!qts && qes && qms) {
        const v = deriveQts(qes, qms)
        if (v !== null) results.push({ field: 'qts', value: parseFloat(v.toFixed(3)), label: 'Qts (מ-Qes + Qms)' })
    }

    // Derive Qes from Qts + Qms
    if (!qes && qts && qms) {
        const v = deriveQes(qts, qms)
        if (v !== null) results.push({ field: 'qes', value: parseFloat(v.toFixed(3)), label: 'Qes (מ-Qts + Qms)' })
    }

    // Derive Qms from Qts + Qes
    if (!qms && qts && qes) {
        const v = deriveQms(qts, qes)
        if (v !== null) results.push({ field: 'qms', value: parseFloat(v.toFixed(2)), label: 'Qms (מ-Qts + Qes)' })
    }

    // Derive Vas from Fs, Qes, Sd, BL, Re
    if (!vas && fs && qes && sd && bl && re) {
        const v = deriveVas(fs, qes, sd, bl, re)
        if (v !== null && v > 0 && v < 1000) results.push({ field: 'vas', value: parseFloat(v.toFixed(1)), label: 'Vas (מ-Fs, Qes, Sd, BL, Re)' })
    }

    // Derive BL
    if (!bl && fs && qes && qts && re && sd && vas) {
        const v = deriveBL(fs, qes, qts, re, sd, vas)
        if (v !== null && v > 0 && v < 50) results.push({ field: 'bl', value: parseFloat(v.toFixed(2)), label: 'BL (מ-T/S params)' })
    }

    // Derive Sensitivity
    if (!sensitivity && bl && sd && re && fs && qes) {
        const v = deriveSensitivity(bl, sd, re, fs, qes)
        if (v !== null) results.push({ field: 'sensitivity', value: parseFloat(v.toFixed(1)), label: 'Sensitivity (מ-BL, Sd)' })
    }

    return results
}
