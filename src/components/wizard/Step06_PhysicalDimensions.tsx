import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useProjectStore } from '@/store/projectStore'
import { ParameterInput } from '@/components/shared/ParameterInput'
import {
    calculateBoxDimensions,
    calculateBracing,
    calculateDampingVolume,
    calculateDriverDisplacement,
    generateCutList,
    calculateSheetCount
} from '@/calculations/physical-dimensions'
import { calculateOptimalSealedVb } from '@/calculations/thiele-small'
import { AnimatedStep, StepHeader, StepBody, GlowStat } from '@/components/shared/StepWrapper'
import { Ruler } from 'lucide-react'

export function Step06_PhysicalDimensions() {
    const { settings, updateSettings } = useProjectStore()
    const woofer = settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer')

    const enc = settings.enclosure || {} as any
    const wallThickness = enc.wallThickness || 18
    const dampingFill = enc.dampingFill || 50
    const customVolume = enc.customVolume || 0

    const setWallThickness = (v: number) => updateSettings({ enclosure: { ...settings.enclosure, wallThickness: v } })
    const setDampingFill = (v: number) => updateSettings({ enclosure: { ...settings.enclosure, dampingFill: v } })
    const setCustomVolume = (v: number) => updateSettings({ enclosure: { ...settings.enclosure, customVolume: v } })

    const targetVolume = useMemo(() => {
        if (customVolume > 0) return customVolume
        if (!woofer) return 10
        try {
            const v = calculateOptimalSealedVb(woofer.vas, woofer.qts)
            return v > 0 && isFinite(v) ? v : 10
        } catch {
            return 10
        }
    }, [woofer, customVolume])

    const dims = useMemo(() => {
        const driverDiam = woofer?.diameterParams || 6.5
        return calculateBoxDimensions(targetVolume, wallThickness, driverDiam)
    }, [targetVolume, wallThickness, woofer])

    const bracing = useMemo(() =>
        calculateBracing(dims.internalWidth, dims.internalHeight, dims.internalDepth, wallThickness),
        [dims, wallThickness]
    )

    const driverDisp = useMemo(() => {
        if (!woofer) return 0
        return calculateDriverDisplacement(woofer.sd)
    }, [woofer])

    const damping = useMemo(() => {
        const netVolume = dims.actualInternalVolume - bracing.volumeDisplacement - driverDisp
        return calculateDampingVolume(Math.max(netVolume, 0), dampingFill)
    }, [dims, bracing, driverDisp, dampingFill])

    const cuts = useMemo(() => generateCutList(dims, wallThickness), [dims, wallThickness])
    const sheets = useMemo(() => calculateSheetCount(cuts), [cuts])

    const netVolume = dims.actualInternalVolume - bracing.volumeDisplacement - driverDisp

    return (
        <AnimatedStep>
            <StepHeader title="מידות פיזיות" subtitle="ארגז, חיזוקים ודעכון" icon={<Ruler className="w-3.5 h-3.5" />} />

        <StepBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Controls */}
            <div className="space-y-3">
                <Card className="border-border/50 bg-card/80">
                    <CardContent className="p-3 space-y-3">
                        <ParameterInput id="customVol" label="נפח פנימי מותאם (0 = אוטומטי)" unit="L" value={customVolume} onChangeValue={setCustomVolume} step={1} min={0} max={200} />
                        <ParameterInput id="wallThick" label="עובי דופן (MDF)" unit="mm" value={wallThickness} onChangeValue={setWallThickness} step={1} min={12} max={30} />
                        <ParameterInput id="dampFill" label="אחוז מילוי דעכון" unit="%" value={dampingFill} onChangeValue={setDampingFill} step={5} min={0} max={100} />
                    </CardContent>
                </Card>

                {/* Cut List */}
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">רשימת חיתוך (Cut List)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm" dir="rtl">
                                <thead>
                                    <tr className="border-b border-border/50 text-muted-foreground text-xs">
                                        <th className="py-2 text-right">חלק</th>
                                        <th className="py-2 text-center">רוחב (מ"מ)</th>
                                        <th className="py-2 text-center">גובה (מ"מ)</th>
                                        <th className="py-2 text-center">כמות</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cuts.map((cut, i) => (
                                        <tr key={i} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                                            <td className="py-2 font-medium">{cut.nameHe}</td>
                                            <td className="py-2 text-center font-mono">{cut.widthMm}</td>
                                            <td className="py-2 text-center font-mono">{cut.heightMm}</td>
                                            <td className="py-2 text-center font-mono">{cut.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/30 text-sm text-muted-foreground">
                            לוחות MDF (122x244 ס"מ): <span className="text-foreground font-bold">{sheets.sheetsNeeded}</span>
                            <span className="mx-2">|</span>
                            ניצולת: <span className="text-foreground font-bold">{sheets.utilization.toFixed(0)}%</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Results Panel */}
            <div className="space-y-3">
                <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent sticky top-4">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-primary text-base">סיכום מידות</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* External Dimensions */}
                        <div className="grid grid-cols-3 gap-3">
                            <GlowStat label="רוחב" value={dims.externalWidth} unit="מ״מ" color="amber" />
                            <GlowStat label="גובה" value={dims.externalHeight} unit="מ״מ" color="cyan" />
                            <GlowStat label="עומק" value={dims.externalDepth} unit="מ״מ" color="purple" />
                        </div>

                        {/* Volume Breakdown */}
                        <div className="p-4 bg-background/50 border border-border/50 rounded-xl space-y-2 text-sm">
                            <h4 className="font-bold mb-3">פירוט נפחים</h4>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">נפח מטרה:</span>
                                <span className="font-mono font-bold">{targetVolume.toFixed(1)} L</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">נפח פנימי גולמי:</span>
                                <span className="font-mono">{dims.actualInternalVolume.toFixed(1)} L</span>
                            </div>
                            <div className="flex justify-between text-orange-400">
                                <span>- חיזוקי {bracing.type} ({bracing.count}):</span>
                                <span className="font-mono">-{bracing.volumeDisplacement.toFixed(2)} L</span>
                            </div>
                            <div className="flex justify-between text-orange-400">
                                <span>- נפח דרייבר:</span>
                                <span className="font-mono">-{driverDisp.toFixed(2)} L</span>
                            </div>
                            <div className="flex justify-between font-bold pt-2 border-t border-border/50 text-primary">
                                <span>נפח נטו צפוי:</span>
                                <span className="font-mono">{netVolume.toFixed(1)} L</span>
                            </div>
                        </div>

                        {/* Bracing & Damping */}
                        <div className="p-4 bg-background/50 border border-border/50 rounded-xl space-y-2 text-sm">
                            <h4 className="font-bold mb-3">חיזוקים ודעכון</h4>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">חיזוקים:</span>
                                <span>{bracing.description}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">סוג דעכון:</span>
                                <span>{damping.material}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">כמות דעכון:</span>
                                <span className="font-mono">{damping.volumeLiters.toFixed(1)} L (~{damping.weightGrams.toFixed(0)}g)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </StepBody>
        </AnimatedStep>
    )
}
