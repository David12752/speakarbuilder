/**
 * Physical Dimensions Calculator
 * Converts internal volume requirements into actual MDF panel dimensions,
 * accounting for wall thickness, bracing, driver displacement, and damping.
 */

export interface BoxDimensions {
    /** Internal dimensions in mm */
    internalWidth: number
    internalHeight: number
    internalDepth: number
    /** External dimensions in mm */
    externalWidth: number
    externalHeight: number
    externalDepth: number
    /** Actual internal volume in liters after all deductions */
    actualInternalVolume: number
}

export interface BracingResult {
    count: number
    type: 'shelf' | 'window' | 'dowel'
    volumeDisplacement: number // liters
    description: string
}

export interface PanelCut {
    name: string
    nameHe: string
    widthMm: number
    heightMm: number
    quantity: number
    angle: number // degrees (90 = straight, 45 = mitre)
}

/**
 * Calculate driver displacement volume (liters).
 * Approximation: cone is roughly a cylinder with the driver's Sd area and ~30mm depth.
 * @param sd Driver surface area in cm²
 * @param depthMm Approximate mounting depth in mm (default 30)
 */
export function calculateDriverDisplacement(sd: number, depthMm: number = 30): number {
    if (sd <= 0) return 0
    const sdM2 = sd / 10000 // cm² to m²
    const depthM = depthMm / 1000
    return sdM2 * depthM * 1000 // to liters
}

/**
 * Calculate bracing recommendations based on box dimensions.
 * Larger panels need more bracing to reduce resonance.
 * @param internalWidth mm
 * @param internalHeight mm
 * @param internalDepth mm
 * @param wallThickness mm
 */
export function calculateBracing(
    internalWidth: number,
    internalHeight: number,
    internalDepth: number,
    wallThickness: number
): BracingResult {
    const maxPanelDimension = Math.max(internalWidth, internalHeight, internalDepth)

    if (maxPanelDimension < 250) {
        return {
            count: 0,
            type: 'dowel',
            volumeDisplacement: 0,
            description: 'תיבה קטנה — לא נדרש חיזוק פנימי'
        }
    }

    if (maxPanelDimension < 400) {
        // One shelf brace
        const braceVolume = (internalWidth * internalDepth * wallThickness) / 1e6 // mm³ to liters
        return {
            count: 1,
            type: 'shelf',
            volumeDisplacement: braceVolume,
            description: 'חיזוק מדף בודד במרכז הגובה'
        }
    }

    // Larger boxes: window braces
    const braceCount = Math.ceil(maxPanelDimension / 250)
    // Window brace volume: perimeter of brace * wallThickness * wallThickness
    const perimeter = 2 * (internalWidth + internalDepth)
    const singleBraceVolume = (perimeter * wallThickness * wallThickness) / 1e6
    const totalBraceVolume = singleBraceVolume * braceCount

    return {
        count: braceCount,
        type: 'window',
        volumeDisplacement: totalBraceVolume,
        description: `${braceCount} חיזוקי חלון (Window Braces) לאורך הגובה`
    }
}

/**
 * Damping material volume recommendation.
 * @param internalVolume in liters
 * @param fillPercent typically 50-75% for sealed, 25-50% for ported
 */
export function calculateDampingVolume(internalVolume: number, fillPercent: number = 50): {
    volumeLiters: number
    weightGrams: number
    material: string
} {
    const volumeLiters = internalVolume * (fillPercent / 100)
    // Polyester fill weighs roughly 15-25 g/L
    const weightGrams = volumeLiters * 20
    return {
        volumeLiters,
        weightGrams,
        material: fillPercent > 60 ? 'צמר גלז / Acoustic Wool' : 'Polyester Fill / דקרון'
    }
}

/**
 * Convert required internal volume (liters) to box dimensions.
 * Uses the golden ratio for aesthetically pleasing proportions.
 * @param targetVolumeLiters Internal volume in liters
 * @param wallThicknessMm Wall thickness in mm (default 18 for standard MDF)
 * @param wooferDiameterInches Woofer diameter for width constraint
 */
