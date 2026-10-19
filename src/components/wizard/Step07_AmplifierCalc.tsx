import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useProjectStore } from '@/store/projectStore'
import { calculateAmplifierRecommendation, calculateSPLAtDistance } from '@/calculations/amplifier'
import { AnimatedStep, StepHeader, StepBody, GlowStat } from '@/components/shared/StepWrapper'
import { Zap } from 'lucide-react'

export function Step07_AmplifierCalc() {
    const { settings } = useProjectStore()
    const woofer = settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer')

    const useCase = settings.mainUse === 'home_theater' ? 'home_theater' as const
        : settings.mainUse === 'casual_listening' ? 'hifi' as const
            : 'studio' as const

    const rec = useMemo(() => {
        if (!woofer) return null
        return calculateAmplifierRecommendation(
            woofer.sensitivity,
            settings.listeningDistance,
            woofer.re > 0 ? woofer.re : 8,
            woofer.pe > 0 ? woofer.pe : 100,
            useCase
        )
    }, [woofer, settings.listeningDistance, useCase])

    const splAtRec = useMemo(() => {
        if (!woofer || !rec) return 0
        return calculateSPLAtDistance(woofer.sensitivity, rec.recommendedPowerWatts, settings.listeningDistance)
    }, [woofer, rec, settings.listeningDistance])

    if (!woofer || !rec) {
        return (
            <div className="text-center p-12 bg-card border border-dashed rounded-lg text-muted-foreground animate-pulse">
                יש להגדיר לפחות וופר אחד כדי לחשב המלצות מגבר.
            </div>
        )
    }

    return (
        <AnimatedStep>
            <StepHeader title="המלצת מגבר" subtitle="הספק, headroom ו-SPL" icon={<Zap className="w-3.5 h-3.5" />} />

        <StepBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Input Info Card */}
            <div className="space-y-3">
                <Card className="border-border/50 bg-card/80">
                    <CardContent className="p-3 space-y-1.5 text-sm">
                        {[
                            ['רגישות וופר', `${woofer.sensitivity} dB/W/m`],
                            ['מרחק האזנה', `${settings.listeningDistance} m`],
                            ['עכבה (Re)', `${woofer.re} Ω`],
                            ['הספק מקסימלי (Pe)', `${woofer.pe} W`],
                            ['סוג שימוש', useCase === 'studio' ? 'אולפן / מיקס' : useCase === 'hifi' ? 'האזנה ביתית' : 'קולנוע ביתי'],
                        ].map(([label, val], i) => (
                            <div key={i} className={`flex justify-between p-2.5 rounded-lg ${i % 2 === 0 ? 'bg-muted/20' : ''}`}>
                                <span className="text-muted-foreground">{label}:</span>
                                <span className="font-mono font-bold">{val}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {rec.notes.length > 0 && (
                    <Card className="border-yellow-500/20 bg-yellow-500/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-yellow-500 text-base">⚠ הערות</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                {rec.notes.map((note, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="text-yellow-500 mt-0.5">•</span>
                                        <span>{note}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Results */}
            <div className="space-y-3">
                <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent sticky top-4">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-primary text-base">תוצאות</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <GlowStat label="הספק מינימלי" value={rec.minPowerWatts} unit="W" color="amber" />
                            <GlowStat label="הספק מומלץ" value={rec.recommendedPowerWatts} unit="W" color="emerald" />
                        </div>
                        <div className="text-center text-xs text-muted-foreground">Headroom: +{rec.headroomDb} dB</div>

                        <GlowStat label="SPL צפוי" value={splAtRec.toFixed(1)} unit={`dB @ ${settings.listeningDistance}m`} color="cyan" />

                        <div className="p-4 bg-background/50 border border-border/50 rounded-xl space-y-2 text-sm">
                            <h4 className="font-bold mb-3">הנחיות טכניות</h4>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">עכבה מינימלית:</span>
                                <span className="font-mono font-bold">{rec.minImpedanceOhms} Ω</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Damping Factor מינימלי:</span>
                                <span className="font-mono font-bold">{rec.dampingFactorMin}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-border/50">
                                <span className="text-muted-foreground">סוג מגבר מומלץ:</span>
                                <span className="font-bold text-primary">{rec.classRecommendation}</span>
                            </div>
                            <p className="text-xs text-muted-foreground pt-1">{rec.classRecommendationHe}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </StepBody>
        </AnimatedStep>
    )
}
