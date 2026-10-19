export interface CrossoverComponents {
    type: 'HPF' | 'LPF'
    order: 1 | 2 | 3 | 4
    alignment?: string
    C1?: number // Microfarads (µF)
    C2?: number
    C3?: number
    L1?: number // Millihenrys (mH)
    L2?: number
    L3?: number
}

/**
 * Calculates a First Order (6dB/octave) Butterworth crossover network.
 * 
 * @param fc Crossover Frequency (Hz)
 * @param z Impedance of the driver (Ohms)
 */
export function calculateFirstOrderCrossover(fc: number, z: number): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (fc <= 0 || z <= 0) throw new Error('Invalid params')

    // High-Pass: C = 1 / (2π × Fc × Z)
    const cFarads = 1 / (2 * Math.PI * fc * z)
    const cMicrofarads = cFarads * 1_000_000

    // Low-Pass:  L = Z / (2π × Fc)
    const lHenrys = z / (2 * Math.PI * fc)
    const lMillihenrys = lHenrys * 1_000

    return {
        hpf: { type: 'HPF', order: 1, C1: cMicrofarads },
        lpf: { type: 'LPF', order: 1, L1: lMillihenrys }
    }
}

/**
 * Calculates a Second Order (12dB/octave) Linkwitz-Riley crossover network.
 * 
 * @param fc Crossover Frequency (Hz)
 * @param z Impedance of the driver (Ohms)
 */
export function calculateSecondOrderLinkwitzRiley(fc: number, z: number): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (fc <= 0 || z <= 0) throw new Error('Invalid params')

    // High-Pass: C1 = 1/(4π × Fc × Z),  L1 = Z/(π × Fc)
    const hpfCFarads = 1 / (4 * Math.PI * fc * z)
    const hpfC1 = hpfCFarads * 1_000_000

    const hpfLHenrys = z / (Math.PI * fc)
    const hpfL1 = hpfLHenrys * 1_000

    // Low-Pass:  L2 = Z/(π × Fc),       C2 = 1/(4π × Fc × Z)
    const lpfLHenrys = z / (Math.PI * fc)
    const lpfL2 = lpfLHenrys * 1_000

    const lpfCFarads = 1 / (4 * Math.PI * fc * z)
    const lpfC2 = lpfCFarads * 1_000_000

    return {
        hpf: { type: 'HPF', order: 2, C1: hpfC1, L1: hpfL1 },
        lpf: { type: 'LPF', order: 2, L2: lpfL2, C2: lpfC2 }
    }
}

/**
 * Calculates a Second Order (12dB/octave) Butterworth crossover network.
 * 
 * @param fc Crossover Frequency (Hz)
 * @param z Impedance of the driver (Ohms)
 */
export function calculateSecondOrderButterworth(fc: number, z: number): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (fc <= 0 || z <= 0) throw new Error('Invalid params')

    // High-Pass: C1 = 1 / (2 * sqrt(2) * π × Fc × Z), L1 = (sqrt(2) * Z) / (2 * π × Fc)
    const hpfCFarads = 1 / (2 * Math.SQRT2 * Math.PI * fc * z)
    const hpfC1 = hpfCFarads * 1_000_000

    const hpfLHenrys = (Math.SQRT2 * z) / (2 * Math.PI * fc)
    const hpfL1 = hpfLHenrys * 1_000

    // Low-Pass: L2 = (sqrt(2) * Z) / (2 * π × Fc), C2 = 1 / (2 * sqrt(2) * π × Fc × Z)
    const lpfLHenrys = (Math.SQRT2 * z) / (2 * Math.PI * fc)
    const lpfL2 = lpfLHenrys * 1_000

    const lpfCFarads = 1 / (2 * Math.SQRT2 * Math.PI * fc * z)
    const lpfC2 = lpfCFarads * 1_000_000

    return {
        hpf: { type: 'HPF', order: 2, C1: hpfC1, L1: hpfL1 },
        lpf: { type: 'LPF', order: 2, L2: lpfL2, C2: lpfC2 }
    }
}

/**
 * Third Order (18dB/octave) Butterworth crossover.
 * HPF: C1 series, L1 shunt, C2 series
 * LPF: L1 series, C1 shunt, L2 series
 * Normalized prototype values: g1=1, g2=2, g3=1
 */
export function calculateThirdOrderButterworth(fc: number, z: number): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (fc <= 0 || z <= 0) throw new Error('Invalid params')
    const w = 2 * Math.PI * fc

    // 3rd order Butterworth normalized element values: g1=1, g2=2, g3=1
    const g1 = 1, g2 = 2, g3 = 1

    // HPF (dual of LP): C = 1/(g*w*Z), L = Z/(g*w)
    const hpfC1 = (1 / (g1 * w * z)) * 1e6      // µF (series)
    const hpfL1 = (z / (g2 * w)) * 1000          // mH (shunt) — g2=2 makes this half the naive value
    const hpfC2 = (1 / (g3 * w * z)) * 1e6      // µF (series)

    // LPF: L = g*Z/w, C = g/(w*Z)
    const lpfL1 = (g1 * z / w) * 1000             // mH (series)
    const lpfC1 = (g2 / (w * z)) * 1e6           // µF (shunt) — g2=2 doubles this
    const lpfL2 = (g3 * z / w) * 1000             // mH (series)

    return {
        hpf: { type: 'HPF', order: 3, C1: hpfC1, L1: hpfL1, C2: hpfC2 },
        lpf: { type: 'LPF', order: 3, L1: lpfL1, C1: lpfC1, L2: lpfL2 }
    }
}

