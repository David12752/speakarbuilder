/**
 * Amplifier & Power Calculations
 * Calculates required amplifier power, headroom, damping factor requirements,
 * and provides recommendations based on use case.
 */

export interface AmplifierRecommendation {
    minPowerWatts: number
    recommendedPowerWatts: number
    headroomDb: number
    minImpedanceOhms: number
    dampingFactorMin: number
    classRecommendation: string
    classRecommendationHe: string
    notes: string[]
}

/**
 * Calculate required amplifier power to reach target SPL at a given distance.
 * P = 10^((SPL_target - Sensitivity + 20 * log10(distance)) / 10)
 * 
 * @param targetSPL Target SPL at listening position (dB)
 * @param sensitivity Driver sensitivity (dB/W/m)
 * @param distance Listening distance (meters)
 * @returns Required power in watts
 */
export function calculateRequiredPower(targetSPL: number, sensitivity: number, distance: number): number {
    if (sensitivity <= 0 || distance <= 0) return 0
    const power = Math.pow(10, (targetSPL - sensitivity + 20 * Math.log10(distance)) / 10)
    return Math.max(0, power)
}

/**
 * Calculate SPL at distance given power and sensitivity.
 * SPL = Sensitivity + 10*log10(P) - 20*log10(d)
 */
export function calculateSPLAtDistance(sensitivity: number, powerWatts: number, distance: number): number {
    if (powerWatts <= 0 || distance <= 0) return 0
    return sensitivity + 10 * Math.log10(powerWatts) - 20 * Math.log10(distance)
}

/**
 * Estimate minimum system impedance.
 * For a typical passive crossover system, minimum impedance dips
 * to roughly 70-80% of nominal at the crossover frequency.
 * @param nominalImpedance Nominal impedance (typically 8 or 4 ohms)
 * @returns Estimated minimum impedance
 */
export function estimateMinImpedance(nominalImpedance: number): number {
    // Typical minimum dip for a passive speaker system
    return nominalImpedance * 0.7
}

/**
 * Full amplifier recommendation calculation.
 * @param sensitivity Woofer sensitivity (dB/W/m)
 * @param distance Listening distance (meters)
 * @param nominalImpedance Nominal impedance (ohms)
 * @param maxPower Driver max power handling (watts)
 * @param useCase 'studio' | 'hifi' | 'home_theater'
 */
export function calculateAmplifierRecommendation(
    sensitivity: number,
    distance: number,
    nominalImpedance: number,
    maxPower: number,
    useCase: 'studio' | 'hifi' | 'home_theater' = 'studio'
): AmplifierRecommendation {
    // Target SPL based on use case
    const targetSPL = useCase === 'home_theater' ? 105 : useCase === 'studio' ? 95 : 90

    const minPower = calculateRequiredPower(targetSPL, sensitivity, distance)
    const headroomMultiplier = useCase === 'studio' ? 3 : useCase === 'home_theater' ? 4 : 2
    const recommendedPower = Math.min(minPower * headroomMultiplier, maxPower * 0.8)
    const headroomDb = 10 * Math.log10(headroomMultiplier)

    const minImpedance = estimateMinImpedance(nominalImpedance)
    const dampingFactorMin = useCase === 'studio' ? 200 : 100

    let classRec = 'Class AB'
    let classRecHe = 'Class AB — איכות צליל מעולה'
    if (useCase === 'home_theater') {
        classRec = 'Class D'
        classRecHe = 'Class D — יעילות גבוהה, מתאים לקולנוע ביתי'
    } else if (recommendedPower > 200) {
        classRec = 'Class D / Class H'
        classRecHe = 'Class D/H — יעילות גבוהה להספקים גדולים'
    }

    const notes: string[] = []
    if (minImpedance < 4) {
        notes.push('עכבה מינימלית נמוכה — נדרש מגבר יציב ב-4Ω או פחות')
    }
    if (minPower > maxPower * 0.5) {
        notes.push('ההספק הנדרש קרוב לגבול הדרייבר — שקלו דרייבר בעל רגישות גבוהה יותר')
    }
    if (distance > 3) {
        notes.push('מרחק האזנה גדול — נדרש הספק משמעותי יותר')
    }

    return {
        minPowerWatts: Math.round(minPower * 10) / 10,
        recommendedPowerWatts: Math.round(recommendedPower * 10) / 10,
        headroomDb: Math.round(headroomDb * 10) / 10,
        minImpedanceOhms: Math.round(minImpedance * 10) / 10,
        dampingFactorMin,
        classRecommendation: classRec,
        classRecommendationHe: classRecHe,
        notes
    }
}
