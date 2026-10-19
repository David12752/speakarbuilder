import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { useProjectStore } from '@/store/projectStore'
import { calculateBoxDimensions, generateCutList, calculateSheetCount } from '@/calculations/physical-dimensions'
import { motion } from 'framer-motion'
import { Scissors } from 'lucide-react'
import { AnimatedStep, StepHeader, StepBody, GlowStat } from '@/components/shared/StepWrapper'

const SHEET_WIDTH = 122 // cm
const SHEET_HEIGHT = 244 // cm

interface CutPiece {
    name: string
    width: number
    height: number
    x: number
    y: number
    color: string
}

function layoutPiecesOnSheet(pieces: Array<{ name: string; widthCm: number; heightCm: number }>): CutPiece[] {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    const result: CutPiece[] = []
    let currentY = 0
    let currentX = 0
    let rowHeight = 0

    pieces.forEach((piece, i) => {
        const w = piece.widthCm
        const h = piece.heightCm

        if (currentX + w > SHEET_WIDTH) {
            currentX = 0
            currentY += rowHeight + 1 // 1cm kerf
            rowHeight = 0
        }

        if (currentY + h > SHEET_HEIGHT) {
            // overflow — still place but mark
            currentX = 0
            currentY = 0
            rowHeight = 0
        }

        result.push({
            name: piece.name,
            width: w,
            height: h,
            x: currentX,
            y: currentY,
            color: colors[i % colors.length]
        })

        currentX += w + 0.5 // 0.5cm kerf
        rowHeight = Math.max(rowHeight, h)
    })

    return result
}

