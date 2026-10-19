/**
 * FRD/ZMA File Import
 * Parses standard speaker measurement file formats:
 * - FRD: Frequency Response Data (freq, SPL, phase)
 * - ZMA: Impedance Magnitude & Angle (freq, magnitude, phase)
 * These are plain-text formats used by VituixCAD, XSim, Speaker Workshop, etc.
 */

export interface FRDDataPoint {
    frequency: number  // Hz
    spl: number        // dB SPL
    phase: number      // degrees
}

export interface ZMADataPoint {
    frequency: number  // Hz
    impedance: number  // Ohms
    phase: number      // degrees
}

export interface FRDImportResult {
    success: boolean
    data: FRDDataPoint[]
    error?: string
    fileName?: string
    /** Estimated sensitivity: average SPL in 300-3000Hz band */
    estimatedSensitivity?: number
    /** Estimated Fs from peak in impedance (if ZMA also loaded) */
    frequencyRange?: { min: number; max: number }
}

export interface ZMAImportResult {
    success: boolean
    data: ZMADataPoint[]
    error?: string
    fileName?: string
    /** Estimated Fs from impedance peak */
    estimatedFs?: number
    /** Estimated Re from minimum impedance above Fs */
    estimatedRe?: number
    /** Estimated Le from impedance rise at HF */
    estimatedLe?: number
}

/**
 * Parse FRD file content.
 * Format: Each line is "frequency SPL [phase]" separated by spaces/tabs.
 * Lines starting with * or ; or # are comments.
 */
export function parseFRD(content: string, fileName?: string): FRDImportResult {
    try {
        const lines = content.split(/\r?\n/)
        const data: FRDDataPoint[] = []

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('*') || trimmed.startsWith(';') || trimmed.startsWith('#')) continue

            const parts = trimmed.split(/[\s,]+/)
            if (parts.length < 2) continue

            const frequency = parseFloat(parts[0])
            const spl = parseFloat(parts[1])
            const phase = parts.length >= 3 ? parseFloat(parts[2]) : 0

            if (isNaN(frequency) || isNaN(spl)) continue
            if (frequency <= 0) continue

            data.push({ frequency, spl, phase: isNaN(phase) ? 0 : phase })
        }

        if (data.length === 0) {
            return { success: false, data: [], error: 'לא נמצאו נתונים תקינים בקובץ FRD' }
        }

        // Estimate sensitivity (average SPL in 300-3000Hz)
        const midband = data.filter(d => d.frequency >= 300 && d.frequency <= 3000)
        const estimatedSensitivity = midband.length > 0
            ? midband.reduce((sum, d) => sum + d.spl, 0) / midband.length
            : undefined

        const frequencyRange = {
            min: Math.min(...data.map(d => d.frequency)),
            max: Math.max(...data.map(d => d.frequency))
        }

        return {
            success: true,
            data,
            fileName,
            estimatedSensitivity: estimatedSensitivity ? Math.round(estimatedSensitivity * 10) / 10 : undefined,
            frequencyRange
        }
    } catch (e) {
        return { success: false, data: [], error: `שגיאה בקריאת קובץ FRD: ${e}` }
    }
}

/**
 * Parse ZMA file content.
 * Format: Each line is "frequency impedance phase" separated by spaces/tabs.
 */