export function calculateBoxDimensions(
    targetVolumeLiters: number,
    wallThicknessMm: number = 18,
    wooferDiameterInches: number = 6.5
): BoxDimensions {
    if (targetVolumeLiters <= 0) {
        return {
            internalWidth: 0, internalHeight: 0, internalDepth: 0,
            externalWidth: 0, externalHeight: 0, externalDepth: 0,
            actualInternalVolume: 0
        }
    }

    const volumeMm3 = targetVolumeLiters * 1e6 // liters to mm³

    // Minimum width must accommodate the woofer + margin
    const wooferDiameterMm = wooferDiameterInches * 25.4
    const minInternalWidth = wooferDiameterMm + 30 // 15mm clearance each side

    // Golden ratio proportions: H = 1.618 * W, D ≈ 1.2 * W
    // V = W * H * D = W * 1.618W * 1.2W = 1.9416 * W³
    const goldenW = Math.pow(volumeMm3 / 1.9416, 1 / 3)

    const internalWidth = Math.max(Math.round(goldenW), Math.round(minInternalWidth))
    const internalHeight = Math.round(internalWidth * 1.618)
    // Recalculate depth to hit the target volume
    const internalDepth = Math.round(volumeMm3 / (internalWidth * internalHeight))

    const externalWidth = internalWidth + 2 * wallThicknessMm
    const externalHeight = internalHeight + 2 * wallThicknessMm
    const externalDepth = internalDepth + 2 * wallThicknessMm

    const actualInternalVolume = (internalWidth * internalHeight * internalDepth) / 1e6

    return {
        internalWidth,
        internalHeight,
        internalDepth,
        externalWidth,
        externalHeight,
        externalDepth,
        actualInternalVolume
    }
}

/**
 * Generate cut list for all panels.
 * @param dims BoxDimensions result
 * @param wallThickness in mm
 */
export function generateCutList(dims: BoxDimensions, _wallThickness: number = 18): PanelCut[] {
    return [
        {
            name: 'Front Baffle',
            nameHe: 'פנל קדמי (באפל)',
            widthMm: dims.externalWidth,
            heightMm: dims.externalHeight,
            quantity: 1,
            angle: 90
        },
        {
            name: 'Rear Panel',
            nameHe: 'פנל אחורי',
            widthMm: dims.externalWidth,
            heightMm: dims.externalHeight,
            quantity: 1,
            angle: 90
        },
        {
            name: 'Side Panel',
            nameHe: 'פנל צדדי',
            widthMm: dims.internalDepth,
            heightMm: dims.externalHeight,
            quantity: 2,
            angle: 90
        },
        {
            name: 'Top Panel',
            nameHe: 'פנל עליון',
            widthMm: dims.externalWidth,
            heightMm: dims.internalDepth,
            quantity: 1,
            angle: 90
        },
        {
            name: 'Bottom Panel',
            nameHe: 'פנל תחתון',
            widthMm: dims.externalWidth,
            heightMm: dims.internalDepth,
            quantity: 1,
            angle: 90
        }
    ]
}

/**
 * Calculate how many standard MDF sheets are needed.
 * Standard sheet: 1220mm x 2440mm (4' x 8')
 */
export function calculateSheetCount(cuts: PanelCut[]): {
    totalArea: number
    sheetArea: number
    sheetsNeeded: number
    utilization: number
} {
    const sheetArea = 1220 * 2440 // mm²
    let totalArea = 0
    for (const cut of cuts) {
        totalArea += cut.widthMm * cut.heightMm * cut.quantity
    }
    const sheetsNeeded = Math.ceil(totalArea / (sheetArea * 0.85)) // 85% utilization factor
    const utilization = (totalArea / (sheetsNeeded * sheetArea)) * 100

    return { totalArea, sheetArea, sheetsNeeded, utilization }
}
