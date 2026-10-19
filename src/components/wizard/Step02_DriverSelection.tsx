import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Database, Zap, Upload, Volume2 } from 'lucide-react'
import { useProjectStore, type DriverParams } from '@/store/projectStore'
import { ParameterInput } from '@/components/shared/ParameterInput'
import { calculateEBP, autoCalcMissingParams } from '@/calculations/thiele-small'
import { DRIVER_PRESETS, type DriverPreset } from '@/data/driver-presets'
import { parseFRD, parseZMA, estimateTSFromMeasurement, type FRDImportResult, type ZMAImportResult } from '@/calculations/frd-zma-import'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AnimatedStep, StepHeader, StepBody } from '@/components/shared/StepWrapper'

export function Step02_DriverSelection() {
    const { settings, updateDriver, addDriver, removeDriver } = useProjectStore()

    const handleAddDriver = () => {
        const newId = crypto.randomUUID()
        const defaultWoofer: DriverParams = {
            id: newId,
            name: `Driver ${settings.drivers.length + 1}`,
            type: 'woofer',
            diameterParams: 8,
            fs: 40,
            qts: 0.4,
            qes: 0.45,
            qms: 3.5,
            vas: 50,
            xmax: 5,
            sd: 220,
            re: 6.8,
            le: 0.8,
            sensitivity: 88,
            pe: 100,
            bl: 8,
        }
        addDriver(defaultWoofer)
    }

    const handleLoadPreset = (preset: DriverPreset) => {
        const newId = crypto.randomUUID()
        const driver: DriverParams = {
            id: newId,
            ...preset
        }
        addDriver(driver)
    }

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const content = await file.text()
        const ext = file.name.toLowerCase().split('.').pop()

        if (ext === 'frd') {
            const result: FRDImportResult = parseFRD(content, file.name)
            if (result.success) {
                // Store FRD data — create a driver with estimated sensitivity
                const newId = crypto.randomUUID()
                const driver: DriverParams = {
                    id: newId,
                    name: file.name.replace(/\.frd$/i, ''),
                    type: 'woofer',
                    diameterParams: 6.5,
                    fs: 0, qts: 0, qes: 0, qms: 0, vas: 0, xmax: 0,
                    sd: 0, re: 0, le: 0,
                    sensitivity: result.estimatedSensitivity ?? 85,
                    pe: 0, bl: 0
                }
                addDriver(driver)
                // Store measurement data
                const { settings, updateSettings } = useProjectStore.getState()
                const measurements = { ...settings.importedMeasurements }
                measurements[newId] = { frdData: result.data }
                updateSettings({ importedMeasurements: measurements })
                alert(`✅ FRD נטען בהצלחה: ${result.data.length} נקודות (${result.frequencyRange?.min.toFixed(0)}–${result.frequencyRange?.max.toFixed(0)} Hz)\nרגישות משוערת: ${result.estimatedSensitivity?.toFixed(1)} dB`)
            } else {
                alert(`❌ ${result.error}`)
            }
        } else if (ext === 'zma') {
            const result: ZMAImportResult = parseZMA(content, file.name)
            if (result.success) {
                // Try to estimate T/S params from impedance curve
                const ts = estimateTSFromMeasurement(result.data)
                const newId = crypto.randomUUID()
                const driver: DriverParams = {
                    id: newId,
                    name: file.name.replace(/\.zma$/i, ''),
                    type: 'woofer',
                    diameterParams: 6.5,
                    fs: ts?.fs ?? 0,
                    qts: ts?.qts ?? 0,
                    qes: ts?.qes ?? 0,
                    qms: ts?.qms ?? 0,
                    vas: 0, xmax: 0, sd: 0,
                    re: ts?.re ?? result.estimatedRe ?? 0,
                    le: result.estimatedLe ?? 0,
                    sensitivity: 85, pe: 0, bl: 0
                }
                addDriver(driver)
                const { settings, updateSettings } = useProjectStore.getState()
                const measurements = { ...settings.importedMeasurements }
                measurements[newId] = { zmaData: result.data }
                updateSettings({ importedMeasurements: measurements })
                alert(`✅ ZMA נטען בהצלחה: ${result.data.length} נקודות\nFs≈${result.estimatedFs}Hz, Re≈${result.estimatedRe}Ω${ts ? `, Qts≈${ts.qts}` : ''}`)
            } else {
                alert(`❌ ${result.error}`)
            }
        } else {
            alert('❌ פורמט לא נתמך. השתמשו בקבצי .frd או .zma')
        }
        // Reset input
        e.target.value = ''
    }

    return (
        <AnimatedStep>
            <StepHeader title="בחירת דרייברים" subtitle="פרמטרי Thiele-Small" icon={<Volume2 className="w-3.5 h-3.5" />}>
                <details className="relative">
                    <summary className="cursor-pointer">
                        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px]" asChild>
                            <span><Database className="w-3 h-3" /> Presets</span>
                        </Button>
                    </summary>
                    <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl w-[300px] max-h-[350px] overflow-y-auto p-1.5" dir="rtl">
                        {(['woofer', 'midrange', 'tweeter', 'subwoofer'] as const).map(type => (
                            <div key={type}>
                                <div className="text-[10px] text-muted-foreground font-bold px-2 py-1 uppercase tracking-wider">
                                    {type === 'woofer' ? 'וופרים' : type === 'midrange' ? 'מידריינג\'' : type === 'tweeter' ? 'טוויטרים' : 'סאבים'}
                                </div>
                                {DRIVER_PRESETS.filter(p => p.type === type).map((preset, i) => (
                                    <button key={i} onClick={() => handleLoadPreset(preset)}
                                        className="w-full text-right px-2 py-1.5 hover:bg-muted/50 rounded text-xs transition-colors flex justify-between items-center gap-2">
                                        <span className="font-medium">{preset.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{preset.category}</span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </details>
                <Button onClick={handleAddDriver} size="sm" className="gap-1.5 h-7 text-[11px] bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="w-3 h-3" /> הוסף
                </Button>
                <label className="cursor-pointer">
                    <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px]" asChild>
                        <span><Upload className="w-3 h-3" /> FRD/ZMA</span>
                    </Button>
                    <input type="file" accept=".frd,.zma" className="hidden" onChange={handleImportFile} />
                </label>
            </StepHeader>

            {settings.drivers.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                    <div>
                        <Volume2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">לא הוגדרו דרייברים</p>
                        <p className="text-xs">לחצו על "הוסף" או טענו מ-Presets</p>
                    </div>
                </div>
            ) : (
            <StepBody className="space-y-3">

            {settings.drivers.map((driver) => {
                // Calculate EBP directly from input
                let ebp = 0
                try {
                    ebp = calculateEBP(driver.fs, driver.qes)
                } catch {
                    ebp = 0
                }

                let ebpRecommendation = "..."
                let ebpColor = "text-muted-foreground"
                if (ebp > 0) {
                    if (ebp < 50) { ebpRecommendation = "תיבה אטומה (Sealed)"; ebpColor = "text-blue-400"; }
                    else if (ebp > 100) { ebpRecommendation = "תיבת פורט (Bass Reflex)"; ebpColor = "text-primary"; }
                    else { ebpRecommendation = "אטום או פורט (Medium EBP)"; ebpColor = "text-green-400"; }
                }

                return (
                    <Card key={driver.id} className="border-border/50 bg-card/80">
                        <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-border/50">
                            <div className="flex items-center gap-3 w-full max-w-sm">
                                <Input
                                    value={driver.name}
                                    onChange={(e) => updateDriver(driver.id, { name: e.target.value })}
                                    className="font-bold text-sm h-7 bg-background/50"
                                    placeholder="שם הדרייבר"
                                />
                                <Select value={driver.type} onValueChange={(val: any) => updateDriver(driver.id, { type: val })} dir="rtl">
                                    <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="woofer">וופר</SelectItem>
                                        <SelectItem value="midrange">מידריינג'</SelectItem>
                                        <SelectItem value="tweeter">טוויטר</SelectItem>
                                        <SelectItem value="subwoofer">סאב-וופר</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeDriver(driver.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 p-3">

                            <ParameterInput
                                id={`fs-${driver.id}`}
                                label="Fs"
                                unit="Hz"
                                tooltip="תדר התהודה החופשי של הדרייבר (Resonant Frequency)."
                                value={driver.fs}
                                onChangeValue={(val) => updateDriver(driver.id, { fs: val })}
                            />
                            <ParameterInput
                                id={`qes-${driver.id}`}
                                label="Qes"
                                tooltip="הריסון החשמלי של הרמקול (Electrical Q)."
                                value={driver.qes}
                                onChangeValue={(val) => updateDriver(driver.id, { qes: val })}
                                step={0.01}
                            />
                            <ParameterInput
                                id={`qms-${driver.id}`}
                                label="Qms"
                                tooltip="הריסון המכאני של הרמקול (Mechanical Q)."
                                value={driver.qms}
                                onChangeValue={(val) => updateDriver(driver.id, { qms: val })}
                                step={0.1}
                            />
                            <ParameterInput
                                id={`qts-${driver.id}`}
                                label="Qts"
                                tooltip="הריסון הכולל (Total Q). ערך חשוב לקביעת גודל הארגז."
                                value={driver.qts}
                                onChangeValue={(val) => updateDriver(driver.id, { qts: val })}
                                step={0.01}
                            />

                            <ParameterInput
                                id={`vas-${driver.id}`}
                                label="Vas"
                                unit="L"
                                tooltip="נפח אקוסטי שקול - משפיע ישירות על גודל הארגז שיידרש."
                                value={driver.vas}
                                onChangeValue={(val) => updateDriver(driver.id, { vas: val })}
                            />
                            <ParameterInput
                                id={`sd-${driver.id}`}
                                label="Sd"
                                unit="cm²"
                                tooltip="שטח הקונוס האפקטיבי (Effective Piston Area)."
                                value={driver.sd}
                                onChangeValue={(val) => updateDriver(driver.id, { sd: val })}
                            />
                            <ParameterInput
                                id={`xmax-${driver.id}`}
                                label="Xmax"
                                unit="mm"
                                tooltip="תזוזה מקסימלית ליניארית של הממברנה (Linear Excursion)."
                                value={driver.xmax}
                                onChangeValue={(val) => updateDriver(driver.id, { xmax: val })}
                                step={0.1}
                            />
                            <div className="flex flex-col justify-center bg-gradient-to-br from-muted/30 to-transparent p-2 rounded-lg text-center border border-border/50">
                                <span className="text-muted-foreground block text-[10px]">EBP</span>
                                <span className={`font-mono font-bold text-sm ${ebpColor}`}>{ebp.toFixed(1)}</span>
                                <span className={`text-[9px] ${ebpColor}`}>{ebpRecommendation}</span>
                            </div>

                            <ParameterInput
                                id={`re-${driver.id}`}
                                label="Re"
                                unit="Ω"
                                tooltip="התנגדות סליל ה-Voice Coil למתח ישר (DC Resistance)."
                                value={driver.re}
                                onChangeValue={(val) => updateDriver(driver.id, { re: val })}
                                step={0.1}
                            />
                            <ParameterInput
                                id={`le-${driver.id}`}
                                label="Le"
                                unit="mH"
                                tooltip="השראות הסליל. חשוב לחישוב קרוסאובר ורשת Zobel."
                                value={driver.le}
                                onChangeValue={(val) => updateDriver(driver.id, { le: val })}
                                step={0.01}
                            />
                            <ParameterInput
                                id={`sens-${driver.id}`}
                                label="Sensitivity"
                                unit="dB"
                                tooltip="נצילות (SPL ב-1W במרחק מעלה 1 מטר)."
                                value={driver.sensitivity}
                                onChangeValue={(val) => updateDriver(driver.id, { sensitivity: val })}
                                step={0.1}
                            />
                            <ParameterInput
                                id={`pe-${driver.id}`}
                                label="Pe"
                                unit="W"
                                tooltip="הספק חשמלי מקסימלי נומינלי (Power Handling)."
                                value={driver.pe}
                                onChangeValue={(val) => updateDriver(driver.id, { pe: val })}
                            />
                            <ParameterInput
                                id={`bl-${driver.id}`}
                                label="BL"
                                unit="T·m"
                                tooltip="כוח מגנטי (Force Factor). BL = שדה מגנטי × אורך סליל."
                                value={driver.bl}
                                onChangeValue={(val) => updateDriver(driver.id, { bl: val })}
                                step={0.1}
                            />
                        </CardContent>

                        {/* Auto-calc suggestions */}
                        {(() => {
                            const suggestions = autoCalcMissingParams({
                                fs: driver.fs || undefined,
                                qts: driver.qts || undefined,
                                qes: driver.qes || undefined,
                                qms: driver.qms || undefined,
                                vas: driver.vas || undefined,
                                sd: driver.sd || undefined,
                                bl: driver.bl || undefined,
                                re: driver.re || undefined,
                                sensitivity: driver.sensitivity || undefined,
                            })
                            if (suggestions.length === 0) return null
                            return (
                                <div className="mx-3 mb-2 p-2 bg-primary/10 border border-primary/30 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-primary">
                                        <Zap className="w-3 h-3" />
                                        <span>חישוב אוטומטי:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {suggestions.map((s) => (
                                            <Button
                                                key={s.field}
                                                variant="outline"
                                                size="sm"
                                                className="gap-1 text-[10px] h-6 border-primary/40 hover:bg-primary/20"
                                                onClick={() => updateDriver(driver.id, { [s.field]: s.value })}
                                            >
                                                <Zap className="w-2.5 h-2.5" />
                                                {s.label} = {s.value}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}
                    </Card>
                )
            })}
            </StepBody>
            )}
        </AnimatedStep>
    )
}
