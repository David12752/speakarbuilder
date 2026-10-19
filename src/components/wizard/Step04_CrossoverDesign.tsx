
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/projectStore'
import { ParameterInput } from '@/components/shared/ParameterInput'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { calculateFirstOrderCrossover, calculateSecondOrderLinkwitzRiley, calculateSecondOrderButterworth, calculateThirdOrderButterworth, calculateFourthOrderLinkwitzRiley, calculateSecondOrderBessel, calculateThirdOrderBessel, calculateSecondOrderChebyshev, calculateThirdOrderChebyshev } from '@/calculations/crossover'
import { calculateLPad, calculateZobel, calculateBaffleStep, calculateSeriesNotch } from '@/calculations/networks'
import { snapComponent } from '@/calculations/e-series'
import { CrossoverSchematic } from '@/components/visualizations/CrossoverSchematic'
import { calculatePowerDissipation } from '@/calculations/power-dissipation'
import { calculateDSPCrossover, generateMiniDSPConfig } from '@/calculations/dsp-crossover'
import { AnimatedStep, StepHeader, StepBody } from '@/components/shared/StepWrapper'

export function Step04_CrossoverDesign() {
    const { settings, updateSettings } = useProjectStore()
    const [mode, setMode] = useState<'passive' | 'active'>('passive')

    const woofer = settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer')
    const tweeter = settings.drivers.find(d => d.type === 'tweeter')

    const crossover = settings.crossover || {
        fc: 2500, order: 2, alignment: 'linkwitz-riley', baffleWidth: 0.2, baffleAtten: 3, acousticOffset: 0
    }
    const { fc, order, alignment, baffleWidth, baffleAtten, acousticOffset } = crossover

    const updateCrossover = (updates: Partial<typeof crossover>) => {
        updateSettings({ crossover: { ...crossover, ...updates } })
    }

    if (!woofer || !tweeter) {
        return (
            <div className="text-center p-12 bg-card border border-dashed rounded-lg text-muted-foreground animate-pulse">
                לצורך חישוב קרוסאובר יש להגדיר לפחות וופר אחד וטוויטר אחד בשלבים הקודמים.
            </div>
        )
    }

    // Crossover calculations
    const tweeterImpedance = tweeter.re // Usually would use nominal Z (e.g., 8), but Re is a safe approximation
    const wooferImpedance = woofer.re

    let xoR = null
    if (order === 4) {
        xoR = { ...calculateFourthOrderLinkwitzRiley(fc, tweeterImpedance), type: '4th-order Linkwitz-Riley (24dB/oct)' }
    } else if (order === 3) {
        if (alignment === 'bessel') {
            xoR = { ...calculateThirdOrderBessel(fc, tweeterImpedance), type: '3rd-order Bessel (18dB/oct)' }
        } else if (alignment === 'chebyshev') {
            xoR = { ...calculateThirdOrderChebyshev(fc, tweeterImpedance), type: '3rd-order Chebyshev 0.5dB (18dB/oct)' }
        } else {
            xoR = { ...calculateThirdOrderButterworth(fc, tweeterImpedance), type: '3rd-order Butterworth (18dB/oct)' }
        }
    } else if (order === 2) {
        if (alignment === 'linkwitz-riley') {
            xoR = { ...calculateSecondOrderLinkwitzRiley(fc, tweeterImpedance), type: '2nd-order Linkwitz-Riley' }
        } else if (alignment === 'bessel') {
            xoR = { ...calculateSecondOrderBessel(fc, tweeterImpedance), type: '2nd-order Bessel' }
        } else if (alignment === 'chebyshev') {
            xoR = { ...calculateSecondOrderChebyshev(fc, tweeterImpedance), type: '2nd-order Chebyshev 0.5dB' }
        } else {
            xoR = { ...calculateSecondOrderButterworth(fc, tweeterImpedance), type: '2nd-order Butterworth' }
        }
    } else {
        xoR = {
            ...calculateFirstOrderCrossover(fc, tweeterImpedance),
            type: '1st-order Butterworth (6dB/oct)'
        }
    }

    // Padding calculations (L-Pad for Tweeter)
    const sensDiff = tweeter.sensitivity - woofer.sensitivity
    let lpadR = null
    if (sensDiff > 0) {
        lpadR = calculateLPad(tweeterImpedance, sensDiff)
    }

    // Zobel for Woofer
    const zobel = calculateZobel(woofer.re, woofer.le)

    // Baffle Step
    const bsc = calculateBaffleStep(baffleWidth, wooferImpedance, baffleAtten)

    // Series Notch Filter for woofer impedance peak
    const notch = calculateSeriesNotch(woofer.fs, woofer.re, woofer.qes, woofer.qms)

    // Acoustic delay from physical offset
    const acousticDelayMs = acousticOffset > 0 ? (acousticOffset / 1000) / 343 * 1000 : 0
    const phaseShiftAtFc = acousticOffset > 0 ? 360 * fc * (acousticOffset / 1000) / 343 : 0

    // Power dissipation - collect all components
    const allComponents: Array<{ name: string; type: 'capacitor' | 'inductor' | 'resistor'; value: number; unit: string }> = []
    if ('C1' in xoR.hpf && (xoR.hpf as any).C1) allComponents.push({ name: 'HPF C1', type: 'capacitor', value: (xoR.hpf as any).C1, unit: 'µF' })
    if ('L1' in xoR.hpf && (xoR.hpf as any).L1) allComponents.push({ name: 'HPF L1', type: 'inductor', value: (xoR.hpf as any).L1, unit: 'mH' })
    if ('C2' in xoR.hpf && (xoR.hpf as any).C2) allComponents.push({ name: 'HPF C2', type: 'capacitor', value: (xoR.hpf as any).C2, unit: 'µF' })
    if ('L2' in xoR.hpf && (xoR.hpf as any).L2) allComponents.push({ name: 'HPF L2', type: 'inductor', value: (xoR.hpf as any).L2, unit: 'mH' })
    if ('L1' in xoR.lpf && (xoR.lpf as any).L1) allComponents.push({ name: 'LPF L1', type: 'inductor', value: (xoR.lpf as any).L1, unit: 'mH' })
    if ('C1' in xoR.lpf && (xoR.lpf as any).C1) allComponents.push({ name: 'LPF C1', type: 'capacitor', value: (xoR.lpf as any).C1, unit: 'µF' })
    if ('L2' in xoR.lpf && (xoR.lpf as any).L2) allComponents.push({ name: 'LPF L2', type: 'inductor', value: (xoR.lpf as any).L2, unit: 'mH' })
    if ('C2' in xoR.lpf && (xoR.lpf as any).C2) allComponents.push({ name: 'LPF C2', type: 'capacitor', value: (xoR.lpf as any).C2, unit: 'µF' })
    if (lpadR) {
        allComponents.push({ name: 'L-Pad R1 (Series)', type: 'resistor', value: lpadR.r1, unit: 'Ω' })
        allComponents.push({ name: 'L-Pad R2 (Parallel)', type: 'resistor', value: lpadR.r2, unit: 'Ω' })
    }
    allComponents.push({ name: 'BSC R', type: 'resistor', value: bsc.rBsc, unit: 'Ω' })

    const avgPower = Math.max(woofer.pe, tweeter.pe) / 2
    const powerDissipation = calculatePowerDissipation(allComponents, wooferImpedance, avgPower, fc)

    // DSP crossover calculation
    const dspResult = calculateDSPCrossover(fc, order, alignment, tweeter.sensitivity, woofer.sensitivity, acousticOffset)
    const dspConfig = generateMiniDSPConfig(dspResult)

    return (
        <AnimatedStep>
        <StepHeader title="תכנון קרוסאובר" subtitle="הפרדת תדרים" icon={<span className="text-xs">✂️</span>}>
            <div className="flex gap-1">
                <Button variant={mode === 'passive' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('passive')} className="h-6 text-[10px]">פסיבי</Button>
                <Button variant={mode === 'active' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('active')} className="h-6 text-[10px]">אקטיבי/DSP</Button>
            </div>
        </StepHeader>
        <StepBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-3">
                {/* Mode Toggle */}

                <Card className="border-border/50 bg-card/80">
                    <CardHeader>
                        <CardTitle className="text-base">הגדרות קרוסאובר</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ParameterInput
                            id="fc"
                            label="תדר חיתוך רצוי (Fc)"
                            unit="Hz"
                            value={fc}
                            onChangeValue={(val) => updateCrossover({ fc: val })}
                            step={50}
                        />

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">סדר הפילטר משופע (Order)</label>
                                <Select value={order.toString()} onValueChange={(val) => {
                                    const newOrder = parseInt(val) as 1 | 2 | 3 | 4
                                    const updates: any = { order: newOrder }
                                    if (newOrder === 4 || newOrder === 1) updates.alignment = 'linkwitz-riley'
                                    updateCrossover(updates)
                                }} dir="rtl">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1st Order (6dB/oct)</SelectItem>
                                        <SelectItem value="2">2nd Order (12dB/oct)</SelectItem>
                                        <SelectItem value="3">3rd Order (18dB/oct)</SelectItem>
                                        <SelectItem value="4">4th Order (24dB/oct)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">אפיון פילטר (Alignment)</label>
                                <Select value={alignment} onValueChange={(val: any) => updateCrossover({ alignment: val })} dir="rtl" disabled={order === 1 || order === 4}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="linkwitz-riley">Linkwitz-Riley</SelectItem>
                                        <SelectItem value="butterworth">Butterworth</SelectItem>
                                        <SelectItem value="bessel">Bessel (שטוח בפאזה)</SelectItem>
                                        <SelectItem value="chebyshev">Chebyshev 0.5dB (שיפוע חד)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>תיקונים ורשתות נוספות (Networks)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ParameterInput
                            id="bafflew"
                            label="רוחב הבאפל / חזית התיבה (במטרים)"
                            unit="m"
                            value={baffleWidth}
                            onChangeValue={(val) => updateCrossover({ baffleWidth: val })}
                            step={0.05}
                        />
                        <ParameterInput
                            id="batten"
                            label="פיצוי מבוקש (Baffle Step Attenuation)"
                            unit="dB"
                            value={baffleAtten}
                            onChangeValue={(val) => updateCrossover({ baffleAtten: val })}
                            max={6}
                            min={1}
                            step={1}
                        />
                        <ParameterInput
                            id="offset"
                            label="הפרש עומק פיזי בין טוויטר לוופר (Z-Offset)"
                            unit="mm"
                            tooltip="המרחק הפיזי במ&quot;מ בין מישור הטוויטר למישור הוופר. ערך חיובי = הטוויטר שקוע יותר."
                            value={acousticOffset}
                            onChangeValue={(val) => updateCrossover({ acousticOffset: val })}
                            min={0}
                            max={100}
                            step={1}
                        />
                        {acousticOffset > 0 && (
                            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                                <p>השהייה אקוסטית: <span className="font-mono text-foreground">{acousticDelayMs.toFixed(3)} ms</span></p>
                                <p>הסטת פאזה ב-{fc}Hz: <span className="font-mono text-foreground">{phaseShiftAtFc.toFixed(1)}°</span></p>
                                {phaseShiftAtFc > 90 && <p className="text-yellow-500 mt-1">⚠️ הסטת פאזה גבוהה — שקלו יישור פיזי או פילטר all-pass</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                {mode === 'passive' ? (
                <>
                <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent sticky top-4">
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center gap-2 text-base">
                            <span>תרשים רכיבים</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Tweeter Network */}
                        <div className="p-4 bg-background border rounded-lg overflow-x-auto">
                            <h4 className="font-bold text-lg mb-2 text-cyan-500">מסלול הטוויטר (High-Pass)</h4>
                            <div className="mb-4 bg-black/40 rounded-lg p-2 min-w-[300px]" dir="ltr">
                                <CrossoverSchematic
                                    order={order as any}
                                    type="HPF"
                                    c1={(xoR.hpf as any).C1}
                                    c2={(xoR.hpf as any).C2}
                                    l1={(xoR.hpf as any).L1}
                                    l2={(xoR.hpf as any).L2}
                                    height={140}
                                />
                            </div>
                            <ul className="space-y-2 font-mono text-sm text-foreground/80 ltr text-left">
                                {'C1' in xoR.hpf && (
                                    <li>C1 (Series): <span className="text-foreground">{snapComponent((xoR.hpf as any).C1, 'µF').snapped} µF</span> <span className="text-xs text-muted-foreground">(E24 Snap)</span></li>
                                )}
                                {'L1' in xoR.hpf && (
                                    <li>L1 (Parallel): <span className="text-foreground">{snapComponent((xoR.hpf as any).L1, 'mH').snapped} mH</span></li>
                                )}
                                {'C2' in xoR.hpf && (
                                    <li>C2 (Series): <span className="text-foreground">{snapComponent((xoR.hpf as any).C2, 'µF').snapped} µF</span></li>
                                )}
                                {'L2' in xoR.hpf && (
                                    <li>L2 (Parallel): <span className="text-foreground">{snapComponent((xoR.hpf as any).L2, 'mH').snapped} mH</span></li>
                                )}
                                {lpadR && (
                                    <div className="mt-3 pt-3 border-t border-border/50">
                                        <p className="text-xs text-muted-foreground font-sans rtl text-right mb-1">
                                            הנחתת רגישות (L-Pad) בגלל פער של {sensDiff.toFixed(1)}dB
                                        </p>
                                        <li>R1 (Series): <span className="text-foreground">{lpadR.r1.toFixed(2)} Ω</span></li>
                                        <li>R2 (Parallel): <span className="text-foreground">{lpadR.r2.toFixed(2)} Ω</span></li>
                                    </div>
                                )}
                            </ul>
                        </div>

                        {/* Woofer Network */}
                        <div className="p-4 bg-background border rounded-lg overflow-x-auto">
                            <h4 className="font-bold text-lg mb-2 text-orange-500">מסלול הסינכרון לוופר (Low-Pass)</h4>
                            <div className="mb-4 bg-black/40 rounded-lg p-2 min-w-[300px]" dir="ltr">
                                <CrossoverSchematic
                                    order={order as any}
                                    type="LPF"
                                    c1={(xoR.lpf as any).C1}
                                    c2={(xoR.lpf as any).C2}
                                    l1={(xoR.lpf as any).L1}
                                    l2={(xoR.lpf as any).L2}
                                    height={140}
                                />
                            </div>
                            <ul className="space-y-2 font-mono text-sm text-foreground/80 ltr text-left">
                                {'L1' in xoR.lpf && (
                                    <li>L1 (Series): <span className="text-foreground">{snapComponent((xoR.lpf as any).L1, 'mH').snapped} mH</span></li>
                                )}
                                {'C1' in xoR.lpf && (
                                    <li>C1 (Parallel): <span className="text-foreground">{snapComponent((xoR.lpf as any).C1, 'µF').snapped} µF</span></li>
                                )}
                                {'L2' in xoR.lpf && (
                                    <li>L2 (Series): <span className="text-foreground">{snapComponent((xoR.lpf as any).L2, 'mH').snapped} mH</span></li>
                                )}
                                {'C2' in xoR.lpf && (
                                    <li>C2 (Parallel): <span className="text-foreground">{snapComponent((xoR.lpf as any).C2, 'µF').snapped} µF</span></li>
                                )}

                                <div className="mt-3 pt-3 border-t border-border/50">
                                    <p className="text-xs text-muted-foreground font-sans rtl text-right mb-1">
                                        רשת ייצוב עכבה (Zobel)
                                    </p>
                                    <li>Rz (Series): <span className="text-foreground">{zobel.rz.toFixed(2)} Ω</span></li>
                                    <li>Cz (Series): <span className="text-foreground">{zobel.czMicrofarads.toFixed(2)} uF</span></li>
                                </div>

                                <div className="mt-3 pt-3 border-t border-border/50">
                                    <p className="text-xs text-muted-foreground font-sans rtl text-right mb-1">
                                        פיצוי נפיצות באפל (Baffle Step @ {bsc.f3.toFixed(0)}Hz)
                                    </p>
                                    <li>L (Parallel to R): <span className="text-foreground">{bsc.lBsc.toFixed(2)} mH</span></li>
                                    <li>R (Parallel to L): <span className="text-foreground">{bsc.rBsc.toFixed(2)} Ω</span></li>
                                </div>

                                {notch.rNotch > 0 && (
                                    <div className="mt-3 pt-3 border-t border-border/50">
                                        <p className="text-xs text-muted-foreground font-sans rtl text-right mb-1">
                                            פילטר נוטש (Notch @ {woofer.fs}Hz — דיכוי פיק תהודה)
                                        </p>
                                        <li>R: <span className="text-foreground">{notch.rNotch.toFixed(2)} Ω</span></li>
                                        <li>L: <span className="text-foreground">{notch.lNotch.toFixed(2)} mH</span></li>
                                        <li>C: <span className="text-foreground">{notch.cNotch.toFixed(2)} µF</span></li>
                                    </div>
                                )}
                            </ul>
                        </div>

                    </CardContent>
                </Card>

                {/* Power Dissipation Card */}
                {powerDissipation.length > 0 && (
                    <Card className="border-orange-500/30 bg-orange-500/5">
                        <CardHeader>
                            <CardTitle className="text-orange-400 text-sm">📊 הספק מפוזר ברכיבים (Power Dissipation)</CardTitle>
                            <CardDescription>אומדן הספק מבוסס על {avgPower.toFixed(0)}W ממוצע</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1.5 font-mono text-sm" dir="ltr">
                                {powerDissipation.map((comp, i) => (
                                    <div key={i} className="flex justify-between items-center text-left">
                                        <span className="text-foreground/70">{comp.name}</span>
                                        <span>
                                            <span className={comp.powerWatts > 5 ? 'text-red-400 font-bold' : 'text-foreground'}>
                                                {comp.powerWatts}W
                                            </span>
                                            <span className="text-muted-foreground text-xs mr-2">
                                                (min {comp.recommendedRating}W rated)
                                            </span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
                </>
                ) : (
                /* ─── Active / DSP Mode ─── */
                <>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardHeader>
                        <CardTitle className="text-emerald-400 flex items-center gap-2">⚡ פרמטרי DSP (Digital Crossover)</CardTitle>
                        <CardDescription>הגדרות פילטר דיגיטלי — ניתנות ליישום ב-miniDSP, Behringer DCX, או כל DSP</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Woofer DSP Channel */}
                        <div className="p-4 bg-background border rounded-lg">
                            <h4 className="font-bold text-lg mb-3 text-orange-500">ערוץ וופר (Low-Pass)</h4>
                            <div className="space-y-2 font-mono text-sm" dir="ltr">
                                {dspResult.lowPass.map((f, i) => (
                                    <div key={i} className="flex justify-between items-center bg-muted/20 p-2 rounded text-left">
                                        <span className="text-foreground/80">Filter {i + 1}: {f.type}</span>
                                        <span className="text-foreground">
                                            Fc={f.frequency}Hz  Q={f.q.toFixed(4)}  {f.slope}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tweeter DSP Channel */}
                        <div className="p-4 bg-background border rounded-lg">
                            <h4 className="font-bold text-lg mb-3 text-cyan-500">ערוץ טוויטר (High-Pass)</h4>
                            <div className="space-y-2 font-mono text-sm" dir="ltr">
                                {dspResult.highPass.map((f, i) => (
                                    <div key={i} className="flex justify-between items-center bg-muted/20 p-2 rounded text-left">
                                        <span className="text-foreground/80">Filter {i + 1}: {f.type}</span>
                                        <span className="text-foreground">
                                            Fc={f.frequency}Hz  Q={f.q.toFixed(4)}  {f.slope}
                                        </span>
                                    </div>
                                ))}
                                {dspResult.tweeterTrimDb !== 0 && (
                                    <div className="flex justify-between items-center bg-yellow-500/10 p-2 rounded text-left border border-yellow-500/30">
                                        <span className="text-foreground/80">Gain Trim</span>
                                        <span className="text-yellow-400 font-bold">{dspResult.tweeterTrimDb.toFixed(1)} dB</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Time Alignment */}
                        {dspResult.delayMs > 0 && (
                            <div className="p-4 bg-background border rounded-lg">
                                <h4 className="font-bold text-sm mb-2 text-purple-400">⏱ יישור זמן (Time Alignment)</h4>
                                <p className="font-mono text-sm" dir="ltr">
                                    {dspResult.delayChannel}: {dspResult.delayMs.toFixed(3)} ms delay
                                </p>
                            </div>
                        )}

                        {/* Correction Filters */}
                        <div className="p-4 bg-background border rounded-lg">
                            <h4 className="font-bold text-sm mb-2 text-muted-foreground">💡 פילטרי תיקון מומלצים</h4>
                            <div className="space-y-2 font-mono text-sm" dir="ltr">
                                {dspResult.correctionFilters.map((f, i) => (
                                    <div key={i} className="flex justify-between items-center bg-muted/10 p-2 rounded text-left">
                                        <span className="text-foreground/60">{f.type}</span>
                                        <span className="text-foreground/80">
                                            Fc={f.frequency}Hz  Q={f.q.toFixed(2)}  Gain={f.gainDb > 0 ? '+' : ''}{f.gainDb.toFixed(1)}dB
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Export DSP Config */}
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-sm">📋 ייצוא הגדרות DSP</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-muted/30 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-48 border" dir="ltr">
                            {dspConfig}
                        </pre>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => {
                                navigator.clipboard.writeText(dspConfig)
                            }}
                        >
                            📋 העתק הגדרות ל-Clipboard
                        </Button>
                    </CardContent>
                </Card>
                </>
                )}
            </div>
        </div>
        </StepBody>
        </AnimatedStep>
    )
}
