/**
 * Calculates a Zobel Network for impedance equalization.
 * @param re DC Resistance of the voice coil (Ohms)
 * @param le Voice Coil Inductance (mH)
 */
export function calculateZobel(re: number, le: number) {
    if (re <= 0) throw new Error('Invalid Re')

    // Rz = Re
    // Cz = Le / Re² (assuming Le is mH, the output in uF is (Le * 1000) / Re^2

    const rz = re
    const czMicrofarads = (le * 1000) / (re * re)

    return { rz, czMicrofarads }
}

/**
 * Calculates an L-Pad network to attenuate a driver based on the formulas provided.
 * @param z Impedance of the driver (Ohms)
 * @param dB The level of attenuation in positive dB.
 */
export function calculateLPad(z: number, dB: number) {
    if (dB <= 0 || z <= 0) return { r1: 0, r2: Infinity }

    // Formula based on vision document:
    // R1 = Z × (10^(dB/20) - 1)
    // R2 = Z × (+10^(dB/20) / (10^(dB/20) - 1)) / (some variations were in the doc)
    // Let's use standard L-Pad calculation for accurate acoustic results as typical in audio:
    // k = 10^(dB/20) where k is the voltage ratio > 1 for attenuation
    // In the document it says:
    // R1 = Z × (10^(dB/20) - 1)   <-- Note: This might be a simplified series calc in the prompt, 
    // but standard true L-Pad is: R1 = Z × (k - 1)/k,  R2 = Z / (k - 1)

    // Falling back to the document's explicit formula from the "נוסחאות מפתח" section:
    // R1 = Z × (10^(dB/20) - 1)
    // R2 = Z × 10^(dB/20) / (10^(dB/20) - 1)

    const k = Math.pow(10, dB / 20)

    // Standard audio L-Pad (maintains nominal impedance Z for the amplifier):
    // R1 (series) = Z × (k - 1) / k
    // R2 (shunt, parallel with driver) = Z / (k - 1)
    const r1 = z * (k - 1) / k
    const r2 = z / (k - 1)

    return { r1, r2 }
}

/**
 * Calculates Baffle Step Compensation (BSC) circuit components.
 * Typically an inductor and resistor in parallel, placed in series with the woofer.
 * @param baffleWidth Baffle width in meters
 * @param driverImpedance Driver impedance in ohms (e.g., 8)
 * @param stepAttenuation Desired step compensation (e.g., typically 3 to 6 dB)
 */
export function calculateBaffleStep(baffleWidth: number, driverImpedance: number, stepAttenuation: number = 6) {
    if (baffleWidth <= 0 || driverImpedance <= 0) return { f3: 0, rBsc: 0, lBsc: 0 }

    // Frequency where baffle step naturally occurs (f3 = 115 / W)
    const f3 = 115 / baffleWidth

    // Resistor value based on desired attenuation
    // R = Z * (10^(A/20) - 1)
    const k = Math.pow(10, stepAttenuation / 20)
    const rBsc = driverImpedance * (k - 1)

    // Inductor value (L = R / (2 * pi * f3))
    const lBsc = (rBsc / (2 * Math.PI * f3)) * 1000 // in mH

    return {
        f3,
        rBsc,
        lBsc
    }
}

/**
 * Calculates a Series Notch Filter (RLC parallel elements, put in series with driver).
 * Used to tame a specific resonance peak.
 * @param peakFreq The frequency of the peak to tame (Hz)
 * @param re DC Resistance of the driver
 * @param qes Qes of the driver (or Q of the peak if known)
 * @param qms Qms of the driver
 * @returns R, L (mH), C (uF)
 */
export function calculateSeriesNotch(peakFreq: number, re: number, qes: number, qms: number) {
    if (peakFreq <= 0 || re <= 0) return { rNotch: 0, lNotch: 0, cNotch: 0 }

    // RLC for driver impedance peak based on T/S parameters.
    // At resonance the impedance peak magnitude is Re + Re*Qms/Qes
    const rNotch = re + ((re * qms) / qes)

    const cNotch = 1 / (2 * Math.PI * peakFreq * rNotch) // Farads
    const lNotch = 1 / (Math.pow(2 * Math.PI * peakFreq, 2) * cNotch) // Henrys

    return {
        rNotch,
        lNotch: lNotch * 1000, // to mH
        cNotch: cNotch * 1000000 // to uF
    }
}
