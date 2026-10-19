import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/projectStore'
import { generateLogFrequencies, calculateFilterAttenuation, sumSPL } from '@/calculations/frequency-response'
import { generateImpedanceCurve, calculateGroupDelay, calculateConeExcursion } from '@/calculations/analysis'
import { generatePortVelocityCurve } from '@/calculations/ported-box'
import { generateOffAxisFrequencyResponse, generatePolarResponse, estimateBeamwidth, calculateDirectivityIndex } from '@/calculations/off-axis'
import { type PEQBand, createDefaultPEQBands, calculateTotalPEQResponse } from '@/calculations/parametric-eq'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, ComposedChart } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { SpeakerConeAnimation } from '@/components/visualizations/SpeakerConeAnimation'
import { AnimatedStep, StepHeader, StepBody } from '@/components/shared/StepWrapper'

export function Step05_FrequencyResponse() {
    const { settings } = useProjectStore()

    const woofer = settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer')
    const tweeter = settings.drivers.find(d => d.type === 'tweeter')
    const { crossover } = settings

    const [activeTab, setActiveTab] = useState<'SPL' | 'Impedance' | 'Phase' | 'GroupDelay' | 'Excursion' | 'PortVelocity' | 'OffAxis' | 'Polar' | 'EQ'>('SPL')
    const [peqBands, setPeqBands] = useState<PEQBand[]>(createDefaultPEQBands())

    const updatePEQBand = (id: string, updates: Partial<PEQBand>) => {
        setPeqBands(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    }

    const splData = useMemo(() => {
        if (!woofer || !tweeter || !crossover) return []

        const freqs = generateLogFrequencies(20, 20000, 150)

        return freqs.map(f => {
            // Simplified acoustic model to show visual feedback

            // Woofer response (LPF applied)
            const wLpfAtten = calculateFilterAttenuation(f, crossover.fc, 'LPF', crossover.order, crossover.alignment)

            // Basic acoustic roll-off from driver Fs (approx 12dB/oct below Fs)
            const wHpAcoustic = f < woofer.fs ? 40 * Math.log10(f / woofer.fs) : 0
            const wSPL = woofer.sensitivity + wLpfAtten + Math.max(wHpAcoustic, -40)

            // Tweeter response (HPF applied + L-pad attenuation)
            const tHpfAtten = calculateFilterAttenuation(f, crossover.fc, 'HPF', crossover.order, crossover.alignment)

            // L-pad attenuates tweeter to match woofer if tweeter is louder
            const sensDiff = tweeter.sensitivity - woofer.sensitivity
            const lpadAtten = sensDiff > 0 ? -sensDiff : 0

            const tHpAcoustic = f < tweeter.fs ? 40 * Math.log10(f / tweeter.fs) : 0
            const tSPL = tweeter.sensitivity + tHpfAtten + lpadAtten + Math.max(tHpAcoustic, -40)

            // Combined Response (SPL sum - basic coherent power sum)
            const totalSPL = sumSPL(wSPL, tSPL)

            return {
                frequency: Math.round(f),
                woofer: wSPL > 40 ? parseFloat(wSPL.toFixed(1)) : null,
                tweeter: tSPL > 40 ? parseFloat(tSPL.toFixed(1)) : null,
                total: totalSPL > 40 ? parseFloat(totalSPL.toFixed(1)) : null
            }
        })
    }, [woofer, tweeter, crossover])

    const impedanceData = useMemo(() => {
        if (!woofer) return []
        return generateImpedanceCurve(woofer.fs, woofer.re, woofer.qes, woofer.qms, woofer.le)
    }, [woofer])

    const groupDelayData = useMemo(() => {
        if (impedanceData.length === 0) return []
        return calculateGroupDelay(impedanceData)
    }, [impedanceData])

    // Cone excursion data
    const excursionData = useMemo(() => {
        if (!woofer) return []
        const freqs = generateLogFrequencies(10, 2000, 120)
        const inputPower = woofer.pe / 2 // half-rated power for typical use
        return freqs.map(f => {
            const xMm = calculateConeExcursion(f, woofer.fs, woofer.qts, woofer.sd, woofer.bl, woofer.re, inputPower)
            return {
                frequency: Math.round(f),
                excursion: parseFloat(Math.min(xMm, woofer.xmax * 3).toFixed(3)),
                xmax: woofer.xmax
            }
        })
    }, [woofer])

    // Port velocity data
    const portVelocityData = useMemo(() => {
        if (!woofer || !woofer.bl) return []
        // Default port params if not explicitly set
        const portDia = 7 // cm default
        const fb = woofer.fs * 0.95 // typical ported tuning near Fs
        const inputPower = woofer.pe / 2
        return generatePortVelocityCurve(
            woofer.fs, woofer.qts, woofer.sd, woofer.bl, woofer.re,
            inputPower, portDia, fb, 1, 10, 500, 100
        )
    }, [woofer])

    // Off-axis frequency response data
    const offAxisData = useMemo(() => {
        if (!woofer) return []
        const onAxis = generateOffAxisFrequencyResponse(0, woofer.diameterParams, woofer.sensitivity, 100, 20000, 150)
        const off15 = generateOffAxisFrequencyResponse(15, woofer.diameterParams, woofer.sensitivity, 100, 20000, 150)
        const off30 = generateOffAxisFrequencyResponse(30, woofer.diameterParams, woofer.sensitivity, 100, 20000, 150)
        const off45 = generateOffAxisFrequencyResponse(45, woofer.diameterParams, woofer.sensitivity, 100, 20000, 150)
        const off60 = generateOffAxisFrequencyResponse(60, woofer.diameterParams, woofer.sensitivity, 100, 20000, 150)
        return onAxis.map((d, i) => ({
            frequency: d.frequency,
            'On-Axis': d.spl,
            '15°': off15[i]?.spl ?? null,
            '30°': off30[i]?.spl ?? null,
            '45°': off45[i]?.spl ?? null,
            '60°': off60[i]?.spl ?? null,
        }))
    }, [woofer])

    // Polar response data at key frequencies
    const polarData = useMemo(() => {
        if (!woofer) return { data1k: [], data2k: [], data5k: [], data10k: [], beamwidths: {} as Record<string, number>, di: {} as Record<string, number> }
        const data1k = generatePolarResponse(1000, woofer.diameterParams, woofer.sensitivity)
        const data2k = generatePolarResponse(2000, woofer.diameterParams, woofer.sensitivity)
        const data5k = generatePolarResponse(5000, woofer.diameterParams, woofer.sensitivity)
        const data10k = generatePolarResponse(10000, woofer.diameterParams, woofer.sensitivity)
        const beamwidths = {
            '1kHz': estimateBeamwidth(1000, woofer.diameterParams),
            '2kHz': estimateBeamwidth(2000, woofer.diameterParams),
            '5kHz': estimateBeamwidth(5000, woofer.diameterParams),
            '10kHz': estimateBeamwidth(10000, woofer.diameterParams),
        }
        const di = {
            '1kHz': calculateDirectivityIndex(1000, woofer.diameterParams),
            '2kHz': calculateDirectivityIndex(2000, woofer.diameterParams),
            '5kHz': calculateDirectivityIndex(5000, woofer.diameterParams),
            '10kHz': calculateDirectivityIndex(10000, woofer.diameterParams),
        }
        return { data1k, data2k, data5k, data10k, beamwidths, di }
    }, [woofer])

    // EQ response data — shows original + EQ'd response
    const eqData = useMemo(() => {
        if (!woofer || !tweeter || !crossover) return []
        const freqs = generateLogFrequencies(20, 20000, 150)
        return freqs.map(f => {
            const wLpfAtten = calculateFilterAttenuation(f, crossover.fc, 'LPF', crossover.order, crossover.alignment)
            const wHpAcoustic = f < woofer.fs ? 40 * Math.log10(f / woofer.fs) : 0
            const wSPL = woofer.sensitivity + wLpfAtten + Math.max(wHpAcoustic, -40)
            const tHpfAtten = calculateFilterAttenuation(f, crossover.fc, 'HPF', crossover.order, crossover.alignment)
            const sensDiff = tweeter.sensitivity - woofer.sensitivity
            const lpadAtten = sensDiff > 0 ? -sensDiff : 0
            const tHpAcoustic = f < tweeter.fs ? 40 * Math.log10(f / tweeter.fs) : 0
            const tSPL = tweeter.sensitivity + tHpfAtten + lpadAtten + Math.max(tHpAcoustic, -40)
            const totalSPL = sumSPL(wSPL, tSPL)
            const eqGain = calculateTotalPEQResponse(peqBands, f)
            const eqSPL = totalSPL + eqGain
            return {
                frequency: Math.round(f),
                original: totalSPL > 40 ? parseFloat(totalSPL.toFixed(1)) : null,
                corrected: eqSPL > 40 ? parseFloat(eqSPL.toFixed(1)) : null,
                eqCurve: parseFloat(eqGain.toFixed(1)),
            }
        })
    }, [woofer, tweeter, crossover, peqBands])

    if (!woofer || !tweeter) {
        return (
            <div className="text-center p-12 bg-card border border-dashed rounded-lg text-muted-foreground animate-pulse">
                חסרים נתוני דרייברים לביצוע סימולציית תגובת תדר. לחצו "הקודם" כדי להגדיר דרייברים וקרוסאובר.
            </div>
        )
    }

    const formatXAxis = (tickItem: number) => {
        if (tickItem >= 1000) return `${tickItem / 1000}k`
        return `${tickItem}`
    }

    return (
        <AnimatedStep>
            <StepHeader title="סימולציית תגובת תדר" subtitle="SPL, עכבה, Off-Axis" icon={<span className="text-xs">📈</span>}>
                {(['SPL','Impedance','Phase','GroupDelay','Excursion','PortVelocity','OffAxis','Polar','EQ'] as const).map(tab => (
                    <Button key={tab} variant={activeTab === tab ? 'default' : 'ghost'} size="sm"
                        className={`h-6 text-[10px] px-2 ${activeTab === tab ? '' : ''}`}
                        onClick={() => setActiveTab(tab)}>
                        {tab === 'SPL' ? 'SPL' : tab === 'Impedance' ? 'עכבה' : tab === 'Phase' ? 'מופע' : tab === 'GroupDelay' ? 'GD' : tab === 'Excursion' ? 'Exc' : tab === 'PortVelocity' ? 'Port' : tab === 'OffAxis' ? 'Off-Ax' : tab === 'Polar' ? 'Polar' : 'EQ'}
                    </Button>
                ))}
            </StepHeader>

            <StepBody>

            <Card className="border-border shadow-sm overflow-hidden">
                <CardContent className="p-3">
                    <div className="h-[400px] w-full relative" dir="ltr">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0"
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    {activeTab === 'SPL' && (
                                        <LineChart data={splData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis
                                                dataKey="frequency"
                                                scale="log"
                                                domain={[20, 20000]}
                                                type="number"
                                                ticks={[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]}
                                                tickFormatter={formatXAxis}
                                                stroke="#888888"
                                                fontSize={12}
                                            />
                                            <YAxis
                                                domain={[60, 105]}
                                                stroke="#888888"
                                                fontSize={12}
                                                tickFormatter={(v: any) => `${v}dB`}
                                            />
                                            <Tooltip
                                                formatter={(value: any, name: any) => [`${value} dB`, name]}
                                                labelFormatter={(label: any) => `${label} Hz`}
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            />
                                            <Legend verticalAlign="top" height={36} />

                                            <Line
                                                type="monotone"
                                                dataKey="total"
                                                name="Total (Summed)"
                                                stroke="#eab308"
                                                strokeWidth={3}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="woofer"
                                                name="Woofer"
                                                stroke="#f97316"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="tweeter"
                                                name="Tweeter"
                                                stroke="#06b6d4"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        </LineChart>
                                    )}

                                    {activeTab === 'Impedance' && (
                                        <LineChart data={impedanceData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis
                                                dataKey="frequency"
                                                scale="log"
                                                domain={[20, 20000]}
                                                type="number"
                                                ticks={[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]}
                                                tickFormatter={formatXAxis}
                                                stroke="#888888"
                                                fontSize={12}
                                            />
                                            <YAxis stroke="#888888" fontSize={12} tickFormatter={(v: any) => `${v}Ω`} />
                                            <Tooltip
                                                formatter={(value: any) => [`${value} Ω`, 'Impedance']}
                                                labelFormatter={(label: any) => `${label} Hz`}
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="impedance"
                                                name="Impedance"
                                                stroke="#8b5cf6"
                                                strokeWidth={3}
                                                dot={false}
                                            />
                                        </LineChart>
                                    )}

                                    {activeTab === 'Phase' && (
                                        <LineChart data={impedanceData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis
                                                dataKey="frequency"
                                                scale="log"
                                                domain={[20, 20000]}
                                                type="number"
                                                ticks={[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]}
                                                tickFormatter={formatXAxis}
                                                stroke="#888888"
                                                fontSize={12}
                                            />
                                            <YAxis stroke="#888888" fontSize={12} tickFormatter={(v: any) => `${v}°`} domain={[-180, 180]} ticks={[-180, -90, 0, 90, 180]} />
                                            <Tooltip
                                                formatter={(value: any) => [`${value}°`, 'Phase']}
                                                labelFormatter={(label: any) => `${label} Hz`}
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="phase"
                                                name="Phase"
                                                stroke="#ec4899"
                                                strokeWidth={3}
                                                dot={false}
                                            />
                                        </LineChart>
                                    )}

                                    {activeTab === 'GroupDelay' && (
                                        <LineChart data={groupDelayData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis
                                                dataKey="frequency"
                                                scale="log"
                                                domain={[20, 20000]}
                                                type="number"
                                                ticks={[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]}
                                                tickFormatter={formatXAxis}
                                                stroke="#888888"
                                                fontSize={12}
                                            />
                                            <YAxis stroke="#888888" fontSize={12} tickFormatter={(v: any) => `${v}ms`} />
                                            <Tooltip
                                                formatter={(value: any) => [`${value} ms`, 'Group Delay']}
                                                labelFormatter={(label: any) => `${label} Hz`}
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="groupDelay"
                                                name="Group Delay"
                                                stroke="#22d3ee"
                                                strokeWidth={3}
                                                dot={false}
                                            />
                                        </LineChart>
                                    )}

                                    {activeTab === 'Excursion' && (
                                        <ComposedChart data={excursionData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis
                                                dataKey="frequency"
                                                scale="log"
                                                domain={[10, 2000]}
                                                type="number"
                                                ticks={[10, 20, 50, 100, 200, 500, 1000, 2000]}
                                                tickFormatter={formatXAxis}
                                                stroke="#888888"
                                                fontSize={12}
                                            />
                                            <YAxis stroke="#888888" fontSize={12} tickFormatter={(v: any) => `${v}mm`} />
                                            <Tooltip
                                                formatter={(value: any, name: any) => [
                                                    `${value} mm`,
                                                    name === 'excursion' ? 'תזוזה' : 'Xmax'
                                                ]}
                                                labelFormatter={(label: any) => `${label} Hz`}
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            />
                                            <Legend verticalAlign="top" height={36} />
                                            {woofer && (
                                                <ReferenceLine
                                                    y={woofer.xmax}
                                                    stroke="#ef4444"
                                                    strokeDasharray="8 4"
                                                    strokeWidth={2}
                                                    label={{ value: `Xmax = ${woofer.xmax}mm`, fill: '#ef4444', fontSize: 12 }}
                                                />
                                            )}
                                            <Area
                                                type="monotone"
                                                dataKey="excursion"
                                                name="Cone Excursion"
                                                stroke="#f59e0b"
                                                fill="#f59e0b"
                                                fillOpacity={0.2}
                                                strokeWidth={3}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        </ComposedChart>
                                    )}

                                    {activeTab === 'PortVelocity' && (
                                        <ComposedChart data={portVelocityData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis
                                                dataKey="frequency"
                                                scale="log"
                                                domain={[10, 500]}
                                                type="number"
                                                ticks={[10, 20, 50, 100, 200, 500]}
                                                tickFormatter={formatXAxis}
                                                stroke="#888888"
                                                fontSize={12}
                                            />
                                            <YAxis stroke="#888888" fontSize={12} tickFormatter={(v: any) => `${v}m/s`} />
                                            <Tooltip
                                                formatter={(value: any) => [`${value} m/s`, 'Port Velocity']}
                                                labelFormatter={(label: any) => `${label} Hz`}
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            />
                                            <ReferenceLine
                                                y={17.15}
                                                stroke="#ef4444"
                                                strokeDasharray="8 4"
                                                strokeWidth={2}
                                                label={{ value: 'Chuffing Threshold (17 m/s)', fill: '#ef4444', fontSize: 12 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="velocity"
                                                name="Port Velocity"
                                                stroke="#10b981"
                                                fill="#10b981"
                                                fillOpacity={0.15}
                                                strokeWidth={3}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        </ComposedChart>
                                    )}

                                    {activeTab === 'OffAxis' && (
                                        <LineChart data={offAxisData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis
                                                dataKey="frequency"
                                                scale="log"
                                                domain={[100, 20000]}
                                                type="number"
                                                ticks={[100, 200, 500, 1000, 2000, 5000, 10000, 20000]}
                                                tickFormatter={formatXAxis}
                                                stroke="#888888"
                                                fontSize={12}
                                            />
                                            <YAxis domain={[40, 100]} stroke="#888888" fontSize={12} tickFormatter={(v: any) => `${v}dB`} />
                                            <Tooltip
                                                formatter={(value: any, name: any) => [`${value} dB`, name]}
                                                labelFormatter={(label: any) => `${label} Hz`}
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            />
                                            <Legend verticalAlign="top" height={36} />
                                            <Line type="monotone" dataKey="On-Axis" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                            <Line type="monotone" dataKey="15°" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="2 2" />
                                            <Line type="monotone" dataKey="30°" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                                            <Line type="monotone" dataKey="45°" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                                            <Line type="monotone" dataKey="60°" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="8 4" />
                                        </LineChart>
                                    )}

                                    {activeTab === 'Polar' && (
                                        <LineChart data={polarData.data1k.map((d, i) => ({
                                            angle: d.angle,
                                            '1kHz': d.spl,
                                            '2kHz': polarData.data2k[i]?.spl,
                                            '5kHz': polarData.data5k[i]?.spl,
                                            '10kHz': polarData.data10k[i]?.spl,
                                        }))} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis
                                                dataKey="angle"
                                                domain={[0, 180]}
                                                type="number"
                                                ticks={[0, 15, 30, 45, 60, 90, 120, 150, 180]}
                                                tickFormatter={(v: any) => `${v}°`}
                                                stroke="#888888"
                                                fontSize={12}
                                            />
                                            <YAxis domain={[30, 100]} stroke="#888888" fontSize={12} tickFormatter={(v: any) => `${v}dB`} />
                                            <Tooltip
                                                formatter={(value: any, name: any) => [`${value} dB`, name]}
                                                labelFormatter={(label: any) => `${label}°`}
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            />
                                            <Legend verticalAlign="top" height={36} />
                                            <Line type="monotone" dataKey="1kHz" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="2kHz" stroke="#22c55e" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="5kHz" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="10kHz" stroke="#ef4444" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    )}

                                    {activeTab === 'EQ' && (
                                        <LineChart data={eqData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis
                                                dataKey="frequency"
                                                scale="log"
                                                domain={[20, 20000]}
                                                type="number"
                                                ticks={[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]}
                                                tickFormatter={formatXAxis}
                                                stroke="#888888"
                                                fontSize={12}
                                            />
                                            <YAxis domain={[60, 105]} stroke="#888888" fontSize={12} tickFormatter={(v: any) => `${v}dB`} />
                                            <Tooltip
                                                formatter={(value: any, name: any) => [`${value} dB`, name]}
                                                labelFormatter={(label: any) => `${label} Hz`}
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            />
                                            <Legend verticalAlign="top" height={36} />
                                            <Line type="monotone" dataKey="original" name="מקורי" stroke="#666" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                            <Line type="monotone" dataKey="corrected" name="אחרי EQ" stroke="#22c55e" strokeWidth={3} dot={false} />
                                        </LineChart>
                                    )}
                                </ResponsiveContainer>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>

            {/* Beamwidth & Directivity Index Info */}
            {(activeTab === 'Polar' || activeTab === 'OffAxis') && woofer && (
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Beamwidth & Directivity Index — {woofer.name} ({woofer.diameterParams}&quot;)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-3 text-center text-sm">
                            {Object.entries(polarData.beamwidths).map(([freq, bw]) => (
                                <div key={freq} className="bg-muted/30 p-3 rounded-md border">
                                    <div className="text-xs text-muted-foreground">{freq}</div>
                                    <div className="text-lg font-mono font-bold">{bw}°</div>
                                    <div className="text-xs text-muted-foreground">beamwidth -6dB</div>
                                    <div className="text-sm font-mono text-primary mt-1">DI: {(polarData.di as Record<string, number>)[freq]}dB</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Parametric EQ Controls */}
            {activeTab === 'EQ' && (
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardHeader>
                        <CardTitle className="text-emerald-400">🎛️ אקולייזר פרמטרי (Parametric EQ)</CardTitle>
                        <CardDescription>הוסיפו פילטרי תיקון לשיפוע תגובת התדר. השינויים מוצגים בגרף למעלה בזמן אמת.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {peqBands.map((band) => (
                            <div key={band.id} className={`grid grid-cols-5 gap-3 items-center p-3 rounded-lg border ${band.enabled ? 'bg-background border-emerald-500/30' : 'bg-muted/10 border-border opacity-60'}`}>
                                <div className="flex items-center gap-2">
                                    <button
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${band.enabled ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-muted-foreground'}`}
                                        onClick={() => updatePEQBand(band.id, { enabled: !band.enabled })}
                                    >
                                        {band.enabled ? '✓' : ''}
                                    </button>
                                    <Select value={band.type} onValueChange={(val: any) => updatePEQBand(band.id, { type: val })} dir="rtl">
                                        <SelectTrigger className="h-8 text-xs w-28">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="peak">Peak</SelectItem>
                                            <SelectItem value="lowShelf">Low Shelf</SelectItem>
                                            <SelectItem value="highShelf">High Shelf</SelectItem>
                                            <SelectItem value="notch">Notch</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="text-center">
                                    <label className="text-xs text-muted-foreground block">Freq</label>
                                    <input
                                        type="number"
                                        className="w-full bg-background border rounded px-2 py-1 text-sm text-center font-mono"
                                        value={band.frequency}
                                        onChange={(e) => updatePEQBand(band.id, { frequency: Math.max(20, Math.min(20000, Number(e.target.value))) })}
                                        min={20}
                                        max={20000}
                                    />
                                    <span className="text-xs text-muted-foreground">Hz</span>
                                </div>
                                <div className="text-center">
                                    <label className="text-xs text-muted-foreground block">Gain</label>
                                    <input
                                        type="range"
                                        className="w-full accent-emerald-500"
                                        value={band.gain}
                                        onChange={(e) => updatePEQBand(band.id, { gain: Number(e.target.value) })}
                                        min={-12}
                                        max={12}
                                        step={0.5}
                                    />
                                    <span className="text-xs font-mono">{band.gain > 0 ? '+' : ''}{band.gain}dB</span>
                                </div>
                                <div className="text-center">
                                    <label className="text-xs text-muted-foreground block">Q</label>
                                    <input
                                        type="number"
                                        className="w-full bg-background border rounded px-2 py-1 text-sm text-center font-mono"
                                        value={band.q}
                                        onChange={(e) => updatePEQBand(band.id, { q: Math.max(0.1, Math.min(30, Number(e.target.value))) })}
                                        min={0.1}
                                        max={30}
                                        step={0.1}
                                    />
                                </div>
                                <div className="text-center text-xs text-muted-foreground font-mono">
                                    {band.enabled ? (
                                        <span className="text-emerald-400">פעיל</span>
                                    ) : (
                                        <span>כבוי</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => setPeqBands(prev => [...prev, {
                                id: `peq${prev.length + 1}`,
                                enabled: true,
                                type: 'peak' as const,
                                frequency: 1000,
                                gain: 0,
                                q: 2,
                            }])}
                        >
                            + הוסף פס EQ
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Speaker Cone Animation */}
            {woofer && (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-base">אנימציית קונוס (Cone Motion)</CardTitle>
                        <CardDescription>
                            הדמיה ויזואלית של תנועת הקונוס. המשרעת מבוססת על Xmax = {woofer.xmax}mm.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <SpeakerConeAnimation
                            amplitude={woofer.xmax / 10}
                            frequency={crossover?.fc ? Math.min(crossover.fc / 50, 3) : 1}
                        />
                    </CardContent>
                </Card>
            )}
            </StepBody>
        </AnimatedStep>
    )
}
