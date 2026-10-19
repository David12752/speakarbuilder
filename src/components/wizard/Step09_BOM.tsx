import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/projectStore'
import { calculateFirstOrderCrossover, calculateSecondOrderLinkwitzRiley, calculateSecondOrderButterworth, calculateThirdOrderButterworth, calculateFourthOrderLinkwitzRiley } from '@/calculations/crossover'
import { calculateZobel, calculateBaffleStep, calculateSeriesNotch, calculateLPad } from '@/calculations/networks'
import { snapComponent } from '@/calculations/e-series'
import { calculateBoxDimensions, generateCutList, calculateSheetCount, calculateBracing, calculateDampingVolume } from '@/calculations/physical-dimensions'
import { Download, Edit2, Plus, Trash2, ClipboardList } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { AnimatedStep, StepHeader, StepBody } from '@/components/shared/StepWrapper'

interface BOMItem {
    id: string
    category: string
    name: string
    value: string
    quantity: number
    unitPrice: number
    notes: string
}

export function Step09_BOM() {
    const { settings } = useProjectStore()
    const woofer = settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer')
    const tweeter = settings.drivers.find(d => d.type === 'tweeter')
    const { crossover } = settings

    const [customItems, setCustomItems] = useState<BOMItem[]>([])
    const [editingPrices, setEditingPrices] = useState(false)
    const [prices, setPrices] = useState<Record<string, number>>({})

    // Generate BOM from all steps
    const bomItems = useMemo((): BOMItem[] => {
        const items: BOMItem[] = []

        // 1. Drivers
        settings.drivers.forEach(driver => {
            items.push({
                id: `driver-${driver.id}`,
                category: 'דרייברים',
                name: driver.name,
                value: `${driver.diameterParams}" / ${driver.re}Ω`,
                quantity: settings.speakerType === 'subwoofer' ? 1 : 2, // stereo pair
                unitPrice: prices[`driver-${driver.id}`] ?? 0,
                notes: `${driver.type} — ${driver.sensitivity}dB, ${driver.pe}W`
            })
        })

        // 2. Crossover components
        if (woofer && tweeter && crossover) {
            const z = tweeter.re
            let xoR: any = null

            if (crossover.order === 4) xoR = calculateFourthOrderLinkwitzRiley(crossover.fc, z)
            else if (crossover.order === 3) xoR = calculateThirdOrderButterworth(crossover.fc, z)
            else if (crossover.order === 2) {
                xoR = crossover.alignment === 'linkwitz-riley'
                    ? calculateSecondOrderLinkwitzRiley(crossover.fc, z)
                    : calculateSecondOrderButterworth(crossover.fc, z)
            } else xoR = calculateFirstOrderCrossover(crossover.fc, z)

            // HPF components
            if (xoR.hpf.C1) {
                const snapped = snapComponent(xoR.hpf.C1, 'µF')
                items.push({
                    id: 'xo-hpf-c1', category: 'קרוסאובר (HPF)',
                    name: `קבל C1 (Series)`, value: `${snapped.snapped} µF`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['xo-hpf-c1'] ?? 0,
                    notes: `E24: ${snapped.snapped}µF (סטייה ${snapped.deviation.toFixed(1)}%)`
                })
            }
            if (xoR.hpf.L1) {
                const snapped = snapComponent(xoR.hpf.L1, 'mH')
                items.push({
                    id: 'xo-hpf-l1', category: 'קרוסאובר (HPF)',
                    name: `סליל L1 (Shunt)`, value: `${snapped.snapped} mH`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['xo-hpf-l1'] ?? 0,
                    notes: 'Air-core recommended for HPF'
                })
            }
            if (xoR.hpf.C2) {
                const snapped = snapComponent(xoR.hpf.C2, 'µF')
                items.push({
                    id: 'xo-hpf-c2', category: 'קרוסאובר (HPF)',
                    name: `קבל C2`, value: `${snapped.snapped} µF`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['xo-hpf-c2'] ?? 0,
                    notes: `E24 snap`
                })
            }
            if (xoR.hpf.L2) {
                const snapped = snapComponent(xoR.hpf.L2, 'mH')
                items.push({
                    id: 'xo-hpf-l2', category: 'קרוסאובר (HPF)',
                    name: `סליל L2`, value: `${snapped.snapped} mH`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['xo-hpf-l2'] ?? 0,
                    notes: ''
                })
            }

            // LPF components
            if (xoR.lpf.L1) {
                const snapped = snapComponent(xoR.lpf.L1, 'mH')
                items.push({
                    id: 'xo-lpf-l1', category: 'קרוסאובר (LPF)',
                    name: `סליל L1 (Series)`, value: `${snapped.snapped} mH`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['xo-lpf-l1'] ?? 0,
                    notes: 'Ferrite core OK for LPF'
                })
            }
            if (xoR.lpf.C1) {
                const snapped = snapComponent(xoR.lpf.C1, 'µF')
                items.push({
                    id: 'xo-lpf-c1', category: 'קרוסאובר (LPF)',
                    name: `קבל C1 (Shunt)`, value: `${snapped.snapped} µF`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['xo-lpf-c1'] ?? 0,
                    notes: `E24 snap`
                })
            }
            if (xoR.lpf.L2) {
                const snapped = snapComponent(xoR.lpf.L2, 'mH')
                items.push({
                    id: 'xo-lpf-l2', category: 'קרוסאובר (LPF)',
                    name: `סליל L2`, value: `${snapped.snapped} mH`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['xo-lpf-l2'] ?? 0,
                    notes: ''
                })
            }
            if (xoR.lpf.C2) {
                const snapped = snapComponent(xoR.lpf.C2, 'µF')
                items.push({
                    id: 'xo-lpf-c2', category: 'קרוסאובר (LPF)',
                    name: `קבל C2`, value: `${snapped.snapped} µF`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['xo-lpf-c2'] ?? 0,
                    notes: ''
                })
            }

            // Zobel
            const zobel = calculateZobel(woofer.re, woofer.le)
            items.push({
                id: 'zobel-r', category: 'רשתות נוספות',
                name: 'נגד Zobel Rz', value: `${zobel.rz.toFixed(1)} Ω`,
                quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                unitPrice: prices['zobel-r'] ?? 0,
                notes: `${Math.ceil(zobel.rz)}Ω 10W wire-wound`
            })
            items.push({
                id: 'zobel-c', category: 'רשתות נוספות',
                name: 'קבל Zobel Cz', value: `${zobel.czMicrofarads.toFixed(1)} µF`,
                quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                unitPrice: prices['zobel-c'] ?? 0,
                notes: 'Non-polarized polyester/MKP'
            })

            // Baffle Step
            const bsc = calculateBaffleStep(crossover.baffleWidth, woofer.re, crossover.baffleAtten)
            items.push({
                id: 'bsc-l', category: 'רשתות נוספות',
                name: 'סליל BSC', value: `${bsc.lBsc.toFixed(2)} mH`,
                quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                unitPrice: prices['bsc-l'] ?? 0,
                notes: `Baffle Step @ ${bsc.f3.toFixed(0)}Hz`
            })
            items.push({
                id: 'bsc-r', category: 'רשתות נוספות',
                name: 'נגד BSC', value: `${bsc.rBsc.toFixed(1)} Ω`,
                quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                unitPrice: prices['bsc-r'] ?? 0,
                notes: '10W wire-wound'
            })

            // L-Pad if needed
            const sensDiff = tweeter.sensitivity - woofer.sensitivity
            if (sensDiff > 0) {
                const lpad = calculateLPad(tweeter.re, sensDiff)
                items.push({
                    id: 'lpad-r1', category: 'רשתות נוספות',
                    name: 'L-Pad R1 (Series)', value: `${lpad.r1.toFixed(1)} Ω`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['lpad-r1'] ?? 0,
                    notes: `הנחתת ${sensDiff.toFixed(1)}dB`
                })
                items.push({
                    id: 'lpad-r2', category: 'רשתות נוספות',
                    name: 'L-Pad R2 (Parallel)', value: `${lpad.r2.toFixed(1)} Ω`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['lpad-r2'] ?? 0,
                    notes: '10W wire-wound'
                })
            }

            // Notch filter
            const notch = calculateSeriesNotch(woofer.fs, woofer.re, woofer.qes, woofer.qms)
            if (notch.rNotch > 0) {
                items.push({
                    id: 'notch-r', category: 'רשתות נוספות',
                    name: 'נגד Notch', value: `${notch.rNotch.toFixed(1)} Ω`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['notch-r'] ?? 0,
                    notes: `Notch @ ${woofer.fs}Hz`
                })
                items.push({
                    id: 'notch-l', category: 'רשתות נוספות',
                    name: 'סליל Notch', value: `${notch.lNotch.toFixed(2)} mH`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['notch-l'] ?? 0,
                    notes: ''
                })
                items.push({
                    id: 'notch-c', category: 'רשתות נוספות',
                    name: 'קבל Notch', value: `${notch.cNotch.toFixed(1)} µF`,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['notch-c'] ?? 0,
                    notes: 'Non-polarized'
                })
            }
        }

        // 3. Enclosure materials
        if (woofer) {
            const encVol = settings.enclosure?.customVolume
            const Vb = encVol && encVol > 0 ? encVol : woofer.vas * 0.707
            const wallT = settings.enclosure?.wallThickness || 18
            const dims = calculateBoxDimensions(Vb, wallT, woofer.diameterParams)
            const cuts = generateCutList(dims, wallT)
            const sheets = calculateSheetCount(cuts)
            const bracing = calculateBracing(dims.internalWidth, dims.internalHeight, dims.internalDepth, wallT)
            const damping = calculateDampingVolume(Vb, settings.enclosure?.dampingFill)

            items.push({
                id: 'mdf-sheets', category: 'חומרי גלם',
                name: 'לוחות MDF 18מ"מ', value: `122×244 ס"מ`,
                quantity: Math.ceil(sheets.sheetsNeeded) * (settings.speakerType === 'subwoofer' ? 1 : 2),
                unitPrice: prices['mdf-sheets'] ?? 0,
                notes: `ניצולת ${sheets.utilization.toFixed(0)}%`
            })

            items.push({
                id: 'glue', category: 'חומרי גלם',
                name: 'דבק עץ PVA (Titebond)', value: '500ml',
                quantity: 1,
                unitPrice: prices['glue'] ?? 0,
                notes: 'Titebond II או III'
            })

            items.push({
                id: 'damping', category: 'חומרי גלם',
                name: `חומר ריסון (${damping.material})`, value: `${damping.volumeLiters.toFixed(1)} ליטר`,
                quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                unitPrice: prices['damping'] ?? 0,
                notes: `${(damping.weightGrams / 1000).toFixed(1)} ק"ג`
            })

            if (bracing.count > 0) {
                items.push({
                    id: 'bracing', category: 'חומרי גלם',
                    name: 'חיזוקים (Bracing)', value: bracing.description,
                    quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                    unitPrice: prices['bracing'] ?? 0,
                    notes: `נפח תפוסה: ${bracing.volumeDisplacement.toFixed(2)}L`
                })
            }

            // Hardware
            items.push({
                id: 'terminal', category: 'חומרה',
                name: 'מחבר רמקול (Binding Post)', value: 'Dual Banana',
                quantity: settings.speakerType === 'subwoofer' ? 1 : 2,
                unitPrice: prices['terminal'] ?? 0,
                notes: 'מוזהב מומלץ'
            })

            items.push({
                id: 'gasket', category: 'חומרה',
                name: 'אטם גומי לדרייברים', value: '3mm foam',
                quantity: settings.drivers.length * (settings.speakerType === 'subwoofer' ? 1 : 2),
                unitPrice: prices['gasket'] ?? 0,
                notes: 'Closed-cell foam tape'
            })

            items.push({
                id: 'screws', category: 'חומרה',
                name: 'ברגי מטריקה M4/M5 + T-nuts', value: 'ערכה',
                quantity: 1,
                unitPrice: prices['screws'] ?? 0,
                notes: `${settings.drivers.length * 8} ברגים בערך`
            })

            items.push({
                id: 'wire', category: 'חומרה',
                name: 'כבל רמקול OFC', value: '1.5mm² / 16AWG',
                quantity: 1,
                unitPrice: prices['wire'] ?? 0,
                notes: '2 מטר לרמקול, חמצן-free'
            })
        }

        return items
    }, [settings, woofer, tweeter, crossover, prices])

    const allItems = [...bomItems, ...customItems]
    const totalCost = allItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

    // Group by category
    const grouped = allItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
    }, {} as Record<string, BOMItem[]>)

    const handleAddCustom = () => {
        setCustomItems([...customItems, {
            id: `custom-${Date.now()}`,
            category: 'פריטים נוספים',
            name: 'פריט חדש',
            value: '',
            quantity: 1,
            unitPrice: 0,
            notes: ''
        }])
    }

    const handleRemoveCustom = (id: string) => {
        setCustomItems(customItems.filter(i => i.id !== id))
    }

    const handleExportCSV = () => {
        const header = 'קטגוריה,פריט,ערך,כמות,מחיר יחידה,סה"כ,הערות\n'
        const rows = allItems.map(item =>
            `"${item.category}","${item.name}","${item.value}",${item.quantity},${item.unitPrice},${item.unitPrice * item.quantity},"${item.notes}"`
        ).join('\n')
        const csv = '\uFEFF' + header + rows // BOM for Hebrew support
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${settings.name || 'SpeakarBuilder'}_BOM.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <AnimatedStep>
            <StepHeader title="BOM — רשימת חלקים" subtitle={`${allItems.length} פריטים | ${settings.speakerType === 'subwoofer' ? 'סאבוופר' : 'סטריאו'}`} icon={<ClipboardList className="w-5 h-5" />}>
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setEditingPrices(!editingPrices)}>
                    <Edit2 className="w-3 h-3" /> {editingPrices ? 'סיום' : 'מחירים'}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={handleAddCustom}>
                    <Plus className="w-3 h-3" /> פריט
                </Button>
                <Button size="sm" className="h-7 text-[11px] gap-1 bg-orange-600 hover:bg-orange-700" onClick={handleExportCSV}>
                    <Download className="w-3 h-3" /> CSV
                </Button>
            </StepHeader>
            <StepBody>

            {Object.entries(grouped).map(([category, items], catIdx) => (
                <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: catIdx * 0.05 }}
                >
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="py-3 border-b border-border/30">
                            <CardTitle className="text-base text-orange-400">{category}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30 text-muted-foreground text-xs">
                                        <th className="p-2 text-right font-medium">פריט</th>
                                        <th className="p-2 text-right font-medium">ערך</th>
                                        <th className="p-2 text-center font-medium">כמות</th>
                                        {editingPrices && <th className="p-2 text-center font-medium">מחיר/יח'</th>}
                                        {editingPrices && <th className="p-2 text-center font-medium">סה"כ</th>}
                                        <th className="p-2 text-right font-medium">הערות</th>
                                        <th className="p-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                            <td className="p-2 font-medium">{item.name}</td>
                                            <td className="p-2 font-mono text-xs">{item.value}</td>
                                            <td className="p-2 text-center">{item.quantity}</td>
                                            {editingPrices && (
                                                <td className="p-2 text-center">
                                                    <Input
                                                        type="number"
                                                        className="w-20 h-7 text-center mx-auto"
                                                        value={prices[item.id] ?? item.unitPrice}
                                                        onChange={(e) => setPrices({ ...prices, [item.id]: parseFloat(e.target.value) || 0 })}
                                                        step={1}
                                                        min={0}
                                                    />
                                                </td>
                                            )}
                                            {editingPrices && (
                                                <td className="p-2 text-center font-mono">
                                                    ₪{((prices[item.id] ?? item.unitPrice) * item.quantity).toFixed(0)}
                                                </td>
                                            )}
                                            <td className="p-2 text-xs text-muted-foreground">{item.notes}</td>
                                            <td className="p-2">
                                                {item.id.startsWith('custom-') && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveCustom(item.id)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}

            {editingPrices && totalCost > 0 && (
                <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30">
                    <CardContent className="p-3 flex justify-between items-center">
                        <span className="font-semibold text-sm">עלות כוללת משוערת:</span>
                        <span className="font-bold text-lg text-orange-400 font-mono">₪{totalCost.toFixed(0)}</span>
                    </CardContent>
                </Card>
            )}
            </StepBody>
        </AnimatedStep>
    )
}
