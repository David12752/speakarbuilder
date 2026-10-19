/**
 * Power Dissipation Calculator for Crossover Components
 * 
 * Calculates the power dissipated across each component in the crossover network
 * based on the input signal power and component values.
 */

export interface ComponentPower {
    name: string
    type: 'capacitor' | 'inductor' | 'resistor'
    value: number
    unit: string
    powerWatts: number
    recommendedRating: number // minimum watt rating recommendation
}

/**
 * Calculate RMS voltage from power and impedance
 */
function rmsVoltage(powerWatts: number, impedance: number): number {
    return Math.sqrt(powerWatts * impedance)
}

/**
 * Calculate power dissipated by each crossover component.
 * 
 * In a crossover network, inductors and resistors dissipate real power.
 * Capacitors ideally don't (reactive), but we still show their VA rating.
 * 
 * For inductors: P = I²×DCR (where DCR is the DC resistance of the coil)
 * For resistors: P = V²/R at crossover frequency
 * For capacitors: practically lossless, but we recommend VA rating
 * 
 * @param components Array of {name, type, value, unit}
 * @param driverImpedance Driver impedance in ohms
 * @param inputPowerWatts Amplifier power in watts
 * @param fc Crossover frequency in Hz
 */
export function calculatePowerDissipation(
    components: Array<{ name: string; type: 'capacitor' | 'inductor' | 'resistor'; value: number; unit: string }>,
    driverImpedance: number,
    inputPowerWatts: number,
    fc: number
): ComponentPower[] {
    if (driverImpedance <= 0 || inputPowerWatts <= 0 || fc <= 0) return []

    const vRms = rmsVoltage(inputPowerWatts, driverImpedance)
    const iRms = vRms / driverImpedance

    return components.map(comp => {
        let powerWatts = 0

        if (comp.type === 'inductor') {
            // Inductor DCR estimate: ~0.5Ω for typical air-core, ~0.3Ω for ferrite
            // Power = I² × DCR
            const dcrEstimate = comp.value > 1 ? 0.8 : 0.4 // rough DCR estimate based on inductance
            powerWatts = iRms * iRms * dcrEstimate
        } else if (comp.type === 'resistor') {
            // P = I² × R  (for series resistors)
            // P = V² / R  (for parallel resistors)
            // We'll assume series for L-pad R1, parallel for R2
            if (comp.name.includes('R2') || comp.name.includes('Parallel')) {
                powerWatts = (vRms * vRms) / comp.value
            } else {
                powerWatts = iRms * iRms * comp.value
            }
        } else if (comp.type === 'capacitor') {
            // Capacitors are reactive — negligible real power loss
            // But we recommend a voltage rating. VA = V × I through cap
            const cFarads = comp.value / 1e6
            const xc = 1 / (2 * Math.PI * fc * cFarads)
            const iCap = vRms / xc
            powerWatts = 0.01 * vRms * iCap // ESR-based loss estimate (~1%)
        }

        // Safety factor: recommend 2× the calculated power, minimum 5W
        const recommendedRating = Math.max(5, Math.ceil(powerWatts * 2))

        return {
            ...comp,
            powerWatts: parseFloat(powerWatts.toFixed(2)),
            recommendedRating
        }
    })
}

/**
 * Calculate acoustic delay in milliseconds from physical offset in mm.
 * Speed of sound = 343 m/s
 */
export function calculateAcousticDelay(offsetMm: number): number {
    const speedOfSound = 343 // m/s
    return (offsetMm / 1000) / speedOfSound * 1000 // ms
}

/**
 * Calculate the equivalent all-pass filter phase shift for acoustic offset.
 * φ = 2π × f × delay
 */
export function calculateOffsetPhaseShift(frequencyHz: number, offsetMm: number): number {
    const delaySeconds = (offsetMm / 1000) / 343
    return 360 * frequencyHz * delaySeconds // degrees
}
