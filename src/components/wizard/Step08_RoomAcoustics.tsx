import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useProjectStore } from '@/store/projectStore'
import { ParameterInput } from '@/components/shared/ParameterInput'
import { calculateRoomModes, estimateRT60, calculateSchroederFrequency, calculatePlacement } from '@/calculations/room-acoustics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { motion } from 'framer-motion'
import { AnimatedStep, StepHeader, StepBody, GlowStat } from '@/components/shared/StepWrapper'
import { Home } from 'lucide-react'

export function Step08_RoomAcoustics() {
    const { settings } = useProjectStore()
    const [absorptionCoeff, setAbsorptionCoeff] = useState(0.2)
    const { roomLength, roomWidth, roomHeight } = settings

    const modes = useMemo(() =>
        calculateRoomModes(roomLength, roomWidth, roomHeight, 300),
        [roomLength, roomWidth, roomHeight]
    )

    const rt60 = useMemo(() =>
        estimateRT60(roomLength, roomWidth, roomHeight, absorptionCoeff),
        [roomLength, roomWidth, roomHeight, absorptionCoeff]
    )

    const schroeder = useMemo(() =>
        calculateSchroederFrequency(rt60, roomLength, roomWidth, roomHeight),
        [rt60, roomLength, roomWidth, roomHeight]
    )

    const placement = useMemo(() =>
        calculatePlacement(roomLength, roomWidth),
        [roomLength, roomWidth]
    )

    // Prepare bar chart data — group modes into frequency bins
    const chartData = useMemo(() => {
        const bins: Record<number, { axial: number; tangential: number; oblique: number }> = {}
        const binSize = 5 // 5Hz bins
        for (const mode of modes) {
            const bin = Math.floor(mode.frequency / binSize) * binSize
            if (!bins[bin]) bins[bin] = { axial: 0, tangential: 0, oblique: 0 }
            bins[bin][mode.type]++
        }
        return Object.entries(bins)
            .map(([freq, counts]) => ({
                frequency: parseInt(freq),
                axial: counts.axial,
                tangential: counts.tangential,
                oblique: counts.oblique,
                total: counts.axial + counts.tangential + counts.oblique
            }))
            .sort((a, b) => a.frequency - b.frequency)
    }, [modes])

    const axialModes = modes.filter(m => m.type === 'axial').slice(0, 12)

    return (
        <AnimatedStep>
            <StepHeader title="אקוסטיקת חדר" subtitle="מודים, RT60, מיקום" icon={<Home className="w-3.5 h-3.5" />} />

            <div className="grid grid-cols-4 gap-2 shrink-0">
                <GlowStat label="RT60" value={rt60.toFixed(2)} unit="שניות" color="rose" />
                <GlowStat label="Schroeder" value={Math.round(schroeder)} unit="Hz" color="amber" />
                <GlowStat label="מודים (300Hz↓)" value={modes.length} color="cyan" />
                <GlowStat label="Toe-in" value={`${placement.toeAngleDeg}°`} color="purple" />
            </div>

            <StepBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Controls */}
                <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>הגדרות חדר</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 p-3 bg-muted/20 rounded-xl text-sm">
                                <div className="text-center">
                                    <div className="text-muted-foreground text-xs">אורך</div>
                                    <div className="font-mono font-bold text-lg">{roomLength}m</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-muted-foreground text-xs">רוחב</div>
                                    <div className="font-mono font-bold text-lg">{roomWidth}m</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-muted-foreground text-xs">גובה</div>
                                    <div className="font-mono font-bold text-lg">{roomHeight}m</div>
                                </div>
                            </div>
                            <ParameterInput
                                id="absorption"
                                label="מקדם ספיגה ממוצע (α)"
                                tooltip="0.1 = חדר ריק, 0.3 = חדר עם טיפול אקוסטי, 0.5 = אולפן מטופל"
                                value={absorptionCoeff}
                                onChangeValue={setAbsorptionCoeff}
                                step={0.05}
                                min={0.05}
                                max={0.8}
                            />
                        </CardContent>
                    </Card>

                    {/* Axial Modes Table */}
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base">מודים אקסיאליים (חזקים ביותר)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" dir="rtl">
                                    <thead>
                                        <tr className="border-b border-border text-muted-foreground">
                                            <th className="py-2 text-right">תדר</th>
                                            <th className="py-2 text-center">ממד</th>
                                            <th className="py-2 text-center">סדר</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {axialModes.map((mode, i) => (
                                            <motion.tr
                                                key={i}
                                                className="border-b border-border/30 hover:bg-muted/50 transition-colors"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                            >
                                                <td className="py-1.5 font-mono font-bold text-rose-400">{mode.frequency} Hz</td>
                                                <td className="py-1.5 text-center">{mode.dimension}</td>
                                                <td className="py-1.5 text-center font-mono">{mode.nx},{mode.ny},{mode.nz}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Results Panel */}
                <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    {/* Placement Recommendations */}
                    <Card className="border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-rose-400">מיקום מומלץ (כלל 38%)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between p-2 rounded-lg bg-background/50">
                                <span>רמקולים מקיר קדמי:</span>
                                <span className="font-mono font-bold">{placement.speakerFromFront} m</span>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-background/50">
                                <span>מאזין מקיר קדמי:</span>
                                <span className="font-mono font-bold">{placement.listenerFromFront} m</span>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-background/50">
                                <span>מרחק בין רמקולים:</span>
                                <span className="font-mono font-bold">{placement.speakerSpacing} m</span>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-muted/30 border border-rose-500/10">
                                <span>זווית Toe-in מומלצת:</span>
                                <span className="font-mono font-bold text-rose-400">{placement.toeAngleDeg}°</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Modes Distribution Chart */}
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base">התפלגות מודים (20-300Hz)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full" dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                        <XAxis
                                            dataKey="frequency"
                                            stroke="#888"
                                            fontSize={10}
                                            tickFormatter={(v: any) => `${v}`}
                                        />
                                        <YAxis stroke="#888" fontSize={10} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                            formatter={(value: any, name: any) => [value, name === 'axial' ? 'Axial' : name === 'tangential' ? 'Tangential' : 'Oblique']}
                                            labelFormatter={(label: any) => `${label} Hz`}
                                        />
                                        {schroeder > 0 && (
                                            <ReferenceLine
                                                x={Math.round(schroeder / 5) * 5}
                                                stroke="#eab308"
                                                strokeDasharray="5 5"
                                                label={{ value: 'Schroeder', position: 'top', fill: '#eab308', fontSize: 10 }}
                                            />
                                        )}
                                        <Bar dataKey="axial" stackId="modes" fill="#ef4444" name="Axial" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="tangential" stackId="modes" fill="#f59e0b" name="Tangential" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="oblique" stackId="modes" fill="#22d3ee" name="Oblique" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Room Layout Diagram */}
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base">תרשים מיקום (מבט מלמעלה)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative bg-muted/10 border border-border/30 rounded-xl overflow-hidden" style={{ aspectRatio: `${roomLength} / ${roomWidth}` }}>
                                <svg viewBox={`0 0 ${roomLength * 100} ${roomWidth * 100}`} className="w-full h-full">
                                    {/* Room outline */}
                                    <rect x="2" y="2" width={roomLength * 100 - 4} height={roomWidth * 100 - 4} fill="none" stroke="#555" strokeWidth="2" rx="4" />

                                    {/* Speaker positions */}
                                    <motion.circle
                                        cx={placement.speakerFromFront * 100}
                                        cy={(roomWidth / 2 - placement.speakerSpacing / 2) * 100}
                                        r="8"
                                        fill="#f97316"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.4, type: 'spring' }}
                                    />
                                    <motion.circle
                                        cx={placement.speakerFromFront * 100}
                                        cy={(roomWidth / 2 + placement.speakerSpacing / 2) * 100}
                                        r="8"
                                        fill="#f97316"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.5, type: 'spring' }}
                                    />

                                    {/* Listener */}
                                    <motion.circle
                                        cx={placement.listenerFromFront * 100}
                                        cy={roomWidth * 50}
                                        r="10"
                                        fill="#06b6d4"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.6, type: 'spring' }}
                                    />

                                    {/* Lines from speakers to listener */}
                                    <line
                                        x1={placement.speakerFromFront * 100}
                                        y1={(roomWidth / 2 - placement.speakerSpacing / 2) * 100}
                                        x2={placement.listenerFromFront * 100}
                                        y2={roomWidth * 50}
                                        stroke="#555" strokeDasharray="4 4" strokeWidth="1"
                                    />
                                    <line
                                        x1={placement.speakerFromFront * 100}
                                        y1={(roomWidth / 2 + placement.speakerSpacing / 2) * 100}
                                        x2={placement.listenerFromFront * 100}
                                        y2={roomWidth * 50}
                                        stroke="#555" strokeDasharray="4 4" strokeWidth="1"
                                    />

                                    {/* Labels */}
                                    <text x={placement.speakerFromFront * 100} y={(roomWidth / 2 - placement.speakerSpacing / 2) * 100 - 14} textAnchor="middle" fill="#f97316" fontSize="8">L</text>
                                    <text x={placement.speakerFromFront * 100} y={(roomWidth / 2 + placement.speakerSpacing / 2) * 100 - 14} textAnchor="middle" fill="#f97316" fontSize="8">R</text>
                                    <text x={placement.listenerFromFront * 100} y={roomWidth * 50 - 16} textAnchor="middle" fill="#06b6d4" fontSize="8">🎧</text>

                                    {/* Front wall label */}
                                    <text x="15" y={roomWidth * 50} fill="#666" fontSize="7" transform={`rotate(-90, 15, ${roomWidth * 50})`} textAnchor="middle">קיר קדמי</text>
                                </svg>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
            </StepBody>
        </AnimatedStep>
    )
}