export function Step10_CuttingDiagram() {
    const { settings } = useProjectStore()
    const woofer = settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer')

    const layoutData = useMemo(() => {
        if (!woofer) return null

        const encVol = settings.enclosure?.customVolume
        const Vb = encVol && encVol > 0 ? encVol : woofer.vas * 0.707
        const wallT = settings.enclosure?.wallThickness || 18
        const dims = calculateBoxDimensions(Vb, wallT, woofer.diameterParams)
        const cuts = generateCutList(dims, wallT)
        const sheets = calculateSheetCount(cuts)

        const pieces = cuts.map(cut => ({
            name: cut.nameHe,
            widthCm: cut.widthMm / 10,
            heightCm: cut.heightMm / 10
        }))

        // For stereo pair, double the pieces
        const allPieces = settings.speakerType === 'subwoofer'
            ? pieces
            : [...pieces.map(p => ({ ...p, name: `L: ${p.name}` })), ...pieces.map(p => ({ ...p, name: `R: ${p.name}` }))]

        const layout = layoutPiecesOnSheet(allPieces)

        return { dims, cuts, sheets, layout, allPieces }
    }, [woofer, settings.speakerType])

    if (!layoutData) {
        return (
            <AnimatedStep>
                <div className="flex flex-col items-center justify-center gap-4 p-16 bg-card/80 border border-dashed border-border/50 rounded-2xl backdrop-blur-sm">
                    <IllustrationCutting size={120} />
                    <p className="text-muted-foreground animate-pulse">הגדירו דרייברים בשלב 2 כדי לחשב תרשים חיתוך.</p>
                </div>
            </AnimatedStep>
        )
    }

    const { dims, cuts, sheets, layout } = layoutData

    // SVG scale
    const svgPadding = 20
    const scale = Math.min(700 / SHEET_WIDTH, 500 / SHEET_HEIGHT)

    return (
        <AnimatedStep>
            <StepHeader title="תרשים חיתוך" subtitle={`MDF ${SHEET_WIDTH}×${SHEET_HEIGHT} ס"מ`} icon={<Scissors className="w-5 h-5" />} />

            {/* Key Stats */}
            <div className="grid grid-cols-4 gap-2 shrink-0">
                <GlowStat label="מידות (W×H×D)" value={`${dims.externalWidth.toFixed(0)}×${dims.externalHeight.toFixed(0)}×${dims.externalDepth.toFixed(0)}`} unit={'מ"מ'} color="rose" />
                <GlowStat label="חלקים" value={cuts.length} color="purple" />
                <GlowStat label="לוחות MDF" value={sheets.sheetsNeeded.toFixed(1)} color="amber" />
                <GlowStat label="ניצולת" value={`${sheets.utilization.toFixed(0)}%`} color="emerald" />
            </div>

            <StepBody>

            {/* ── SVG Diagram ── */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                        מידות: {dims.externalWidth.toFixed(0)}×{dims.externalHeight.toFixed(0)}×{dims.externalDepth.toFixed(0)} מ"מ | עובי: 18 מ"מ
                    </div>
                    <div className="bg-black/20 rounded-lg p-2 overflow-auto" dir="ltr">
                        <svg
                            width={SHEET_WIDTH * scale + svgPadding * 2}
                            height={SHEET_HEIGHT * scale + svgPadding * 2}
                            viewBox={`0 0 ${SHEET_WIDTH * scale + svgPadding * 2} ${SHEET_HEIGHT * scale + svgPadding * 2}`}
                        >
                            {/* Sheet outline */}
                            <rect
                                x={svgPadding}
                                y={svgPadding}
                                width={SHEET_WIDTH * scale}
                                height={SHEET_HEIGHT * scale}
                                fill="#1a1a2e"
                                stroke="#444"
                                strokeWidth={2}
                            />

                            {/* Sheet dimensions */}
                            <text x={svgPadding + SHEET_WIDTH * scale / 2} y={12} textAnchor="middle" fill="#888" fontSize={10}>
                                {SHEET_WIDTH} cm
                            </text>
                            <text x={8} y={svgPadding + SHEET_HEIGHT * scale / 2} textAnchor="middle" fill="#888" fontSize={10} transform={`rotate(-90, 8, ${svgPadding + SHEET_HEIGHT * scale / 2})`}>
                                {SHEET_HEIGHT} cm
                            </text>

                            {/* Cut pieces */}
                            {layout.map((piece, i) => (
                                <motion.g
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.08 }}
                                >
                                    <rect
                                        x={svgPadding + piece.x * scale}
                                        y={svgPadding + piece.y * scale}
                                        width={piece.width * scale}
                                        height={piece.height * scale}
                                        fill={piece.color}
                                        fillOpacity={0.3}
                                        stroke={piece.color}
                                        strokeWidth={1.5}
                                        rx={2}
                                    />
                                    <text
                                        x={svgPadding + (piece.x + piece.width / 2) * scale}
                                        y={svgPadding + (piece.y + piece.height / 2) * scale - 4}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize={Math.min(9, piece.width * scale / 6)}
                                        fontWeight="bold"
                                    >
                                        {piece.name}
                                    </text>
                                    <text
                                        x={svgPadding + (piece.x + piece.width / 2) * scale}
                                        y={svgPadding + (piece.y + piece.height / 2) * scale + 8}
                                        textAnchor="middle"
                                        fill="#aaa"
                                        fontSize={Math.min(7, piece.width * scale / 8)}
                                    >
                                        {piece.width.toFixed(1)}×{piece.height.toFixed(1)}
                                    </text>
                                </motion.g>
                            ))}
                        </svg>
                    </div>
                </CardContent>
            </Card>

            {/* Cut List Table */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>רשימת חיתוכים</CardTitle>
                    <CardDescription>לוחות {sheets.sheetsNeeded.toFixed(1)} נדרשים ({sheets.utilization.toFixed(0)}% ניצולת)</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/20 text-muted-foreground text-xs">
                                <th className="p-2 text-right">#</th>
                                <th className="p-2 text-right">חלק</th>
                                <th className="p-2 text-center">רוחב (מ"מ)</th>
                                <th className="p-2 text-center">גובה (מ"מ)</th>
                                <th className="p-2 text-center">כמות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cuts.map((cut, i) => (
                                <motion.tr
                                    key={i}
                                    className="border-b border-border/30 hover:bg-muted/20"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                                    <td className="p-2 font-medium">{cut.nameHe}</td>
                                    <td className="p-2 text-center font-mono">{cut.widthMm.toFixed(0)}</td>
                                    <td className="p-2 text-center font-mono">{cut.heightMm.toFixed(0)}</td>
                                    <td className="p-2 text-center">{settings.speakerType === 'subwoofer' ? 1 : 2}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground">
                💡 מומלץ להוסיף 5% לכמות ה-MDF עבור טעויות חיתוך. חרך מסור (kerf) = ~3מ"מ.
            </div>
            </StepBody>
        </AnimatedStep>
    )
}