/**
 * Fourth Order (24dB/octave) Linkwitz-Riley crossover.
 * Passive LR4 ladder network with correct normalized element values.
 * 4th-order Butterworth prototype: g1=0.7654, g2=1.8478, g3=1.8478, g4=0.7654
 * LR4 has squared BW2 transfer function → passive realization uses BW4 prototype
 * scaled so the -6dB point is at fc.
 * HPF: C1, L1, C2, L2 (series-shunt-series-shunt)
 * LPF: L1, C1, L2, C2
 */
export function calculateFourthOrderLinkwitzRiley(fc: number, z: number): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (fc <= 0 || z <= 0) throw new Error('Invalid params')
    const w = 2 * Math.PI * fc

    // 4th-order Butterworth prototype element values (singly-terminated)
    const g1 = 0.7654, g2 = 1.8478, g3 = 1.8478, g4 = 0.7654

    // LPF: L = g*Z/w, C = g/(w*Z)
    const lpfL1 = (g1 * z / w) * 1000
    const lpfC1 = (g2 / (w * z)) * 1e6
    const lpfL2 = (g3 * z / w) * 1000
    const lpfC2 = (g4 / (w * z)) * 1e6

    // HPF (dual): C = 1/(g*w*Z), L = Z/(g*w)
    const hpfC1 = (1 / (g1 * w * z)) * 1e6
    const hpfL1 = (z / (g2 * w)) * 1000
    const hpfC2 = (1 / (g3 * w * z)) * 1e6
    const hpfL2 = (z / (g4 * w)) * 1000

    return {
        hpf: {
            type: 'HPF', order: 4,
            C1: hpfC1,
            L1: hpfL1,
            C2: hpfC2,
            L2: hpfL2
        },
        lpf: {
            type: 'LPF', order: 4,
            L1: lpfL1,
            C1: lpfC1,
            L2: lpfL2,
            C2: lpfC2
        }
    }
}

/**
 * Second Order Bessel crossover (maximally flat group delay).
 * Normalized Bessel 2nd order poles: a1=3, a0=3 → Q=0.5774
 * Component scaling: C = 1/(Q*2*w*Z), L = Q*2*Z/w  ... but using standard Bessel coefficients:
 *   HPF: C1 = 1/(a1 * 2π * fc * Z), L1 = a1 * Z / (2π * fc * a0)   — but for passive LC networks:
 *   Standard 2nd-order Bessel LP prototype: L=1.3617, C=0.4539 (normalized)
 */
export function calculateSecondOrderBessel(fc: number, z: number): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (fc <= 0 || z <= 0) throw new Error('Invalid params')
    const w = 2 * Math.PI * fc

    // Bessel 2nd order normalized element values (Sallen-Key equivalent for passive LC ladder):
    // g1 = 0.5755, g2 = 2.1478  (from Bessel polynomial b2=s²+3s+3, mapped to LC)
    // For LP: L_norm = 0.5755, C_norm = 2.1478
    // Denormalize: L = L_norm * Z / w,  C = C_norm / (w * Z)
    const lpfL1 = (0.5755 * z / w) * 1000 // mH
    const lpfC1 = (2.1478 / (w * z)) * 1e6 // µF

    // HPF is the dual: swap L↔C with impedance/frequency scaling
    const hpfC1 = (1 / (0.5755 * w * z)) * 1e6 // µF
    const hpfL1 = (z / (2.1478 * w)) * 1000 // mH

    return {
        hpf: { type: 'HPF', order: 2, alignment: 'bessel', C1: hpfC1, L1: hpfL1 },
        lpf: { type: 'LPF', order: 2, alignment: 'bessel', L1: lpfL1, C1: lpfC1 }
    }
}

/**
 * Third Order Bessel crossover.
 * 3rd order Bessel normalized: g1=0.3374, g2=0.9705, g3=2.2034
 */
