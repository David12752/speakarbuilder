import { describe, it, expect } from 'vitest'
import { calculateEBP, evaluateBoxSuitability, calculateOptimalSealedVb } from './thiele-small'

describe('thiele-small calculations', () => {
    it('calculates EBP correctly', () => {
        expect(calculateEBP(40, 0.4)).toBe(100)
        expect(calculateEBP(20, 0.5)).toBe(40)
    })

    it('evaluates box suitability', () => {
        expect(evaluateBoxSuitability(40)).toBe('sealed')
        expect(evaluateBoxSuitability(110)).toBe('ported')
        expect(evaluateBoxSuitability(75)).toBe('both')
    })

    it('calculates optimal sealed Vb', () => {
        // Vas = 50L, Qts = 0.35, target Qtc = 0.707
        // Vb = 50 / ((0.707/0.35)^2 - 1) = 50 / (2.02^2 - 1) = 50 / (4.08 - 1) = 50 / 3.08 = 16.23
        const vb = calculateOptimalSealedVb(50, 0.35, 0.707)
        expect(vb).toBeCloseTo(16.23, 1) // precision 1 decimal place

        // Case where Qts is higher than target Qtc
        expect(calculateOptimalSealedVb(50, 0.8, 0.707)).toBe(Infinity)
    })
})
