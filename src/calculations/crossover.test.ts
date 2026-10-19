import { describe, it, expect } from 'vitest'
import { calculateFirstOrderCrossover, calculateSecondOrderLinkwitzRiley } from './crossover'

describe('crossover calculations', () => {
    it('calculates first order Butterworth correctly', () => {
        // Fc = 2000 Hz, Z = 8 Ohms
        // C = 1 / (2 * PI * 2000 * 8) = 9.947 uF
        // L = 8 / (2 * PI * 2000) = 0.636 mH
        const { hpf, lpf } = calculateFirstOrderCrossover(2000, 8)

        expect(hpf.C1).toBeCloseTo(9.947, 2)
        expect(lpf.L1).toBeCloseTo(0.6366, 3)
    })

    it('calculates second order Linkwitz-Riley correctly', () => {
        // Fc = 2000 Hz, Z = 8 Ohms
        // C = 1 / (4 * PI * 2000 * 8) = 4.97 uF
        // L = 8 / (PI * 2000) = 1.27 mH
        const { hpf, lpf } = calculateSecondOrderLinkwitzRiley(2000, 8)

        expect(hpf.C1).toBeCloseTo(4.97, 2)
        expect(hpf.L1).toBeCloseTo(1.27, 2)

        expect(lpf.C2).toBeCloseTo(4.97, 2)
        expect(lpf.L2).toBeCloseTo(1.27, 2)
    })

    it('throws on invalid params', () => {
        expect(() => calculateFirstOrderCrossover(0, 8)).toThrow()
        expect(() => calculateSecondOrderLinkwitzRiley(2000, -1)).toThrow()
    })
})
