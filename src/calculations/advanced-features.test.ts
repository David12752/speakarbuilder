import { describe, it, expect } from 'vitest'
import { calculateSecondOrderBessel, calculateThirdOrderBessel, calculateSecondOrderChebyshev, calculateThirdOrderChebyshev, calculateCrossover } from './crossover'
import { parseFRD, parseZMA, estimateTSFromMeasurement } from './frd-zma-import'
import { calculateBandpass } from './bandpass'
import { calculatePassiveRadiator } from './passive-radiator'
import { calculateOffAxisAttenuation, estimateBeamwidth, calculateDirectivityIndex } from './off-axis'

describe('Bessel crossover', () => {
    it('calculates 2nd order Bessel', () => {
        const result = calculateSecondOrderBessel(2500, 8)
        expect(result.hpf.C1).toBeGreaterThan(0)
        expect(result.hpf.L1).toBeGreaterThan(0)
        expect(result.lpf.L1).toBeGreaterThan(0)
        expect(result.lpf.C1).toBeGreaterThan(0)
        expect(result.hpf.alignment).toBe('bessel')
    })

    it('calculates 3rd order Bessel', () => {
        const result = calculateThirdOrderBessel(3000, 6)
        expect(result.hpf.C1).toBeGreaterThan(0)
        expect(result.hpf.L1).toBeGreaterThan(0)
        expect(result.hpf.C2).toBeGreaterThan(0)
        expect(result.lpf.L1).toBeGreaterThan(0)
        expect(result.lpf.C1).toBeGreaterThan(0)
        expect(result.lpf.L2).toBeGreaterThan(0)
    })
})

describe('Chebyshev crossover', () => {
    it('calculates 2nd order Chebyshev', () => {
        const result = calculateSecondOrderChebyshev(2000, 8, 0.5)
        expect(result.hpf.C1).toBeGreaterThan(0)
        expect(result.lpf.L1).toBeGreaterThan(0)
        expect(result.hpf.alignment).toBe('chebyshev')
    })

    it('calculates 3rd order Chebyshev with different ripple', () => {
        const r05 = calculateThirdOrderChebyshev(2000, 8, 0.5)
        const r10 = calculateThirdOrderChebyshev(2000, 8, 1.0)
        // Higher ripple -> different component values
        expect(r05.lpf.L1).not.toBe(r10.lpf.L1)
    })
})

describe('crossover dispatcher', () => {
    it('dispatches bessel 2nd order', () => {
        const result = calculateCrossover(2500, 8, 2, 'bessel')
        expect(result.hpf.alignment).toBe('bessel')
    })

    it('dispatches chebyshev 3rd order', () => {
        const result = calculateCrossover(2500, 8, 3, 'chebyshev')
        expect(result.hpf.alignment).toBe('chebyshev')
    })

    it('dispatches LR4 for 4th order regardless of alignment', () => {
        const result = calculateCrossover(2500, 8, 4, 'bessel')
        expect(result.hpf.order).toBe(4)
    })
})

