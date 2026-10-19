import { useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/projectStore'
import { calculateFirstOrderCrossover, calculateSecondOrderLinkwitzRiley, calculateSecondOrderButterworth, calculateThirdOrderButterworth, calculateFourthOrderLinkwitzRiley } from '@/calculations/crossover'
import { calculateZobel, calculateBaffleStep, calculateLPad } from '@/calculations/networks'
import { snapComponent } from '@/calculations/e-series'
import { calculateBoxDimensions, generateCutList, calculateSheetCount, calculateBracing, calculateDampingVolume } from '@/calculations/physical-dimensions'
import { calculateAmplifierRecommendation } from '@/calculations/amplifier'
import { exportProjectPDF } from '@/export/pdfExporter'
import { Download, Printer, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { AnimatedStep, StepHeader, StepBody } from '@/components/shared/StepWrapper'

export function Step12_ExportSummary() {
    const { settings } = useProjectStore()
    const printRef = useRef<HTMLDivElement>(null)

    const woofer = settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer')
    const tweeter = settings.drivers.find(d => d.type === 'tweeter')
    const { crossover } = settings

    const handlePrint = () => {
        window.print()
    }

    const handleExportHTML = () => {
        if (!printRef.current) return
        const content = printRef.current.innerHTML
        const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>${settings.name || 'SpeakarBuilder'} — סיכום פרויקט</title>
<style>
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; max-width: 800px; margin: 0 auto; padding: 20px; color: #222; }
h1, h2, h3 { color: #1a1a2e; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; }
th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: right; font-size: 13px; }
th { background: #f5f5f5; }
.section { margin: 20px 0; page-break-inside: avoid; }
.badge { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.warn { color: #ef4444; }
.good { color: #22c55e; }
</style>
</head>
<body>
${content}
<footer style="text-align:center; margin-top:40px; color:#888; font-size:11px;">
נוצר ע"י SpeakarBuilder | ${new Date().toLocaleDateString('he-IL')}
</footer>
</body></html>`
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${settings.name || 'SpeakarBuilder'}_Project.html`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Calculate all summaries — wrapped in try-catch for safety
    let xoR: any = null
    let dims: any = null
    let cuts: any[] = []
    let sheets: any = null
    let bracing: any = null
    let damping: any = null
    let ampRec: any = null
    let zobel: { rz: number; czMicrofarads: number } | null = null
    let bsc: { f3: number; rBsc: number; lBsc: number } | null = null
    let lpad: { r1: number; r2: number } | null = null

    try {
        if (woofer && tweeter && crossover) {
            const z = tweeter.re || 8
            if (crossover.order === 4) xoR = calculateFourthOrderLinkwitzRiley(crossover.fc, z)
            else if (crossover.order === 3) xoR = calculateThirdOrderButterworth(crossover.fc, z)
            else if (crossover.order === 2) xoR = crossover.alignment === 'linkwitz-riley' ? calculateSecondOrderLinkwitzRiley(crossover.fc, z) : calculateSecondOrderButterworth(crossover.fc, z)
            else xoR = calculateFirstOrderCrossover(crossover.fc, z)
        }
    } catch { /* ignore */ }

    try {
        const encVol = settings.enclosure?.customVolume
        const boxVb = woofer ? (encVol && encVol > 0 ? encVol : Math.max(woofer.vas * 0.707, 1)) : 10
        const wallT = settings.enclosure?.wallThickness || 18
        dims = woofer ? calculateBoxDimensions(boxVb, wallT, woofer.diameterParams || 6.5) : null
        cuts = dims ? generateCutList(dims, wallT) : []
        sheets = cuts.length > 0 ? calculateSheetCount(cuts) : null
        bracing = dims ? calculateBracing(dims.internalWidth, dims.internalHeight, dims.internalDepth, wallT) : null
        damping = woofer ? calculateDampingVolume(boxVb, settings.enclosure?.dampingFill) : null
    } catch { /* ignore */ }

    try {
        if (woofer && woofer.re > 0) {
            zobel = calculateZobel(woofer.re, woofer.le)
            bsc = calculateBaffleStep(crossover.baffleWidth, woofer.re, crossover.baffleAtten)
            if (tweeter && (tweeter.sensitivity - woofer.sensitivity > 0)) {
                lpad = calculateLPad(tweeter.re, tweeter.sensitivity - woofer.sensitivity)
            }
        }
    } catch { /* ignore */ }

    try {
        if (woofer) {
            ampRec = calculateAmplifierRecommendation(woofer.sensitivity, settings.listeningDistance, woofer.re || 8, woofer.pe || 85)
        }
    } catch { /* ignore */ }

    const configLabel = settings.configuration === '2_way' ? '2-Way' : settings.configuration === '3_way' ? '3-Way' : 'Full Range + Sub'
    const typeLabel = settings.speakerType === 'studio_monitor' ? 'מוניטור אולפני' : settings.speakerType === 'home_hifi' ? 'Hi-Fi ביתי' : 'סאבוופר'

    return (
        <AnimatedStep>
            <StepHeader title="סיכום וייצוא" subtitle={`${settings.name || 'פרויקט'} | ${typeLabel} | ${configLabel}`} icon={<FileText className="w-5 h-5" />}>
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={handlePrint}>
                    <Printer className="w-3 h-3" /> הדפסה
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={handleExportHTML}>
                    <Download className="w-3 h-3" /> HTML
                </Button>
                <Button size="sm" className="h-7 text-[11px] gap-1 bg-teal-600 hover:bg-teal-700" onClick={() => { try { exportProjectPDF(settings) } catch(e) { console.error('PDF export error:', e) } }}>
                    <FileText className="w-3 h-3" /> PDF
                </Button>
            </StepHeader>
            <StepBody>

            {/* Printable Content */}
            <div ref={printRef} className="space-y-6 print:text-black print:bg-white">
                {/* Header */}
                <div className="text-center border-b border-border/30 pb-4">
                    <h1 className="text-3xl font-bold">{settings.name || 'פרויקט ללא שם'}</h1>
                    <p className="text-muted-foreground mt-1">{typeLabel} | {configLabel} | {settings.drivers.length} דרייברים</p>
                </div>

                {/* 1. Project Overview */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> פרטי פרויקט</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><span className="text-muted-foreground">סוג:</span> <span className="font-medium">{typeLabel}</span></div>
                                <div><span className="text-muted-foreground">קונפיגורציה:</span> <span className="font-medium">{configLabel}</span></div>
                                <div><span className="text-muted-foreground">חדר:</span> <span className="font-medium">{settings.roomLength}×{settings.roomWidth}×{settings.roomHeight}m</span></div>
                                <div><span className="text-muted-foreground">מרחק האזנה:</span> <span className="font-medium">{settings.listeningDistance}m</span></div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 2. Drivers Summary */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>דרייברים</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                                        <th className="p-2 text-right">שם</th>
                                        <th className="p-2 text-right">סוג</th>
                                        <th className="p-2 text-center">Fs</th>
                                        <th className="p-2 text-center">Qts</th>
                                        <th className="p-2 text-center">Vas</th>
                                        <th className="p-2 text-center">Re</th>
                                        <th className="p-2 text-center">Sensitivity</th>
                                        <th className="p-2 text-center">Pe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {settings.drivers.map(d => (
                                        <tr key={d.id} className="border-b border-border/50">
                                            <td className="p-2 font-medium">{d.name}</td>
                                            <td className="p-2">{d.type}</td>
                                            <td className="p-2 text-center font-mono">{d.fs}Hz</td>
                                            <td className="p-2 text-center font-mono">{d.qts}</td>
                                            <td className="p-2 text-center font-mono">{d.vas}L</td>
                                            <td className="p-2 text-center font-mono">{d.re}Ω</td>
                                            <td className="p-2 text-center font-mono">{d.sensitivity}dB</td>
                                            <td className="p-2 text-center font-mono">{d.pe}W</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 3. Crossover Summary */}
                {xoR && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>קרוסאובר</CardTitle>
                                <CardDescription>
                                    {crossover.fc}Hz | Order {crossover.order} | {crossover.alignment === 'linkwitz-riley' ? 'Linkwitz-Riley' : 'Butterworth'}
                                    {crossover.acousticOffset > 0 && ` | Z-Offset: ${crossover.acousticOffset}mm`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 text-sm font-mono" dir="ltr">
                                    <div>
                                        <h4 className="font-bold text-cyan-500 mb-1 font-sans">HPF (Tweeter)</h4>
                                        {xoR.hpf.C1 && <p>C1: {snapComponent(xoR.hpf.C1, 'µF').snapped} µF</p>}
                                        {xoR.hpf.L1 && <p>L1: {snapComponent(xoR.hpf.L1, 'mH').snapped} mH</p>}
                                        {xoR.hpf.C2 && <p>C2: {snapComponent(xoR.hpf.C2, 'µF').snapped} µF</p>}
                                        {xoR.hpf.L2 && <p>L2: {snapComponent(xoR.hpf.L2, 'mH').snapped} mH</p>}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-orange-500 mb-1 font-sans">LPF (Woofer)</h4>
                                        {xoR.lpf.L1 && <p>L1: {snapComponent(xoR.lpf.L1, 'mH').snapped} mH</p>}
                                        {xoR.lpf.C1 && <p>C1: {snapComponent(xoR.lpf.C1, 'µF').snapped} µF</p>}
                                        {xoR.lpf.L2 && <p>L2: {snapComponent(xoR.lpf.L2, 'mH').snapped} mH</p>}
                                        {xoR.lpf.C2 && <p>C2: {snapComponent(xoR.lpf.C2, 'µF').snapped} µF</p>}
                                    </div>
                                </div>
                                {woofer && zobel && bsc && (
                                    <div className="mt-3 pt-3 border-t text-sm font-mono" dir="ltr">
                                        <p>Zobel: Rz={zobel.rz.toFixed(1)}Ω, Cz={zobel.czMicrofarads.toFixed(1)}µF</p>
                                        <p>BSC @ {bsc.f3.toFixed(0)}Hz: L={bsc.lBsc.toFixed(2)}mH, R={bsc.rBsc.toFixed(1)}Ω</p>
                                        {lpad && (
                                            <p>L-Pad: R1={lpad.r1.toFixed(1)}Ω, R2={lpad.r2.toFixed(1)}Ω</p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* 4. Enclosure Summary */}
                {dims && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>ארגז</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div><span className="text-muted-foreground">מידות (W×H×D):</span><br /><span className="font-mono">{dims.externalWidth.toFixed(0)}×{dims.externalHeight.toFixed(0)}×{dims.externalDepth.toFixed(0)} מ"מ</span></div>
                                    <div><span className="text-muted-foreground">נפח פנימי:</span><br /><span className="font-mono">{dims.actualInternalVolume.toFixed(1)} ליטר</span></div>
                                    {sheets && <div><span className="text-muted-foreground">MDF נדרש:</span><br /><span className="font-mono">{sheets.sheetsNeeded.toFixed(1)} לוחות ({sheets.utilization.toFixed(0)}%)</span></div>}
                                    {bracing && <div><span className="text-muted-foreground">חיזוקים:</span><br /><span className="font-mono">{bracing.description}</span></div>}
                                </div>
                                {damping && (
                                    <div className="mt-2 text-sm text-muted-foreground">
                                        ריסון: {damping.material} — {damping.volumeLiters.toFixed(1)}L / {(damping.weightGrams / 1000).toFixed(1)}kg
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* 5. Cut List */}
                {cuts.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader><CardTitle>רשימת חיתוכים</CardTitle></CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                                            <th className="p-2 text-right">חלק</th>
                                            <th className="p-2 text-center">רוחב</th>
                                            <th className="p-2 text-center">גובה</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cuts.map((cut, i) => (
                                            <tr key={i} className="border-b border-border/50">
                                                <td className="p-2">{cut.nameHe}</td>
                                                <td className="p-2 text-center font-mono">{cut.widthMm.toFixed(0)} מ"מ</td>
                                                <td className="p-2 text-center font-mono">{cut.heightMm.toFixed(0)} מ"מ</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* 6. Amplifier Summary */}
                {ampRec && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader><CardTitle>המלצת מגבר</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div><span className="text-muted-foreground">הספק מינימלי:</span><br /><span className="font-mono">{ampRec.minPowerWatts}W</span></div>
                                    <div><span className="text-muted-foreground">הספק מומלץ:</span><br /><span className="font-mono font-bold">{ampRec.recommendedPowerWatts}W</span></div>
                                    <div><span className="text-muted-foreground">קלאס:</span><br /><span className="font-mono">{ampRec.classRecommendation}</span></div>
                                    <div><span className="text-muted-foreground">Damping Factor:</span><br /><span className="font-mono">≥ {ampRec.dampingFactorMin}</span></div>
                                    <div><span className="text-muted-foreground">Headroom:</span><br /><span className="font-mono">{ampRec.headroomDb.toFixed(1)} dB</span></div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Room info */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader><CardTitle>מידע על החדר</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><span className="text-muted-foreground">אורך:</span> <span className="font-mono">{settings.roomLength}m</span></div>
                                <div><span className="text-muted-foreground">רוחב:</span> <span className="font-mono">{settings.roomWidth}m</span></div>
                                <div><span className="text-muted-foreground">גובה:</span> <span className="font-mono">{settings.roomHeight}m</span></div>
                                <div><span className="text-muted-foreground">מרחק האזנה:</span> <span className="font-mono">{settings.listeningDistance}m</span></div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground">
                <p>SpeakarBuilder — כלי תכנון רמקולים מקצועי בעברית</p>
            </div>
            </StepBody>
        </AnimatedStep>
    )
}
