/**
 * Room Acoustics Calculations
 * Room modes, RT60 estimation, Schroeder frequency, and speaker placement.
 */

export interface RoomMode {
    frequency: number
    type: 'axial' | 'tangential' | 'oblique'
    nx: number
    ny: number
    nz: number
    dimension: string
}

export interface RoomAcousticsResult {
    modes: RoomMode[]
    schroederFrequency: number
    estimatedRT60: number
    recommendedListeningX: number
    recommendedListeningY: number
    recommendedSpeakerX: number
    recommendedSpeakerY: number
}

const SPEED_OF_SOUND = 343 // m/s

/**
 * Calculate room modes up to maxFreq.
 * f(nx,ny,nz) = (c/2) * sqrt((nx/L)² + (ny/W)² + (nz/H)²)
 */
export function calculateRoomModes(
    length: number,
    width: number,
    height: number,
    maxFreq: number = 300
): RoomMode[] {
    if (length <= 0 || width <= 0 || height <= 0) return []

    const modes: RoomMode[] = []
    const maxN = 8

    for (let nx = 0; nx <= maxN; nx++) {
        for (let ny = 0; ny <= maxN; ny++) {
            for (let nz = 0; nz <= maxN; nz++) {
                if (nx === 0 && ny === 0 && nz === 0) continue

                const freq = (SPEED_OF_SOUND / 2) * Math.sqrt(
                    Math.pow(nx / length, 2) +
                    Math.pow(ny / width, 2) +
                    Math.pow(nz / height, 2)
                )

                if (freq > maxFreq) continue

                const nonZero = (nx > 0 ? 1 : 0) + (ny > 0 ? 1 : 0) + (nz > 0 ? 1 : 0)
                let type: 'axial' | 'tangential' | 'oblique' = 'oblique'
                let dimension = ''

                if (nonZero === 1) {
                    type = 'axial'
                    if (nx > 0) dimension = `אורך (${nx})`
                    else if (ny > 0) dimension = `רוחב (${ny})`
                    else dimension = `גובה (${nz})`
                } else if (nonZero === 2) {
                    type = 'tangential'
                    dimension = `${nx > 0 ? 'L' : ''}${ny > 0 ? 'W' : ''}${nz > 0 ? 'H' : ''}`
                } else {
                    dimension = 'LWH'
                }

                modes.push({ frequency: Math.round(freq * 10) / 10, type, nx, ny, nz, dimension })
            }
        }
    }

    return modes.sort((a, b) => a.frequency - b.frequency)
}

/**
 * Estimate RT60 using Sabine's equation.
 * RT60 = 0.161 * V / A
 * Where A is total absorption area. We estimate average absorption coefficient.
 */
export function estimateRT60(
    length: number,
    width: number,
    height: number,
    absorptionCoeff: number = 0.2
): number {
    const volume = length * width * height
    const surfaceArea = 2 * (length * width + length * height + width * height)
    const totalAbsorption = surfaceArea * absorptionCoeff
    if (totalAbsorption <= 0) return 0
    return (0.161 * volume) / totalAbsorption
}

/**
 * Schroeder transition frequency.
 * Below this, room modes dominate. Above this, the room is diffuse.
 * Fs = 2000 * sqrt(RT60 / V)
 */
export function calculateSchroederFrequency(
    rt60: number,
    length: number,
    width: number,
    height: number
): number {
    const volume = length * width * height
    if (volume <= 0 || rt60 <= 0) return 0
    return 2000 * Math.sqrt(rt60 / volume)
}

/**
 * Recommended speaker and listening positions using 38% rule.
 * Speakers at 38% of room length from front wall.
 * Listener at 38% of room length from rear wall (= 62% from front).
 */
export function calculatePlacement(length: number, width: number): {
    speakerFromFront: number
    listenerFromFront: number
    speakerSpacing: number
    toeAngleDeg: number
} {
    const speakerFromFront = length * 0.38
    const listenerFromFront = length * 0.62
    const speakerSpacing = width * 0.55 // slightly less than 60% for nearfield monitors
    const halfSpacing = speakerSpacing / 2
    const dist = listenerFromFront - speakerFromFront
    const toeAngleDeg = Math.atan2(halfSpacing, dist) * (180 / Math.PI)

    return {
        speakerFromFront: Math.round(speakerFromFront * 100) / 100,
        listenerFromFront: Math.round(listenerFromFront * 100) / 100,
        speakerSpacing: Math.round(speakerSpacing * 100) / 100,
        toeAngleDeg: Math.round(toeAngleDeg * 10) / 10
    }
}

/**
 * Full room acoustics analysis.
 */
export function analyzeRoom(
    length: number,
    width: number,
    height: number,
    absorptionCoeff: number = 0.2
): RoomAcousticsResult {
    const modes = calculateRoomModes(length, width, height)
    const rt60 = estimateRT60(length, width, height, absorptionCoeff)
    const schroeder = calculateSchroederFrequency(rt60, length, width, height)
    const placement = calculatePlacement(length, width)

    return {
        modes,
        schroederFrequency: Math.round(schroeder),
        estimatedRT60: Math.round(rt60 * 100) / 100,
        recommendedListeningX: placement.listenerFromFront,
        recommendedListeningY: width / 2,
        recommendedSpeakerX: placement.speakerFromFront,
        recommendedSpeakerY: width / 2
    }
}
