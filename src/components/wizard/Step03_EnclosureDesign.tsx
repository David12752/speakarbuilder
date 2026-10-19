import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/projectStore'
import { ParameterInput } from '@/components/shared/ParameterInput'
import { calculateOptimalSealedVb } from '@/calculations/thiele-small'
import { calculatePortLength } from '@/calculations/ported-box'
import { calculateBandpass } from '@/calculations/bandpass'
import { calculatePassiveRadiator } from '@/calculations/passive-radiator'
import { Box, Wind, Disc3, Radio } from 'lucide-react'
import { AnimatedStep, StepHeader, StepBody, GlowStat } from '@/components/shared/StepWrapper'
import { AnimatePresence, motion } from 'framer-motion'

type EnclosureTab = 'sealed' | 'ported' | 'bandpass' | 'passive-radiator'

export function Step03_EnclosureDesign() {
    const { settings, updateSettings } = useProjectStore()
    const [activeTab, setActiveTab] = useState<EnclosureTab>(settings.enclosureType || 'sealed')

    // Find the primary woofer
    const getWoofer = () => {
        return settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer') || settings.drivers[0]
    }

    const woofer = getWoofer()

    if (!woofer) {
        return (
            <div className="text-center p-12 bg-card border border-dashed rounded-lg text-muted-foreground">
                אנא הגדירו לפחות דרייבר אחד (רצוי וופר) בשלב הקודם לפני תכנון ארגז.
            </div>
        )
    }

    let optimalSealedVb = 'לא רלוונטי'
    try {
        const calc = calculateOptimalSealedVb(woofer.vas, woofer.qts)
        if (calc && calc !== Infinity) optimalSealedVb = `${calc.toFixed(1)} L`
    } catch { }

    // Use store-backed enclosure params for persistence across navigation
    const enc = settings.enclosure || {} as any
    const targetVb = enc.portedVb > 0 ? enc.portedVb : woofer.vas
    const targetFb = enc.portedFb > 0 ? enc.portedFb : woofer.fs
    const portDiam = enc.portDiameter || 5
    const bpPortDiam = enc.bandpassPortDiameter || 5
    const prFs = enc.prFs || 20
    const prMms = enc.prMms || 80
    const prSd = enc.prSd || (woofer.sd || 220)
    const prQms = enc.prQms || 5

    const updateEnc = (updates: Partial<typeof settings.enclosure>) => {
        updateSettings({ enclosure: { ...settings.enclosure, ...updates } })
    }
    const setTargetVb = (v: number) => updateEnc({ portedVb: v })
    const setTargetFb = (v: number) => updateEnc({ portedFb: v })
    const setPortDiam = (v: number) => updateEnc({ portDiameter: v })
    const setBpPortDiam = (v: number) => updateEnc({ bandpassPortDiameter: v })
    const setPrFs = (v: number) => updateEnc({ prFs: v })
    const setPrMms = (v: number) => updateEnc({ prMms: v })
    const setPrSd = (v: number) => updateEnc({ prSd: v })
    const setPrQms = (v: number) => updateEnc({ prQms: v })

    // We'll calculate port on render dynamically.
    const calcPortCurrent = calculatePortLength(targetFb, targetVb, portDiam, 1)

    const handleTabChange = (tab: EnclosureTab) => {
        setActiveTab(tab)
        updateSettings({ enclosureType: tab })
    }

    // Bandpass calculation
    const bandpassResult = calculateBandpass(woofer.fs, woofer.qts, woofer.vas, woofer.sd, bpPortDiam)

    // Passive radiator calculation
    const prResult = calculatePassiveRadiator(
        woofer.fs, woofer.qts, woofer.vas, woofer.sd, woofer.xmax,
        { fsPr: prFs, mmsPr: prMms, vasPr: woofer.vas, sdPr: prSd, qmsPr: prQms }
    )

    const tabs: Array<{ id: EnclosureTab; label: string; icon: React.ReactNode }> = [
        { id: 'sealed', label: 'אטומה (Sealed)', icon: <Box className="w-4 h-4" /> },
        { id: 'ported', label: 'פורט (Bass Reflex)', icon: <Wind className="w-4 h-4" /> },
        { id: 'bandpass', label: 'בנדפאס (Bandpass)', icon: <Radio className="w-4 h-4" /> },
        { id: 'passive-radiator', label: 'רדיאטור פסיבי', icon: <Disc3 className="w-4 h-4" /> },
    ]

    return (
        <AnimatedStep>
            <StepHeader title="תכנון ארגז" subtitle={`${woofer.name} | Vas=${woofer.vas}L | Fs=${woofer.fs}Hz`} icon={<Box className="w-3.5 h-3.5" />}>
                {tabs.map(tab => (
                    <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'ghost'} size="sm"
                        onClick={() => handleTabChange(tab.id)}
                        className={`gap-1 h-6 text-[10px] whitespace-nowrap ${activeTab === tab.id ? '' : 'hover:bg-muted/50'}`}>
                        {tab.icon} {tab.label}
                    </Button>
                ))}
            </StepHeader>

            <StepBody>
            <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
                {/* Left column: Parameters */}
                <div className="space-y-6">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">{tabs.find(t => t.id === activeTab)?.label}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeTab === 'sealed' && (
                                <div className="space-y-3">
                                    <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/15 text-sm">
                                        <p className="text-emerald-400 font-medium">
                                            נפח אידיאלי (Qtc 0.707): <span className="font-bold font-mono">{optimalSealedVb}</span>
                                        </p>
                                        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                                            תיבה אטומה מספקת גלגול חלק של 12dB/oct מתחת ל-Fc. מתאימה לשני-פס ולמוניטורים קרובי שדה.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ported' && (
                                <div className="space-y-4">
                                    <ParameterInput id="vb" label="נפח פנימי (Vb)" unit="ליטר" value={targetVb} onChangeValue={setTargetVb} />
                                    <ParameterInput id="fb" label="תדר כיוון (Fb)" unit="Hz" tooltip="באיזה תדר יכוון הפורט." value={targetFb} onChangeValue={setTargetFb} />
                                    <ParameterInput id="portDiam" label="קוטר הפורט (Dv)" unit="cm" tooltip="קוטר פנימי של הצינור." value={portDiam} onChangeValue={setPortDiam} step={0.5} />
                                </div>
                            )}

                            {activeTab === 'bandpass' && (
                                <div className="space-y-4">
                                    <div className="bg-muted/20 p-4 rounded-xl border border-border/50 text-sm text-muted-foreground leading-relaxed">
                                        תיבת בנדפאס מרכזת אנרגיה בטווח תדרים צר. הדרייבר בתוך חדר אטום, והצליל יוצא דרך פורט בלבד.
                                    </div>
                                    <ParameterInput id="bp-port" label="קוטר פורט" unit="cm" value={bpPortDiam} onChangeValue={setBpPortDiam} step={0.5} />
                                </div>
                            )}

                            {activeTab === 'passive-radiator' && (
                                <div className="space-y-4">
                                    <div className="bg-muted/20 p-4 rounded-xl border border-border/50 text-sm text-muted-foreground leading-relaxed">
                                        רדיאטור פסיבי מחליף את הפורט. ללא רעשי אוויר (chuffing), מאפשר תיבה קטנה יותר.
                                    </div>
                                    <h4 className="font-semibold text-sm text-muted-foreground">פרמטרי רדיאטור פסיבי:</h4>
                                    <ParameterInput id="pr-fs" label="Fs (רדיאטור)" unit="Hz" value={prFs} onChangeValue={setPrFs} />
                                    <ParameterInput id="pr-mms" label="Mms (מסה נעה)" unit="g" value={prMms} onChangeValue={setPrMms} />
                                    <ParameterInput id="pr-sd" label="Sd (שטח פנים)" unit="cm²" value={prSd} onChangeValue={setPrSd} />
                                    <ParameterInput id="pr-qms" label="Qms" value={prQms} onChangeValue={setPrQms} step={0.1} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right column: Results */}
                <div className="space-y-6">
                    <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent sticky top-4">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-primary flex items-center gap-2 text-base">
                                תוצאות חישוב בזמן אמת
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activeTab === 'sealed' && (
                                <div className="text-center p-8 border border-primary/15 bg-background/50 rounded-xl">
                                    <div className="text-xs text-primary/70 mb-2 uppercase tracking-wider">נפח תיבה אטומה אופטימלי</div>
                                    <div className="text-5xl font-mono font-bold text-foreground">{optimalSealedVb}</div>
                                    <p className="text-xs text-muted-foreground mt-4">Qtc = 0.707 — Butterworth alignment</p>
                                </div>
                            )}

                            {activeTab === 'ported' && (
                                <div className="text-center p-8 border border-primary/15 bg-background/50 rounded-xl">
                                    <div className="text-xs text-primary/70 mb-2 uppercase tracking-wider">אורך הפורט הנדרש</div>
                                    <div className="text-5xl font-mono font-bold text-foreground" dir="ltr">
                                        {calcPortCurrent > 0 ? calcPortCurrent.toFixed(2) : "ERR"}
                                        <span className="text-2xl text-muted-foreground ml-2">cm</span>
                                    </div>
                                    {calcPortCurrent === 0 && (
                                        <p className="text-xs text-destructive mt-4">נתונים חסרי היגיון. ייתכן והפורט גדול מדי לנפח.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'bandpass' && bandpassResult.sealedVolume > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    <GlowStat label="חדר אטום (אחורי)" value={bandpassResult.sealedVolume} unit="L" color="amber" />
                                    <GlowStat label="חדר פורט (קדמי)" value={bandpassResult.portedVolume} unit="L" color="cyan" />
                                    <GlowStat label="תדר כיוון" value={bandpassResult.portTuningHz} unit="Hz" color="purple" />
                                    <GlowStat label="אורך פורט" value={bandpassResult.portLengthMm} unit="mm" color="emerald" />
                                    <GlowStat label="טווח -3dB" value={`${bandpassResult.f3Low}–${bandpassResult.f3High}`} unit="Hz" color="amber" />
                                    <GlowStat label="BW / רווח" value={`${bandpassResult.bandwidthOctaves} oct`} color="cyan" />
                                </div>
                            )}

                            {activeTab === 'passive-radiator' && prResult.boxVolume > 0 && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <GlowStat label="נפח ארגז" value={prResult.boxVolume} unit="L" color="emerald" />
                                        <GlowStat label="תדר כיוון" value={prResult.tuningFrequency} unit="Hz" color="amber" />
                                        <GlowStat label="מסה להוסיף" value={prResult.additionalMassGrams} unit="g" color="purple" />
                                        <GlowStat label="F3 (-3dB)" value={prResult.f3} unit="Hz" color="cyan" />
                                        <GlowStat label="Xmax נדרש" value={prResult.requiredXmax} unit="mm" color="rose" />
                                        <GlowStat label="כמות PR" value={prResult.recommendedCount} color="emerald" />
                                    </div>
                                    {!prResult.sdAdequate && (
                                        <p className="text-xs text-amber-400 bg-amber-950/30 p-3 rounded-xl border border-amber-800/40">
                                            ⚠️ שטח הפנים של הרדיאטור הפסיבי קטן מזה של הוופר. מומלץ להגדיל Sd או להשתמש ביותר מרדיאטור אחד.
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
            </AnimatePresence>
            </StepBody>
        </AnimatedStep>
    )
}
