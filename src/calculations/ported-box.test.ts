import { describe, it, expect } from 'vitest'
import { calculatePortLength, isAirVelocitySafe } from './ported-box'

describe('ported-box calculations', () => {
    it('calculates Port Length correctly', () => {
        // fb = 40, vb = 50, dv = 7.5
        // Lv = (23562.5 * 7.5^2) / (40^2 * 50) - (0.732 * 7.5)
        // Lv = 1325390.625 / 80000 - 5.49 = 16.567 - 5.49 = 11.077
        const lv = calculatePortLength(40, 50, 7.5)
        expect(lv).toBeCloseTo(11.077, 2)
    })

    it('handles negative port length math properly', () => {
        // A situation where the math produces a negative length — clamp to 0
        // Very high fb, tiny port: numerator small, lv goes negative
        const lv = calculatePortLength(500, 100, 0.5)
        expect(lv).toBe(0)
    })

    it('checks safe air velocity', () => {
        expect(isAirVelocitySafe(15)).toBe(true)
        expect(isAirVelocitySafe(20)).toBe(false)
    })
})
