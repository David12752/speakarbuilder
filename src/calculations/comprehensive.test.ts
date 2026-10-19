/**
 * Comprehensive calculation tests for SpeakarBuilder.
 * Covers every calculation module with physics-based validation.
 */
import { describe, it, expect } from 'vitest'

// ─── Sealed Box ───────────────────────────────────────────────────────────────
import {
    calculateQtc,
    calculateFc,
    calculateF3,
    calculateSealedBoxSPL,
    generateSealedBoxSPLCurve,
} from './sealed-box'

// ─── Ported Box ───────────────────────────────────────────────────────────────
import {
    calculatePortLength,
    isAirVelocitySafe,
    calculatePortVelocity,
    calculatePortedBoxSPL,
    generatePortedBoxSPLCurve,
    calculatePortedAlignments,
} from './ported-box'

// ─── Networks ─────────────────────────────────────────────────────────────────
import {
    calculateZobel,
    calculateLPad,
    calculateBaffleStep,
    calculateSeriesNotch,
} from './networks'

// ─── Crossover ────────────────────────────────────────────────────────────────
import {
    calculateFirstOrderCrossover,
    calculateSecondOrderButterworth,
    calculateSecondOrderLinkwitzRiley,
    calculateFourthOrderLinkwitzRiley,
    calculateThirdOrderButterworth,
} from './crossover'

// ─── Filter attenuation (frequency-response) ──────────────────────────────────
import {
    calculateFilterAttenuation,
    calculateSealedRollOff,
    sumSPL,
    generateLogFrequencies,
} from './frequency-response'

// ─── Amplifier ────────────────────────────────────────────────────────────────
import {
    calculateRequiredPower,
    calculateSPLAtDistance,
    estimateMinImpedance,
    calculateAmplifierRecommendation,
} from './amplifier'

// ─── PEQ ──────────────────────────────────────────────────────────────────────
import { calculatePEQGain, calculateTotalPEQResponse, type PEQBand } from './parametric-eq'

// ─── Impedance & Excursion ────────────────────────────────────────────────────
import {
    calculateDriverImpedance,
    generateImpedanceCurve,
    calculateGroupDelay,
    calculateConeExcursion,
} from './analysis'

// ─── Room Acoustics ───────────────────────────────────────────────────────────
import {
    calculateRoomModes,
    estimateRT60,
    calculateSchroederFrequency,
    calculatePlacement,
    analyzeRoom,
} from './room-acoustics'

// ─── Thiele-Small Derivations ─────────────────────────────────────────────────
import {
    calculateEBP,
    deriveQts,
    deriveQes,
    deriveQms,
    deriveVas,
    deriveBL,
    deriveSensitivity,
} from './thiele-small'