describe('FRD/ZMA import', () => {
    it('parses FRD content', () => {
        const content = `* Test FRD file
20 75.5 -45
100 85.0 -10
1000 88.2 5
5000 87.0 30
10000 82.5 60
20000 70.0 90`
        const result = parseFRD(content, 'test.frd')
        expect(result.success).toBe(true)
        expect(result.data.length).toBe(6)
        expect(result.data[0].frequency).toBe(20)
        expect(result.data[0].spl).toBe(75.5)
        expect(result.estimatedSensitivity).toBeGreaterThan(80) // 1000Hz is in midband
    })

    it('handles malformed FRD gracefully', () => {
        const result = parseFRD('no valid data here\nnothing')
        expect(result.success).toBe(false)
    })

    it('parses ZMA content', () => {
        const content = `; Test ZMA
20 15.0 30
40 45.0 60
50 8.5 -10
100 7.5 5
1000 8.0 10
10000 20.0 50`
        const result = parseZMA(content, 'test.zma')
        expect(result.success).toBe(true)
        expect(result.data.length).toBe(6)
        expect(result.estimatedFs).toBeGreaterThan(30)
        expect(result.estimatedRe).toBeGreaterThan(0)
    })

    it('estimates T/S params from ZMA impedance curve', () => {
        // Simulate a typical impedance curve with peak at Fs
        const zma = []
        for (let f = 10; f <= 1000; f += 2) {
            // Simple peak model: Z = Re + Rpeak * bell_curve
            const re = 6.5
            const fsPeak = 45
            const sigma = 15
            const peak = 50 * Math.exp(-((f - fsPeak) ** 2) / (2 * sigma * sigma))
            zma.push({ frequency: f, impedance: re + peak, phase: 0 })
        }
        const ts = estimateTSFromMeasurement(zma)
        expect(ts).not.toBeNull()
        expect(ts!.fs).toBeGreaterThan(30)
        expect(ts!.fs).toBeLessThan(60)
        expect(ts!.re).toBeGreaterThan(5)
        expect(ts!.qts).toBeGreaterThan(0)
    })
})

describe('bandpass enclosure', () => {
    it('calculates 4th-order bandpass', () => {
        const result = calculateBandpass(35, 0.4, 50, 220, 5)
        expect(result.sealedVolume).toBeGreaterThan(0)
        expect(result.portedVolume).toBeGreaterThan(0)
        expect(result.portTuningHz).toBeGreaterThan(0)
        expect(result.f3Low).toBeLessThan(result.f3High)
        expect(result.bandwidthOctaves).toBeGreaterThan(0)
    })

    it('returns zeros for invalid input', () => {
        const result = calculateBandpass(0, 0.4, 50, 220, 5)
        expect(result.sealedVolume).toBe(0)
    })
})

describe('passive radiator', () => {
    it('calculates PR enclosure', () => {
        const result = calculatePassiveRadiator(
            38, 0.4, 50, 220, 5,
            { fsPr: 20, mmsPr: 80, vasPr: 50, sdPr: 220, qmsPr: 5 }
        )
        expect(result.boxVolume).toBeGreaterThan(0)
        expect(result.tuningFrequency).toBeGreaterThan(0)
        expect(result.tuningFrequency).toBeLessThan(result.tuningFrequency + 1) // sanity
        expect(result.sdAdequate).toBe(true)
    })

    it('warns about inadequate PR Sd', () => {
        const result = calculatePassiveRadiator(
            38, 0.4, 50, 220, 5,
            { fsPr: 20, mmsPr: 80, vasPr: 50, sdPr: 100, qmsPr: 5 } // sdPr < sd
        )
        expect(result.sdAdequate).toBe(false)
        expect(result.recommendedCount).toBeGreaterThan(1)
    })
})

describe('off-axis response', () => {
    it('returns 0 dB on-axis', () => {
        expect(calculateOffAxisAttenuation(0, 1000, 6.5)).toBe(0)
    })

    it('returns negative dB off-axis at high frequency', () => {
        const atten = calculateOffAxisAttenuation(30, 5000, 8)
        expect(atten).toBeLessThan(0)
    })

    it('has more attenuation at higher frequencies', () => {
        const atten1k = calculateOffAxisAttenuation(30, 1000, 6.5)
        const atten10k = calculateOffAxisAttenuation(30, 10000, 6.5)
        expect(atten10k).toBeLessThan(atten1k)
    })

    it('estimates beamwidth narrows with frequency', () => {
        const bw1k = estimateBeamwidth(1000, 6.5)
        const bw10k = estimateBeamwidth(10000, 6.5)
        expect(bw10k).toBeLessThan(bw1k)
    })

    it('calculates directivity index', () => {
        const di = calculateDirectivityIndex(1000, 6.5)
        expect(di).toBeGreaterThanOrEqual(0)
        const diHF = calculateDirectivityIndex(10000, 6.5)
        expect(diHF).toBeGreaterThan(di) // narrower beam = higher DI
    })
})
