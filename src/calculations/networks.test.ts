import { describe, it, expect } from 'vitest'
import { calculateZobel, calculateLPad } from './networks'

describe('network calculations', () => {
    it('calculates Zobel correctly', () => {
        // Re = 6.8 Ohms, Le = 0.5 mH
        // Rz = 6.8
        // Cz = (0.5 * 1000) / (6.8 * 6.8) = 500 / 46.24 = 10.81 uF
        const { rz, czMicrofarads } = calculateZobel(6.8, 0.5)

        expect(rz).toBe(6.8)
        expect(czMicrofarads).toBeCloseTo(10.81, 2)
    })

    it('calculates L-Pad correctly based on formulas', () => {
        // Z = 8 Ohms, 3dB attenuation
        // k = 10^(3/20) = 1.41254
        // Standard audio L-Pad:
        // R1 = Z × (k - 1) / k = 8 × 0.41254 / 1.41254 = 2.336
        // R2 = Z / (k - 1) = 8 / 0.41254 = 19.394
        const { r1, r2 } = calculateLPad(8, 3)

        expect(r1).toBeCloseTo(2.34, 1)
        expect(r2).toBeCloseTo(19.39, 1)
    })

    it('throws on invalid Zobel inputs', () => {
        expect(() => calculateZobel(0, 0.5)).toThrow()
    })
})