export function calculateThirdOrderBessel(fc: number, z: number): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (fc <= 0 || z <= 0) throw new Error('Invalid params')
    const w = 2 * Math.PI * fc

    // LP: L1-C1-L2 ladder
    const lpfL1 = (0.3374 * z / w) * 1000 // mH
    const lpfC1 = (0.9705 / (w * z)) * 1e6 // µF
    const lpfL2 = (2.2034 * z / w) * 1000 // mH

    // HPF: C1-L1-C2 (dual)
    const hpfC1 = (1 / (0.3374 * w * z)) * 1e6
    const hpfL1 = (z / (0.9705 * w)) * 1000
    const hpfC2 = (1 / (2.2034 * w * z)) * 1e6

    return {
        hpf: { type: 'HPF', order: 3, alignment: 'bessel', C1: hpfC1, L1: hpfL1, C2: hpfC2 },
        lpf: { type: 'LPF', order: 3, alignment: 'bessel', L1: lpfL1, C1: lpfC1, L2: lpfL2 }
    }
}

/**
 * Second Order Chebyshev crossover (0.5 dB ripple).
 * Provides steeper initial roll-off than Butterworth at the cost of passband ripple.
 * 2nd order Cheby 0.5dB: g1=1.4029, g2=0.7071
 */
export function calculateSecondOrderChebyshev(fc: number, z: number, rippleDb: number = 0.5): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (fc <= 0 || z <= 0) throw new Error('Invalid params')
    const w = 2 * Math.PI * fc

    // Chebyshev element values depend on ripple
    // For 0.5dB: g1=1.4029, g2=0.7071
    // For 1.0dB: g1=1.5963, g2=0.8419
    // For 3.0dB: g1=2.0236, g2=0.9941
    let g1: number, g2: number
    if (rippleDb <= 0.5) { g1 = 1.4029; g2 = 0.7071 }
    else if (rippleDb <= 1.0) { g1 = 1.5963; g2 = 0.8419 }
    else { g1 = 2.0236; g2 = 0.9941 }

    // LP: L1(series), C1(shunt)
    const lpfL1 = (g1 * z / w) * 1000 // mH
    const lpfC1 = (g2 / (w * z)) * 1e6 // µF

    // HPF (dual)
    const hpfC1 = (1 / (g1 * w * z)) * 1e6
    const hpfL1 = (z / (g2 * w)) * 1000

    return {
        hpf: { type: 'HPF', order: 2, alignment: 'chebyshev', C1: hpfC1, L1: hpfL1 },
        lpf: { type: 'LPF', order: 2, alignment: 'chebyshev', L1: lpfL1, C1: lpfC1 }
    }
}

/**
 * Third Order Chebyshev crossover (0.5 dB ripple).
 * 3rd order Cheby 0.5dB: g1=1.5963, g2=1.0967, g3=1.5963
 */
export function calculateThirdOrderChebyshev(fc: number, z: number, rippleDb: number = 0.5): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (fc <= 0 || z <= 0) throw new Error('Invalid params')
    const w = 2 * Math.PI * fc

    let g1: number, g2: number, g3: number
    if (rippleDb <= 0.5) { g1 = 1.5963; g2 = 1.0967; g3 = 1.5963 }
    else if (rippleDb <= 1.0) { g1 = 2.0236; g2 = 0.9941; g3 = 2.0236 }
    else { g1 = 3.3487; g2 = 0.7117; g3 = 3.3487 }

    // LP: L1-C1-L2 ladder
    const lpfL1 = (g1 * z / w) * 1000
    const lpfC1 = (g2 / (w * z)) * 1e6
    const lpfL2 = (g3 * z / w) * 1000

    // HPF (dual): C1-L1-C2
    const hpfC1 = (1 / (g1 * w * z)) * 1e6
    const hpfL1 = (z / (g2 * w)) * 1000
    const hpfC2 = (1 / (g3 * w * z)) * 1e6

    return {
        hpf: { type: 'HPF', order: 3, alignment: 'chebyshev', C1: hpfC1, L1: hpfL1, C2: hpfC2 },
        lpf: { type: 'LPF', order: 3, alignment: 'chebyshev', L1: lpfL1, C1: lpfC1, L2: lpfL2 }
    }
}

/**
 * Generic crossover calculation dispatcher.
 * Routes to the appropriate calculation based on order and alignment.
 */
export function calculateCrossover(fc: number, z: number, order: 1 | 2 | 3 | 4, alignment: string): { hpf: CrossoverComponents, lpf: CrossoverComponents } {
    if (order === 1) return calculateFirstOrderCrossover(fc, z)
    if (order === 4) {
        // 4th order only supports Linkwitz-Riley (LR4)
        return calculateFourthOrderLinkwitzRiley(fc, z)
    }

    if (order === 2) {
        switch (alignment) {
            case 'bessel': return calculateSecondOrderBessel(fc, z)
            case 'chebyshev': return calculateSecondOrderChebyshev(fc, z)
            case 'linkwitz-riley': return calculateSecondOrderLinkwitzRiley(fc, z)
            default: return calculateSecondOrderButterworth(fc, z)
        }
    }

    // order === 3
    switch (alignment) {
        case 'bessel': return calculateThirdOrderBessel(fc, z)
        case 'chebyshev': return calculateThirdOrderChebyshev(fc, z)
        default: return calculateThirdOrderButterworth(fc, z)
    }
}