export function parseZMA(content: string, fileName?: string): ZMAImportResult {
    try {
        const lines = content.split(/\r?\n/)
        const data: ZMADataPoint[] = []

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('*') || trimmed.startsWith(';') || trimmed.startsWith('#')) continue

            const parts = trimmed.split(/[\s,]+/)
            if (parts.length < 2) continue

            const frequency = parseFloat(parts[0])
            const impedance = parseFloat(parts[1])
            const phase = parts.length >= 3 ? parseFloat(parts[2]) : 0

            if (isNaN(frequency) || isNaN(impedance)) continue
            if (frequency <= 0 || impedance <= 0) continue

            data.push({ frequency, impedance, phase: isNaN(phase) ? 0 : phase })
        }

        if (data.length === 0) {
            return { success: false, data: [], error: 'לא נמצאו נתונים תקינים בקובץ ZMA' }
        }

        // Estimate Fs as frequency of impedance peak (below 500Hz for woofers, or overall peak)
        const lowData = data.filter(d => d.frequency <= 500)
        const peakData = lowData.length > 3 ? lowData : data
        let maxImpedance = 0
        let estimatedFs = 0
        for (const d of peakData) {
            if (d.impedance > maxImpedance) {
                maxImpedance = d.impedance
                estimatedFs = d.frequency
            }
        }

        // Estimate Re: minimum impedance above Fs
        const aboveFs = data.filter(d => d.frequency > estimatedFs && d.frequency < estimatedFs * 10)
        let estimatedRe: number | undefined
        if (aboveFs.length > 0) {
            estimatedRe = Math.min(...aboveFs.map(d => d.impedance))
        }

        // Estimate Le: from impedance rise at high frequency
        // Z(f) ≈ Re + j*2π*f*Le → |Z| = sqrt(Re² + (2πfLe)²)
        // At high freq where Z >> Re: Le ≈ Z / (2πf)
        let estimatedLe: number | undefined
        const hfData = data.filter(d => d.frequency >= 5000 && d.frequency <= 20000)
        if (hfData.length > 0 && estimatedRe) {
            const avgHfImpedance = hfData.reduce((s, d) => s + d.impedance, 0) / hfData.length
            const avgHfFreq = hfData.reduce((s, d) => s + d.frequency, 0) / hfData.length
            if (avgHfImpedance > estimatedRe * 1.2) {
                const inductiveZ = Math.sqrt(avgHfImpedance ** 2 - estimatedRe ** 2)
                estimatedLe = (inductiveZ / (2 * Math.PI * avgHfFreq)) * 1000 // mH
            }
        }

        return {
            success: true,
            data,
            fileName,
            estimatedFs: Math.round(estimatedFs * 10) / 10,
            estimatedRe: estimatedRe ? Math.round(estimatedRe * 100) / 100 : undefined,
            estimatedLe: estimatedLe ? Math.round(estimatedLe * 100) / 100 : undefined
        }
    } catch (e) {
        return { success: false, data: [], error: `שגיאה בקריאת קובץ ZMA: ${e}` }
    }
}

/**
 * Estimate Thiele-Small parameters from combined FRD + ZMA data.
 * This is a rough estimation — proper measurement requires added mass / known volume methods.
 */
export function estimateTSFromMeasurement(zma: ZMADataPoint[]): {
    fs: number
    re: number
    qts: number
    qes: number
    qms: number
} | null {
    if (zma.length < 10) return null

    // Find impedance peak (Fs)
    let maxZ = 0, fsIdx = 0
    for (let i = 0; i < zma.length; i++) {
        if (zma[i].impedance > maxZ) {
            maxZ = zma[i].impedance
            fsIdx = i
        }
    }
    const fs = zma[fsIdx].frequency

    // Re: minimum impedance above Fs
    const aboveFs = zma.filter(d => d.frequency > fs)
    if (aboveFs.length === 0) return null
    const re = Math.min(...aboveFs.map(d => d.impedance))

    // Find -3dB frequencies (f1 and f2) where Z = sqrt(Re * Zmax)
    const z3db = Math.sqrt(re * maxZ)

    let f1 = fs, f2 = fs
    // f1: below Fs
    for (let i = fsIdx; i >= 0; i--) {
        if (zma[i].impedance <= z3db) {
            f1 = zma[i].frequency
            break
        }
    }
    // f2: above Fs
    for (let i = fsIdx; i < zma.length; i++) {
        if (zma[i].impedance <= z3db) {
            f2 = zma[i].frequency
            break
        }
    }

    if (f1 >= f2 || f1 <= 0) return null

    const qms = fs * Math.sqrt(maxZ / re) / (f2 - f1)
    const qes = qms * re / (maxZ - re)
    const qts = (qms * qes) / (qms + qes)

    return {
        fs: Math.round(fs * 10) / 10,
        re: Math.round(re * 100) / 100,
        qts: Math.round(qts * 1000) / 1000,
        qes: Math.round(qes * 1000) / 1000,
        qms: Math.round(qms * 100) / 100
    }
}
