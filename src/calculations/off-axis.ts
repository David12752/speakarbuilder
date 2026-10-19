/**
 * Off-Axis & Polar Response Estimation
 * 
 * Estimates the off-axis behavior of a loudspeaker driver based on its
 * effective radiating diameter. Uses the standard piston model:
 *   H(θ,f) = 2*J1(k*a*sin(θ)) / (k*a*sin(θ))
 * where k = 2π*f/c, a = effective radius, J1 = Bessel function of first kind.
 * 
 * This is an approximation — real drivers deviate due to cone breakup,
 * surround behavior, dust cap radiation, etc.
 */

/**
 * Bessel function of the first kind, order 1.
 * Uses polynomial approximation (Abramowitz & Stegun).
 */
function besselJ1(x: number): number {
    if (Math.abs(x) < 1e-10) return 0

    const ax = Math.abs(x)
    let result: number

    if (ax < 8) {
        const y = x * x
        result = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1
            + y * (-2972611.439 + y * (15704.48260 + y * (-30.16036606))))))
            / (144725228442.0 + y * (2300535178.0 + y * (18583304.74
            + y * (99447.43394 + y * (376.9991397 + y * 1.0)))))
    } else {
        const z = 8.0 / ax
        const y = z * z
        const xx = ax - 2.356194491
        const p = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * (-0.240337019e-6))))
        const q = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)))
        result = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * p - z * Math.sin(xx) * q)
        if (x < 0) result = -result
    }

    return result
}

/**
 * Calculate the directivity function H(θ) for a circular piston at given frequency.
 * Returns the SPL attenuation in dB relative to on-axis.
 * 
 * @param angleDeg Off-axis angle in degrees (0 = on-axis)
 * @param frequencyHz Frequency in Hz
 * @param driverDiameterInches Effective driver diameter in inches
 * @returns Attenuation in dB (always ≤ 0)
 */
export function calculateOffAxisAttenuation(
    angleDeg: number,
    frequencyHz: number,
    driverDiameterInches: number
): number {
    if (angleDeg === 0 || frequencyHz <= 0 || driverDiameterInches <= 0) return 0

    const c = 343 // speed of sound m/s
    const a = (driverDiameterInches * 25.4 / 2) / 1000 // effective radius in meters
    const k = (2 * Math.PI * frequencyHz) / c
    const theta = (angleDeg * Math.PI) / 180
    const x = k * a * Math.sin(theta)

    if (Math.abs(x) < 1e-10) return 0

    const H = 2 * besselJ1(x) / x
    const attenuation = 20 * Math.log10(Math.abs(H))

    return Math.max(attenuation, -60) // Clamp to -60dB
}

/**
 * Generate polar response data at a specific frequency.
 * Returns an array of {angle, spl} from 0° to 180°.
 */
export function generatePolarResponse(
    frequencyHz: number,
    driverDiameterInches: number,
    onAxisSPL: number = 0,
    angleStep: number = 5
): Array<{ angle: number; spl: number }> {
    const data: Array<{ angle: number; spl: number }> = []

    for (let angle = 0; angle <= 180; angle += angleStep) {
        const atten = calculateOffAxisAttenuation(angle, frequencyHz, driverDiameterInches)
        data.push({
            angle,
            spl: Math.round((onAxisSPL + atten) * 10) / 10
        })
    }

    return data
}

/**
 * Generate off-axis frequency response at a given angle.
 * Returns frequency response curve at the specified off-axis angle.
 */
export function generateOffAxisFrequencyResponse(
    angleDeg: number,
    driverDiameterInches: number,
    onAxisSPL: number = 85,
    startHz: number = 100,
    endHz: number = 20000,
    points: number = 200
): Array<{ frequency: number; spl: number }> {
    const data: Array<{ frequency: number; spl: number }> = []
    const logStart = Math.log10(startHz)
    const logEnd = Math.log10(endHz)
    const step = (logEnd - logStart) / points

    for (let i = 0; i <= points; i++) {
        const f = Math.pow(10, logStart + i * step)
        const atten = calculateOffAxisAttenuation(angleDeg, f, driverDiameterInches)
        data.push({
            frequency: Math.round(f * 10) / 10,
            spl: Math.round((onAxisSPL + atten) * 10) / 10
        })
    }

    return data
}

/**
 * Estimate the -6dB beamwidth angle at a given frequency.
 * This is the full angle where the SPL drops by 6dB.
 */
export function estimateBeamwidth(frequencyHz: number, driverDiameterInches: number): number {
    // Binary search for the -6dB angle
    let low = 0, high = 180
    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2
        const atten = calculateOffAxisAttenuation(mid, frequencyHz, driverDiameterInches)
        if (atten < -6) {
            high = mid
        } else {
            low = mid
        }
    }
    return Math.round((low + high) / 2)
}

/**
 * Calculate the Directivity Index (DI) at a given frequency.
 * DI = 10 * log10(2 / integral(H²(θ) * sin(θ) dθ, 0, π))
 * Approximated using numerical integration.
 */
export function calculateDirectivityIndex(frequencyHz: number, driverDiameterInches: number): number {
    if (frequencyHz <= 0 || driverDiameterInches <= 0) return 0

    const c = 343
    const a = (driverDiameterInches * 25.4 / 2) / 1000
    const k = (2 * Math.PI * frequencyHz) / c

    // Numerical integration of H²(θ) * sin(θ) from 0 to π
    const steps = 360
    const dTheta = Math.PI / steps
    let integral = 0

    for (let i = 0; i <= steps; i++) {
        const theta = i * dTheta
        const x = k * a * Math.sin(theta)
        let H: number
        if (Math.abs(x) < 1e-10) {
            H = 1
        } else {
            H = 2 * besselJ1(x) / x
        }
        const weight = (i === 0 || i === steps) ? 0.5 : 1
        integral += H * H * Math.sin(theta) * weight * dTheta
    }

    if (integral <= 0) return 0
    const DI = 10 * Math.log10(2 / integral)
    return Math.round(DI * 10) / 10
}