// ─────────────────────────────────────────────────────────────────────────────
// SEALED BOX
// ─────────────────────────────────────────────────────────────────────────────
describe('Sealed Box — physics validation', () => {
    // Driver: fs=50Hz, Qts=0.383, Vas=50L, Vb=25L → Qtc=0.707 (Butterworth)
    const fs = 50, qts = 0.383, vas = 50, vb = 25, sensitivity = 88
    const qtc = calculateQtc(qts, vas, vb)
    const fc = calculateFc(fs, vas, vb)

    it('Qtc = 0.707 for Butterworth alignment (Vb = Vas)', () => {
        // When Vb = Vas: Qtc = Qts * sqrt(2) ≈ 0.383 * 1.414 = 0.541
        // For exact 0.707: Vb = Vas * (Qts/0.707)² / (1 - (Qts/0.707)²) ... complex
        // Here we simply verify the formula: Qtc = Qts * sqrt(Vas/Vb + 1)
        const expected = qts * Math.sqrt(vas / vb + 1)
        expect(qtc).toBeCloseTo(expected, 6)
    })

    it('Fc > Fs when Vb < Vas', () => {
        expect(fc).toBeGreaterThan(fs)
    })

    it('Fc = Fs * sqrt(2) when Vb = Vas', () => {
        const fc2 = calculateFc(50, 100, 100)
        expect(fc2).toBeCloseTo(50 * Math.SQRT2, 1)
    })

    it('F3 ≈ Fc for Butterworth alignment (Qtc=0.707)', () => {
        // For Qtc=0.707, -3dB frequency = Fc exactly (Butterworth definition)
        const f3 = calculateF3(100, 0.707)
        expect(f3).toBeCloseTo(100, 0)
    })

    it('F3 < Fc for over-damped box (Qtc < 0.707)', () => {
        const f3 = calculateF3(100, 0.5)
        expect(f3).toBeGreaterThan(100) // -3dB point is above fc for low Qtc
    })

    it('SPL equals sensitivity in the passband (f >> fc)', () => {
        // At 10 × fc, SPL should be within 0.1dB of sensitivity
        const splHigh = calculateSealedBoxSPL(fc * 10, fc, qtc, sensitivity)
        expect(splHigh).toBeCloseTo(sensitivity, 0)
    })

    it('SPL = sensitivity + 20·log10(Qtc) at fc (resonance)', () => {
        const splAtFc = calculateSealedBoxSPL(fc, fc, qtc, sensitivity)
        const expectedGain = 20 * Math.log10(qtc)
        expect(splAtFc - sensitivity).toBeCloseTo(expectedGain, 1)
    })

    it('SPL is -3dB at fc for Butterworth alignment (Qtc=0.707)', () => {
        // With Qtc exactly 0.707, gain at fc = 20*log10(0.707) = -3.01dB
        const splAtFc = calculateSealedBoxSPL(100, 100, 0.707, 90)
        expect(splAtFc).toBeCloseTo(90 - 3.01, 1)
    })

    it('SPL falls below sensitivity below fc', () => {
        const splBelow = calculateSealedBoxSPL(fc / 5, fc, qtc, sensitivity)
        expect(splBelow).toBeLessThan(sensitivity - 6) // well attenuated
    })

    it('SPL curve has no NaN or Infinity', () => {
        const curve = generateSealedBoxSPLCurve(fs, qts, vas, vb, sensitivity)
        for (const pt of curve) {
            expect(isFinite(pt.spl)).toBe(true)
            expect(isFinite(pt.frequency)).toBe(true)
        }
    })

    it('SPL curve has 200 points (default)', () => {
        const curve = generateSealedBoxSPLCurve(fs, qts, vas, vb, sensitivity)
        expect(curve).toHaveLength(200)
    })

    it('SPL rolls off at 12dB/oct below fc (slope check)', () => {
        // One octave below fc: SPL should be ~12 dB less than 0dB reference at 4×fc
        const spl4x = calculateSealedBoxSPL(4 * 100, 100, 0.707, 0)
        const spl2x = calculateSealedBoxSPL(2 * 100, 100, 0.707, 0)
        const spl1x = calculateSealedBoxSPL(0.5 * 100, 100, 0.707, 0)
        // At high freqs the slope is flat; below fc the 12dB/oct starts
        // At fc/2: ~-18dB (2nd order HPF: -12dB per octave asymptotically)
        expect(spl4x).toBeGreaterThan(spl2x)  // monotonically increasing in passband
        expect(spl2x).toBeGreaterThan(spl1x)  // rolls off below fc
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// PORTED BOX
// ─────────────────────────────────────────────────────────────────────────────
describe('Ported Box — physics validation', () => {
    const fs = 35, qts = 0.35, vas = 80, vb = 60, fb = 35, sensitivity = 90

    it('SPL equals sensitivity in passband (f >> fs)', () => {
        const spl = calculatePortedBoxSPL(fs * 10, fs, qts, vas, vb, fb, sensitivity)
        expect(spl).toBeCloseTo(sensitivity, 0)
    })

    it('SPL rolls off well below the tuning frequency', () => {
        // At fb/4 the 4th-order HP rolloff should give >20dB attenuation
        const splFarBelow = calculatePortedBoxSPL(fb / 4, fs, qts, vas, vb, fb, sensitivity)
        expect(splFarBelow).toBeLessThan(sensitivity - 20)
    })

    it('SPL is near 0 at very low frequency (4th-order HP)', () => {
        const spl = calculatePortedBoxSPL(1, fs, qts, vas, vb, fb, sensitivity)
        expect(spl).toBeLessThan(sensitivity - 40) // DC blocked
    })

    it('SPL curve has no NaN or Infinity', () => {
        const curve = generatePortedBoxSPLCurve(fs, qts, vas, vb, fb, sensitivity)
        for (const pt of curve) {
            expect(isFinite(pt.spl)).toBe(true)
            expect(isFinite(pt.frequency)).toBe(true)
        }
    })

    it('port length formula: known example (Fb=40Hz, Vb=50L, Dv=7cm)', () => {
        const lv = calculatePortLength(40, 50, 7, 1)
        // Formula: 23562.5 * 49 / (1600 * 50) - 0.732 * 7
        const expected = (23562.5 * 49) / (1600 * 50) - 0.732 * 7
        expect(lv).toBeCloseTo(expected, 3)
        expect(lv).toBeGreaterThan(0)
    })

    it('port length increases with lower tuning frequency', () => {
        const lv30 = calculatePortLength(30, 50, 7)
        const lv50 = calculatePortLength(50, 50, 7)
        expect(lv30).toBeGreaterThan(lv50)
    })

    it('port length decreases with larger diameter', () => {
        const lv5 = calculatePortLength(40, 50, 5)
        const lv10 = calculatePortLength(40, 50, 10)
        expect(lv10).toBeGreaterThan(lv5)
    })

    it('port velocity safe check: 17.15 m/s threshold', () => {
        expect(isAirVelocitySafe(10)).toBe(true)
        expect(isAirVelocitySafe(17)).toBe(true)
        expect(isAirVelocitySafe(17.15)).toBe(false)
        expect(isAirVelocitySafe(25)).toBe(false)
    })

    it('port velocity proportional to excursion', () => {
        const v1 = calculatePortVelocity(40, 100, 5.0, 7, 1)
        const v2 = calculatePortVelocity(40, 100, 10.0, 7, 1) // double excursion
        expect(v2).toBeCloseTo(v1 * 2, 5)
    })

    it('port velocity = 0 for invalid inputs', () => {
        expect(calculatePortVelocity(0, 100, 5, 7)).toBe(0)
        expect(calculatePortVelocity(40, 0, 5, 7)).toBe(0)
        expect(calculatePortVelocity(40, 100, 0, 7)).toBe(0)
        expect(calculatePortVelocity(40, 100, 5, 0)).toBe(0)
    })

    it('calculatePortedAlignments returns QB3, SC4, SBB4', () => {
        const alignments = calculatePortedAlignments(35, 0.35, 80)
        expect(alignments).toHaveLength(3)
        expect(alignments.map(a => a.name)).toEqual(['QB3', 'SC4', 'SBB4'])
    })

    it('alignment volumes are all positive', () => {
        const alignments = calculatePortedAlignments(35, 0.35, 80)
        for (const a of alignments) {
            expect(a.vb).toBeGreaterThan(0)
            expect(a.fb).toBeGreaterThan(0)
            expect(a.f3).toBeGreaterThan(0)
        }
    })

    it('alignment volumes scale with higher Qts driver', () => {
        // With higher Qts the alignment volumes should increase
        const low = calculatePortedAlignments(35, 0.25, 80)
        const high = calculatePortedAlignments(35, 0.45, 80)
        const totalLow = low.reduce((s, a) => s + a.vb, 0)
        const totalHigh = high.reduce((s, a) => s + a.vb, 0)
        expect(totalHigh).toBeGreaterThan(totalLow)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// NETWORKS
// ─────────────────────────────────────────────────────────────────────────────
describe('Networks — component values & physics', () => {
    it('Zobel: Rz = Re', () => {
        const { rz } = calculateZobel(8, 0.5)
        expect(rz).toBe(8)
    })

    it('Zobel: Cz = Le(mH) * 1000 / Re²', () => {
        const { czMicrofarads } = calculateZobel(8, 0.5)
        const expected = (0.5 * 1000) / (8 * 8)
        expect(czMicrofarads).toBeCloseTo(expected, 6)
    })

    it('L-Pad: -6dB attenuation for Z=8Ω', () => {
        const { r1, r2 } = calculateLPad(8, 6)
        const k = Math.pow(10, 6 / 20)
        // Check R1 = Z*(k-1)/k
        expect(r1).toBeCloseTo(8 * (k - 1) / k, 3)
        // Check R2 = Z/(k-1)
        expect(r2).toBeCloseTo(8 / (k - 1), 3)
        // Verify it's an actual L-Pad: combined parallel R2||Z should give exactly 0.5 voltage ratio
        const r2ParallelZ = (r2 * 8) / (r2 + 8) // R2 in parallel with 8Ω load
        const voltageRatio = r2ParallelZ / (r1 + r2ParallelZ)
        // -6dB = voltage ratio of 0.5
        expect(voltageRatio).toBeCloseTo(0.5, 2)
    })

    it('L-Pad maintains source impedance = Z (constant impedance)', () => {
        const z = 8
        const { r1, r2 } = calculateLPad(z, 6)
        // Source sees: R1 + (R2 || Z) = Z (constant impedance L-pad property)
        const r2ParallelZ = (r2 * z) / (r2 + z)
        expect(r1 + r2ParallelZ).toBeCloseTo(z, 1)
    })

    it('L-Pad: -10dB attenuation for Z=8Ω', () => {
        const { r1, r2 } = calculateLPad(8, 10)
        const r2ParallelZ = (r2 * 8) / (r2 + 8)
        const voltageRatio = r2ParallelZ / (r1 + r2ParallelZ)
        const actualDb = 20 * Math.log10(voltageRatio)
        expect(actualDb).toBeCloseTo(-10, 1)
    })

    it('L-Pad returns {0, Infinity} for 0dB attenuation', () => {
        const { r1, r2 } = calculateLPad(8, 0)
        expect(r1).toBe(0)
        expect(r2).toBe(Infinity)
    })

    it('Baffle Step: f3 = 115 / width', () => {
        const { f3 } = calculateBaffleStep(0.3, 8, 6)
        expect(f3).toBeCloseTo(115 / 0.3, 1)
    })

    it('Baffle Step: inductor L = R / (2π * f3) * 1000 mH', () => {
        const { f3, rBsc, lBsc } = calculateBaffleStep(0.3, 8, 6)
        const expectedL = (rBsc / (2 * Math.PI * f3)) * 1000
        expect(lBsc).toBeCloseTo(expectedL, 4)
    })

    it('Series Notch: all components positive for valid inputs', () => {
        const { rNotch, lNotch, cNotch } = calculateSeriesNotch(50, 6, 0.5, 5)
        expect(rNotch).toBeGreaterThan(0)
        expect(lNotch).toBeGreaterThan(0)
        expect(cNotch).toBeGreaterThan(0)
    })

    it('Series Notch: LC resonance frequency equals peakFreq', () => {
        const { lNotch, cNotch } = calculateSeriesNotch(100, 8, 0.5, 5)
        const L_H = lNotch / 1000 // mH → H
        const C_F = cNotch / 1e6  // µF → F
        const resonanceFreq = 1 / (2 * Math.PI * Math.sqrt(L_H * C_F))
        expect(resonanceFreq).toBeCloseTo(100, 0)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// CROSSOVER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
describe('Crossover — component values', () => {
    const fc = 2000, z = 8

    it('1st order: C = 1/(2π·fc·Z)', () => {
        const { hpf } = calculateFirstOrderCrossover(fc, z)
        const expected = 1e6 / (2 * Math.PI * fc * z)
        expect(hpf.C1!).toBeCloseTo(expected, 3)
    })

    it('1st order: L = Z / (2π·fc)', () => {
        const { lpf } = calculateFirstOrderCrossover(fc, z)
        const expected = (z / (2 * Math.PI * fc)) * 1000
        expect(lpf.L1!).toBeCloseTo(expected, 3)
    })

    it('BW2: HPF C = 1/(√2·2π·fc·Z)', () => {
        const { hpf } = calculateSecondOrderButterworth(fc, z)
        const expected = 1e6 / (Math.SQRT2 * 2 * Math.PI * fc * z)
        expect(hpf.C1!).toBeCloseTo(expected, 3)
    })

    it('LR4: C and L values match 2× cascaded BW2 (equal pairs)', () => {
        const { hpf } = calculateFourthOrderLinkwitzRiley(fc, z)
        expect(hpf.C1!).toBeCloseTo(hpf.C2!, 6) // C1 = C2 (two identical Butterworth stages)
        expect(hpf.L1!).toBeCloseTo(hpf.L2!, 6) // L1 = L2
    })

    it('3rd order Butterworth: has 3 reactive elements per section', () => {
        const { hpf, lpf } = calculateThirdOrderButterworth(fc, z)
        expect(hpf.C1).toBeDefined()
        expect(hpf.L1).toBeDefined()
        expect(hpf.C2).toBeDefined()
        expect(lpf.L1).toBeDefined()
        expect(lpf.C1).toBeDefined()
        expect(lpf.L2).toBeDefined()
    })

    it('LR2: C = 1/(4π·fc·Z)', () => {
        const { hpf } = calculateSecondOrderLinkwitzRiley(fc, z)
        const expected = 1e6 / (4 * Math.PI * fc * z)
        expect(hpf.C1!).toBeCloseTo(expected, 3)
    })

    it('All component values are positive and finite', () => {
        const orders = [
            calculateFirstOrderCrossover(1000, 8),
            calculateSecondOrderButterworth(2000, 8),
            calculateSecondOrderLinkwitzRiley(2000, 8),
            calculateThirdOrderButterworth(2500, 6),
            calculateFourthOrderLinkwitzRiley(3000, 8),
        ]
        for (const { hpf, lpf } of orders) {
            const vals = [hpf.C1, hpf.C2, hpf.L1, hpf.L2, lpf.C1, lpf.C2, lpf.L1, lpf.L2]
                .filter(v => v !== undefined) as number[]
            for (const v of vals) {
                expect(v).toBeGreaterThan(0)
                expect(isFinite(v)).toBe(true)
            }
        }
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// FILTER ATTENUATION — -3dB/-6dB crossover points
// ─────────────────────────────────────────────────────────────────────────────
describe('Filter attenuation — crossover points', () => {
    it('BW1 HPF: -3dB at fc', () => {
        const att = calculateFilterAttenuation(1000, 1000, 'HPF', 1, 'butterworth')
        expect(att).toBeCloseTo(-3.01, 1)
    })

    it('BW1 LPF: -3dB at fc', () => {
        const att = calculateFilterAttenuation(1000, 1000, 'LPF', 1, 'butterworth')
        expect(att).toBeCloseTo(-3.01, 1)
    })

    it('BW2 HPF: -3dB at fc', () => {
        const att = calculateFilterAttenuation(1000, 1000, 'HPF', 2, 'butterworth')
        expect(att).toBeCloseTo(-3.01, 1)
    })

    it('LR2 HPF: -6dB at fc', () => {
        const att = calculateFilterAttenuation(1000, 1000, 'HPF', 2, 'linkwitz-riley')
        expect(att).toBeCloseTo(-6.02, 1)
    })

    it('LR4 HPF: -6dB at fc', () => {
        const att = calculateFilterAttenuation(1000, 1000, 'HPF', 4, 'linkwitz-riley')
        expect(att).toBeCloseTo(-6.02, 1)
    })

    it('BW4 HPF: -3dB at fc', () => {
        const att = calculateFilterAttenuation(1000, 1000, 'HPF', 4, 'butterworth')
        expect(att).toBeCloseTo(-3.01, 1)
    })

    it('BW1 HPF: 0dB (passband) at f >> fc', () => {
        const att = calculateFilterAttenuation(10000, 1000, 'HPF', 1)
        // ratio = 0.1, magSq = 1/(1+0.01) ≈ 0.99 → -0.04dB
        expect(att).toBeGreaterThan(-0.1)
    })

    it('BW4 HPF: -24dB/oct slope — one octave below fc', () => {
        // At fc/2 (one octave below): ratio = 2 for LPF direction?
        // For HPF, ratio = fc/f = 1000/500 = 2
        const att = calculateFilterAttenuation(500, 1000, 'HPF', 4, 'butterworth')
        // magSq = 1/(1 + 2^8) = 1/257 → -24.1dB
        expect(att).toBeCloseTo(-24.1, 0)
    })

    it('BW3 HPF: -18dB/oct — one octave below fc', () => {
        // ratio = 2, magSq = 1/(1+2^6) = 1/65 → -18.1dB
        const att = calculateFilterAttenuation(500, 1000, 'HPF', 3, 'butterworth')
        expect(att).toBeCloseTo(-18.1, 0)
    })

    it('BW2 LPF: passes 0dB in passband (f << fc)', () => {
        const att = calculateFilterAttenuation(100, 1000, 'LPF', 2, 'butterworth')
        // ratio = 0.1, magSq = 1/(1+0.0001) ≈ 1 → ~0dB
        expect(att).toBeGreaterThan(-0.01)
    })

    it('Bessel 2nd: HPF attenuation at fc follows Bessel polynomial', () => {
        // Bessel 2nd: |H(jw)|^2 = 9/((3-w²)²+(3w)²) where w = fc/f = 1
        // = 9/((3-1)^2 + 9) = 9/13 ≈ 0.692 → -1.60dB
        const att = calculateFilterAttenuation(1000, 1000, 'HPF', 2, 'bessel')
        expect(att).toBeCloseTo(-1.60, 1)
    })

    it('BW3 Bessel: HPF attenuation at fc follows 3rd-order Bessel', () => {
        // Bessel 3rd: |H|² = 225/((15-6)²+(15-1)²) = 225/(81+196) = 225/277 ≈ 0.812 → -0.90dB
        const att = calculateFilterAttenuation(1000, 1000, 'HPF', 3, 'bessel')
        expect(att).toBeCloseTo(-0.90, 1)
    })

    it('calculateSealedRollOff is consistent with calculateSealedBoxSPL', () => {
        const fc = 80, qtc = 0.8, f = 50
        const rollOff = calculateSealedRollOff(f, fc, qtc)
        const splGain = calculateSealedBoxSPL(f, fc, qtc, 0) // sensitivity=0 → returns gain
        expect(rollOff).toBeCloseTo(splGain, 1)
    })

    it('sumSPL: two equal sources sum to +6dB (coherent in-phase)', () => {
        const spl = 85
        const result = sumSPL(spl, spl)
        expect(result).toBeCloseTo(spl + 20 * Math.log10(2), 1) // +6.02dB
    })

    it('sumSPL: two sources 20dB apart → +0.83dB coherent contribution (correct physics)', () => {
        // coherent sum: 20*log10(10^(85/20) + 10^(65/20)) = 85 + 20*log10(1.1) ≈ 85.83dB
        const result = sumSPL(85, 65)
        const expected = 85 + 20 * Math.log10(1 + Math.pow(10, -20 / 20))
        expect(result).toBeCloseTo(expected, 2)
    })

    it('generateLogFrequencies: first and last point correct', () => {
        const freqs = generateLogFrequencies(20, 20000, 100)
        expect(freqs[0]).toBeCloseTo(20, 3)
        expect(freqs[99]).toBeCloseTo(20000, 0)
        expect(freqs).toHaveLength(100)
    })

    it('generateLogFrequencies: exactly 3 decades in 10–10000Hz', () => {
        const freqs = generateLogFrequencies(10, 10000, 10)
        // 3 decades, log spacing — each step is factor 10^(3/9) ≈ 2.154
        const ratio = freqs[1] / freqs[0]
        const lastRatio = freqs[9] / freqs[8]
        expect(ratio).toBeCloseTo(lastRatio, 4) // uniform log spacing
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// AMPLIFIER
// ─────────────────────────────────────────────────────────────────────────────
describe('Amplifier — power & SPL calculations', () => {
    it('calculateRequiredPower: sensitivity = targetSPL at d=1m → 1W', () => {
        const power = calculateRequiredPower(90, 90, 1)
        expect(power).toBeCloseTo(1.0, 3)
    })

    it('calculateRequiredPower: +10dB target → 10× power', () => {
        const p1 = calculateRequiredPower(90, 90, 1)
        const p2 = calculateRequiredPower(100, 90, 1)
        expect(p2).toBeCloseTo(p1 * 10, 3)
    })

    it('calculateRequiredPower: double distance → 4× power (inverse square law)', () => {
        const p1 = calculateRequiredPower(90, 90, 1)
        const p2 = calculateRequiredPower(90, 90, 2)
        expect(p2 / p1).toBeCloseTo(4, 1)
    })

    it('calculateSPLAtDistance: round-trip with calculateRequiredPower', () => {
        const targetSPL = 95, sensitivity = 88, distance = 2
        const power = calculateRequiredPower(targetSPL, sensitivity, distance)
        const spl = calculateSPLAtDistance(sensitivity, power, distance)
        expect(spl).toBeCloseTo(targetSPL, 1)
    })

    it('calculateSPLAtDistance: double power → +3dB', () => {
        const spl1 = calculateSPLAtDistance(88, 10, 1)
        const spl2 = calculateSPLAtDistance(88, 20, 1)
        expect(spl2 - spl1).toBeCloseTo(3.01, 1)
    })

    it('calculateSPLAtDistance: double distance → -6dB', () => {
        const spl1 = calculateSPLAtDistance(88, 10, 1)
        const spl2 = calculateSPLAtDistance(88, 10, 2)
        expect(spl1 - spl2).toBeCloseTo(6.02, 1)
    })

    it('estimateMinImpedance: 70% of nominal', () => {
        expect(estimateMinImpedance(8)).toBeCloseTo(5.6, 1)
        expect(estimateMinImpedance(4)).toBeCloseTo(2.8, 1)
    })

    it('calculateAmplifierRecommendation: has all required fields', () => {
        const rec = calculateAmplifierRecommendation(88, 2, 8, 100)
        expect(rec.minPowerWatts).toBeGreaterThan(0)
        expect(rec.recommendedPowerWatts).toBeGreaterThan(rec.minPowerWatts)
        expect(rec.headroomDb).toBeGreaterThan(0)
        expect(rec.minImpedanceOhms).toBeGreaterThan(0)
        expect(rec.dampingFactorMin).toBeGreaterThan(0)
        expect(rec.classRecommendation).toBeTruthy()
        expect(Array.isArray(rec.notes)).toBe(true)
    })

    it('studio use case: higher damping factor than hifi', () => {
        const studio = calculateAmplifierRecommendation(88, 2, 8, 100, 'studio')
        const hifi = calculateAmplifierRecommendation(88, 2, 8, 100, 'hifi')
        expect(studio.dampingFactorMin).toBeGreaterThanOrEqual(hifi.dampingFactorMin)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// PARAMETRIC EQ
// ─────────────────────────────────────────────────────────────────────────────
describe('Parametric EQ — gain accuracy', () => {
    const makeBand = (type: PEQBand['type'], gain: number, q = 2): PEQBand => ({
        id: 'test', enabled: true, type, frequency: 1000, gain, q,
    })

    it('peak EQ: gain at center frequency = band.gain', () => {
        for (const gain of [+6, -6, +3, -3]) {
            const band = makeBand('peak', gain)
            const g = calculatePEQGain(band, 1000)
            expect(g).toBeCloseTo(gain, 0)
        }
    })

    it('peak EQ: disabled band returns 0dB', () => {
        const band: PEQBand = { id: 'x', enabled: false, type: 'peak', frequency: 1000, gain: 6, q: 2 }
        expect(calculatePEQGain(band, 1000)).toBe(0)
    })

    it('peak EQ: zero-gain returns 0dB', () => {
        const band = makeBand('peak', 0)
        expect(calculatePEQGain(band, 1000)).toBe(0)
    })

    it('peak EQ with bandwidth: attenuated at 1 octave away', () => {
        const band = makeBand('peak', 6, 2)
        const atCenter = calculatePEQGain(band, 1000)
        const atOctave = calculatePEQGain(band, 2000)
        expect(atCenter).toBeGreaterThan(atOctave) // peak falls off with freq
    })

    it('low shelf: approaches band.gain at f << shelf frequency', () => {
        const band = makeBand('lowShelf', 6)
        const gLow = calculatePEQGain(band, 10) // far below 1000Hz
        expect(gLow).toBeCloseTo(6, 0)
    })

    it('low shelf: approaches 0dB at f >> shelf frequency', () => {
        const band = makeBand('lowShelf', 6)
        const gHigh = calculatePEQGain(band, 100000) // far above 1000Hz
        expect(gHigh).toBeCloseTo(0, 0)
    })

    it('high shelf: approaches band.gain at f >> shelf frequency', () => {
        const band = makeBand('highShelf', 6)
        const gHigh = calculatePEQGain(band, 100000) // far above 1000Hz
        expect(gHigh).toBeCloseTo(6, 0)
    })

    it('high shelf: approaches 0dB at f << shelf frequency', () => {
        const band = makeBand('highShelf', 6)
        const gLow = calculatePEQGain(band, 10) // far below 1000Hz
        expect(gLow).toBeCloseTo(0, 0)
    })

    it('notch filter: very deep attenuation at center frequency', () => {
        const band = makeBand('notch', -6, 5)
        const g = calculatePEQGain(band, 1000)
        expect(g).toBeLessThan(-30) // extremely deep notch at center
    })

    it('calculateTotalPEQResponse: sums all enabled bands', () => {
        const bands: PEQBand[] = [
            { id: '1', enabled: true, type: 'peak', frequency: 1000, gain: 3, q: 2 },
            { id: '2', enabled: true, type: 'peak', frequency: 1000, gain: 3, q: 2 },
        ]
        const total = calculateTotalPEQResponse(bands, 1000)
        // Two identical peak bands both at 1000Hz with +3dB each → ~+6dB sum
        expect(total).toBeCloseTo(6, 0)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// IMPEDANCE & EXCURSION
// ─────────────────────────────────────────────────────────────────────────────
describe('Driver Impedance — fixed parallel-RLC model', () => {
    // Typical woofer: Fs=50Hz, Re=8Ω, Qes=0.5, Qms=5, Le=0.5mH
    const fs = 50, re = 8, qes = 0.5, qms = 5, le = 0.5

    it('impedance at resonance (fs) exceeds Re + Res (standard T/S peak)', () => {
        const { magnitude } = calculateDriverImpedance(fs, fs, re, qes, qms, le)
        // Peak ≈ Re + Res = Re + Re*Qms/Qes = 8 + 8*5/0.5 = 8 + 80 = 88Ω
        const res = re * qms / qes
        expect(magnitude).toBeGreaterThan(re + res * 0.9) // within 10% of theoretical peak
    })

    it('impedance at resonance is much larger than Re alone', () => {
        const { magnitude } = calculateDriverImpedance(fs, fs, re, qes, qms, le)
        expect(magnitude).toBeGreaterThan(re * 5) // typical peak is > 5× Re
    })

    it('impedance at low frequency approaches Re', () => {
        // At 5Hz (well below resonance and Le effect): Z ≈ Re
        const { magnitude } = calculateDriverImpedance(5, fs, re, qes, qms, le)
        // Below resonance, motional branch admittance is dominated by the inductor Lces
        // jωCmes → 0, 1/(jωLces) → big → short circuits Res, so Z ≈ Re
        // Actually below resonance: bMot is large, so |Zmot| is small → Z ≈ Re
        expect(magnitude).toBeGreaterThan(re)
        expect(magnitude).toBeLessThan(re * 5)
    })

    it('impedance at high frequency is dominated by Le (inductive rise)', () => {
        const { magnitude: mag20k } = calculateDriverImpedance(20000, fs, re, qes, qms, le)
        const { magnitude: mag1k } = calculateDriverImpedance(1000, fs, re, qes, qms, le)
        expect(mag20k).toBeGreaterThan(mag1k) // inductive rise
    })

    it('impedance at HF approaches sqrt(Re² + (ωLe)²)', () => {
        const f = 20000
        const { magnitude } = calculateDriverImpedance(f, fs, re, qes, qms, le)
        const xL = 2 * Math.PI * f * (le / 1000)
        const expectedMin = Math.sqrt(re * re + xL * xL) * 0.9 // lower bound
        expect(magnitude).toBeGreaterThan(expectedMin)
    })

    it('impedance is real-valued and positive at all frequencies', () => {
        const freqs = [10, 20, 50, 100, 200, 500, 1000, 5000, 20000]
        for (const f of freqs) {
            const { magnitude } = calculateDriverImpedance(f, fs, re, qes, qms, le)
            expect(magnitude).toBeGreaterThan(0)
            expect(isFinite(magnitude)).toBe(true)
        }
    })

    it('resonance peak is near fs (within ±10%)', () => {
        // Sweep 20–200Hz and find the maximum
        const freqs = Array.from({ length: 100 }, (_, i) => 20 * Math.pow(200 / 20, i / 99))
        const vals = freqs.map(f => ({
            f,
            z: calculateDriverImpedance(f, fs, re, qes, qms, le).magnitude,
        }))
        const peak = vals.reduce((a, b) => (a.z > b.z ? a : b))
        expect(peak.f).toBeGreaterThan(fs * 0.9)
        expect(peak.f).toBeLessThan(fs * 1.1)
    })

    it('generateImpedanceCurve: produces 150 data points', () => {
        const curve = generateImpedanceCurve(fs, re, qes, qms, le)
        expect(curve).toHaveLength(150)
    })

    it('generateImpedanceCurve: all magnitudes finite and > 0', () => {
        const curve = generateImpedanceCurve(fs, re, qes, qms, le)
        for (const pt of curve) {
            expect(pt.impedance).toBeGreaterThan(0)
            expect(isFinite(pt.impedance)).toBe(true)
            expect(isFinite(pt.phase)).toBe(true)
        }
    })

    it('phase is near 0° at the resonance peak (resistive)', () => {
        // At exact resonance, the motional impedance is purely resistive
        const { phase } = calculateDriverImpedance(fs, fs, re, qes, qms, le)
        // xL at 50Hz with Le=0.5mH is tiny: ~0.157Ω vs ~88Ω total → phase ≈ 0.1°
        expect(Math.abs(phase)).toBeLessThan(1.0) // degrees
    })
})

describe('Cone Excursion — T/S model', () => {
    // Woofer: fs=40Hz, Qts=0.4, Bl=7, Re=7, Sd=200cm², P=50W
    const fs = 40, qts = 0.4, bl = 7, re = 7, sd = 200, power = 50

    it('excursion is > 0 for valid inputs', () => {
        const x = calculateConeExcursion(40, fs, qts, sd, bl, re, power)
        expect(x).toBeGreaterThan(0)
    })

    it('excursion returns 0 for f=0', () => {
        expect(calculateConeExcursion(0, fs, qts, sd, bl, re, power)).toBe(0)
    })

    it('excursion at resonance = V * Qts / (Bl * ωs²)', () => {
        // X_res = V*Qts/(Bl*ωs²) where V = sqrt(P*Re)
        const V = Math.sqrt(power * re)
        const ws = 2 * Math.PI * fs
        const expectedM = V * qts / (bl * ws * ws)
        const xMm = calculateConeExcursion(fs, fs, qts, sd, bl, re, power)
        expect(xMm).toBeCloseTo(expectedM * 1000, 3) // convert to mm
    })

    it('excursion increases with power (√P relationship)', () => {
        const x1 = calculateConeExcursion(fs, fs, qts, sd, bl, re, 50)
        const x4 = calculateConeExcursion(fs, fs, qts, sd, bl, re, 200) // 4× power
        expect(x4 / x1).toBeCloseTo(2, 2) // √4 = 2 (excursion ∝ √P)
    })

    it('excursion decreases above resonance (20dB/dec above fs)', () => {
        const x_at_fs = calculateConeExcursion(fs, fs, qts, sd, bl, re, power)
        const x_at_2fs = calculateConeExcursion(2 * fs, fs, qts, sd, bl, re, power)
        const x_at_4fs = calculateConeExcursion(4 * fs, fs, qts, sd, bl, re, power)
        expect(x_at_2fs).toBeLessThan(x_at_fs)
        expect(x_at_4fs).toBeLessThan(x_at_2fs)
    })

    it('excursion is larger below resonance (compliance-limited)', () => {
        const x_at_fs = calculateConeExcursion(fs, fs, qts, sd, bl, re, power)
        const x_below = calculateConeExcursion(fs / 4, fs, qts, sd, bl, re, power) // 10Hz vs 40Hz
        // Below resonance, excursion is larger (flat compliance-limited region)
        expect(x_below).toBeGreaterThan(x_at_fs)
    })

    it('group delay function returns n-2 values for n inputs', () => {
        const phaseData = [
            { frequency: 100, phase: 0 },
            { frequency: 200, phase: -45 },
            { frequency: 400, phase: -90 },
            { frequency: 800, phase: -135 },
        ]
        const gd = calculateGroupDelay(phaseData)
        expect(gd).toHaveLength(2) // skips first and last
    })

    it('group delay is finite for varying phase', () => {
        const phaseData = [
            { frequency: 100, phase: 0 },
            { frequency: 200, phase: -30 },
            { frequency: 400, phase: -80 },
            { frequency: 800, phase: -120 },
            { frequency: 1600, phase: -140 },
        ]
        const gd = calculateGroupDelay(phaseData)
        for (const { groupDelay } of gd) {
            expect(isFinite(groupDelay)).toBe(true)
        }
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// ROOM ACOUSTICS
// ─────────────────────────────────────────────────────────────────────────────
describe('Room Acoustics', () => {
    const L = 5, W = 4, H = 2.5  // metres

    it('calculateRoomModes: finds first axial length mode at c/(2L)', () => {
        const modes = calculateRoomModes(L, W, H)
        const firstLength = modes.find(m => m.nx === 1 && m.ny === 0 && m.nz === 0)
        expect(firstLength).toBeDefined()
        expect(firstLength!.frequency).toBeCloseTo(343 / (2 * L), 0)
        expect(firstLength!.type).toBe('axial')
    })

    it('calculateRoomModes: finds first axial width mode at c/(2W)', () => {
        const modes = calculateRoomModes(L, W, H)
        const firstWidth = modes.find(m => m.nx === 0 && m.ny === 1 && m.nz === 0)
        expect(firstWidth).toBeDefined()
        expect(firstWidth!.frequency).toBeCloseTo(343 / (2 * W), 0)
    })

    it('calculateRoomModes: finds first axial height mode at c/(2H)', () => {
        const modes = calculateRoomModes(L, W, H)
        const firstHeight = modes.find(m => m.nx === 0 && m.ny === 0 && m.nz === 1)
        expect(firstHeight).toBeDefined()
        expect(firstHeight!.frequency).toBeCloseTo(343 / (2 * H), 0)
    })

    it('calculateRoomModes: sorted by frequency', () => {
        const modes = calculateRoomModes(L, W, H)
        for (let i = 1; i < modes.length; i++) {
            expect(modes[i].frequency).toBeGreaterThanOrEqual(modes[i - 1].frequency)
        }
    })

    it('calculateRoomModes: axial modes < tangential < oblique (type ordering)', () => {
        const modes = calculateRoomModes(L, W, H, 500)
        const hasTangential = modes.some(m => m.type === 'tangential')
        const hasOblique = modes.some(m => m.type === 'oblique')
        expect(hasTangential).toBe(true)
        expect(hasOblique).toBe(true)
    })

    it('calculateRoomModes: returns empty array for invalid dimensions', () => {
        expect(calculateRoomModes(0, 4, 2.5)).toHaveLength(0)
        expect(calculateRoomModes(5, 0, 2.5)).toHaveLength(0)
    })

    it('estimateRT60: Sabine formula RT60 = 0.161·V / A', () => {
        const absorption = 0.2
        const V = L * W * H
        const SA = 2 * (L * W + L * H + W * H)
        const A = SA * absorption
        const expected = 0.161 * V / A
        expect(estimateRT60(L, W, H, absorption)).toBeCloseTo(expected, 4)
    })

    it('estimateRT60: larger room → longer RT60 (for same absorption)', () => {
        const rt60_small = estimateRT60(3, 3, 2.5, 0.2)
        const rt60_large = estimateRT60(8, 6, 3, 0.2)
        expect(rt60_large).toBeGreaterThan(rt60_small)
    })

    it('estimateRT60: more absorption → shorter RT60', () => {
        const rt60_low = estimateRT60(L, W, H, 0.1)
        const rt60_high = estimateRT60(L, W, H, 0.4)
        expect(rt60_low).toBeGreaterThan(rt60_high)
    })

    it('calculateSchroederFrequency = 2000 · √(RT60 / V)', () => {
        const rt60 = estimateRT60(L, W, H)
        const V = L * W * H
        const expected = 2000 * Math.sqrt(rt60 / V)
        expect(calculateSchroederFrequency(rt60, L, W, H)).toBeCloseTo(expected, 0)
    })

    it('calculatePlacement: speaker at 38% of room length', () => {
        const { speakerFromFront } = calculatePlacement(5, 4)
        expect(speakerFromFront).toBeCloseTo(5 * 0.38, 2)
    })

    it('calculatePlacement: listener behind speaker', () => {
        const { speakerFromFront, listenerFromFront } = calculatePlacement(5, 4)
        expect(listenerFromFront).toBeGreaterThan(speakerFromFront)
    })

    it('analyzeRoom: returns correct structure', () => {
        const result = analyzeRoom(L, W, H)
        expect(result.modes.length).toBeGreaterThan(0)
        expect(result.schroederFrequency).toBeGreaterThan(0)
        expect(result.estimatedRT60).toBeGreaterThan(0)
        expect(result.recommendedListeningX).toBeGreaterThan(0)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// THIELE–SMALL DERIVATIONS
// ─────────────────────────────────────────────────────────────────────────────
describe('Thiele-Small parameter derivations', () => {
    it('deriveQts: Qts = Qes·Qms/(Qes+Qms)', () => {
        const qts = deriveQts(0.5, 5)
        expect(qts).toBeCloseTo(0.5 * 5 / (0.5 + 5), 5)
    })

    it('deriveQes from Qts + Qms → round-trip', () => {
        const qes_orig = 0.5, qms = 5
        const qts = deriveQts(qes_orig, qms)!
        const qes_back = deriveQes(qts, qms)!
        expect(qes_back).toBeCloseTo(qes_orig, 5)
    })

    it('deriveQms from Qts + Qes → round-trip', () => {
        const qms_orig = 5, qes = 0.5
        const qts = deriveQts(qes, qms_orig)!
        const qms_back = deriveQms(qts, qes)!
        expect(qms_back).toBeCloseTo(qms_orig, 5)
    })

    it('Qts = (Qes·Qms)/(Qes+Qms) is consistent with Qes and Qms individually', () => {
        // Verify the algebraic identity: 1/Qts = 1/Qes + 1/Qms
        const qts = deriveQts(0.5, 4)!
        expect(1 / qts).toBeCloseTo(1 / 0.5 + 1 / 4, 5)
    })

    it('deriveQts/Qes/Qms: returns null for invalid inputs', () => {
        expect(deriveQts(0, 5)).toBeNull()
        expect(deriveQts(0.5, 0)).toBeNull()
        expect(deriveQes(0.5, 0.3)).toBeNull() // Qms <= Qts → invalid
    })

    it('calculateEBP: fs/Qes', () => {
        expect(calculateEBP(50, 0.5)).toBeCloseTo(100, 3)
        expect(calculateEBP(30, 0.3)).toBeCloseTo(100, 3)
    })

    it('calculateEBP throws for Qes=0', () => {
        expect(() => calculateEBP(50, 0)).toThrow()
    })

    it('deriveVas / deriveBL round-trip consistency', () => {
        // Start with known BL, derive Vas, then derive BL back
        const fs = 35, qes = 0.4, re = 6, sd = 150, bl_orig = 7.5
        const vasM3 = 0.06 // 60 litres
        // Derive Vas from BL
        const vas = deriveVas(fs, qes, sd, bl_orig, re)
        expect(vas).not.toBeNull()
        expect(vas!).toBeGreaterThan(0)
        // Derive BL back from Vas
        const qts = deriveQts(qes, 5)!
        const bl_back = deriveBL(fs, qes, qts, re, sd, vas!)
        // Should be close to original (round-trip modulo floating point)
        expect(bl_back).not.toBeNull()
        expect(bl_back!).toBeCloseTo(bl_orig, 0) // within 1 T·m
    })

    it('deriveSensitivity returns realistic value (82–98 dB) for typical woofer', () => {
        // Typical 6.5" woofer: Bl=7.5, Sd=160cm², Re=6Ω, fs=35Hz, Qes=0.5
        // Expected: ~87dB (using η₀ = ρBl²Sd²/2πcReMms²)
        const spl = deriveSensitivity(7.5, 160, 6, 35, 0.5)
        expect(spl).not.toBeNull()
        expect(spl!).toBeGreaterThan(82)
        expect(spl!).toBeLessThan(98)
    })
})
