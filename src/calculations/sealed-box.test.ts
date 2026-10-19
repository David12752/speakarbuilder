import { describe, it, expect } from 'vitest'
import { calculateQtc, calculateFc, calculateF3 } from './sealed-box'

describe('sealed-box calculations', () => {
    it('calculates Qtc properly', () => {
        // vas=50, vb=25 => vas/vb + 1 = 2 + 1 = 3
        // sqrt(3) is 1.732
        // qts=0.4 => 0.4 * 1.732 = 0.6928
        expect(calculateQtc(0.4, 50, 25)).toBeCloseTo(0.6928, 4)
    })

    it('calculates Fc properly', () => {
        expect(calculateFc(40, 50, 25)).toBeCloseTo(40 * 1.732, 1)
    })

    it('calculates F3 properly for Butterworth', () => {
        // If Qtc = 0.707 (Butterworth), Fc and F3 should be approx the same
        const f3 = calculateF3(50, 0.707)
        expect(f3).toBeCloseTo(50, 0)
    })

    it('handles invalid inputs gracefully', () => {
        expect(calculateQtc(0.5, 50, 0)).toBe(Infinity)
        expect(calculateFc(40, 50, 0)).toBe(Infinity)
    })
})
