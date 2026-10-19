import React from 'react'
import { motion } from 'framer-motion'

interface CrossoverSchematicProps {
    order: 1 | 2 | 3 | 4
    type: 'HPF' | 'LPF' | 'both'
    c1?: number
    c2?: number
    l1?: number
    l2?: number
    width?: number
    height?: number
}

/**
 * Animated SVG crossover circuit schematic.
 * Shows capacitors, inductors, and signal flow with animated electrons.
 */
export function CrossoverSchematic({
    order,
    type,
    c1, c2, l1, l2,
    width = 400,
    height = 160
}: CrossoverSchematicProps) {
    const mid = height / 2
    const startX = 30
    const endX = width - 30
    const segW = (endX - startX) / (order + 2)

    // Signal flow dots
    const dotCount = 6
    const dots = Array.from({ length: dotCount }, (_, i) => i)

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
            {/* Background glow */}
            <defs>
                <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.5" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Main wire */}
            <line x1={startX} y1={mid} x2={endX} y2={mid} stroke="#555" strokeWidth="2" />
            {/* Ground wire */}
            <line x1={startX} y1={mid + 40} x2={endX} y2={mid + 40} stroke="#444" strokeWidth="1.5" strokeDasharray="4 2" />

            {/* Input label */}
            <text x={startX - 5} y={mid - 8} textAnchor="end" fill="#888" fontSize="10">IN</text>
            {/* Output label */}
            <text x={endX + 5} y={mid - 8} textAnchor="start" fill="#f97316" fontSize="10">OUT</text>

            {/* Signal flow animation */}
            {dots.map(i => (
                <motion.circle
                    key={i}
                    cy={mid}
                    r={2.5}
                    fill="#06b6d4"
                    filter="url(#glow)"
                    opacity={0.8}
                    animate={{
                        cx: [startX, endX]
                    }}
                    transition={{
                        duration: 2,
                        delay: i * (2 / dotCount),
                        repeat: Infinity,
                        ease: 'linear' as const
                    }}
                />
            ))}

            {/* Components based on order and type */}
            {renderComponents(order, type, startX, mid, segW, c1, c2, l1, l2)}

            {/* Speaker icon at output */}
            <g transform={`translate(${endX - 5},${mid - 12})`}>
                <rect x="0" y="4" width="6" height="16" fill="none" stroke="#f97316" strokeWidth="1.5" rx="1" />
                <polygon points="6,2 16,0 16,24 6,22" fill="none" stroke="#f97316" strokeWidth="1.5" />
                {/* Sound waves */}
                <motion.path
                    d="M 18 8 Q 22 12 18 16"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1"
                    opacity={0.6}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            </g>
        </svg>
    )
}

function renderComponents(
    order: number, type: string,
    startX: number, mid: number, segW: number,
    c1?: number, c2?: number, l1?: number, l2?: number
) {
    const components: React.ReactNode[] = []

    const addCapacitor = (x: number, label: string, value?: number, orientation: 'series' | 'shunt' = 'series') => {
        if (orientation === 'series') {
            components.push(
                <g key={`cap-${label}`} transform={`translate(${x},${mid})`}>
                    <motion.line x1={-8} y1={0} x2={-2} y2={0} stroke="#22d3ee" strokeWidth="2"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }}
                    />
                    <motion.line x1={-2} y1={-10} x2={-2} y2={10} stroke="#22d3ee" strokeWidth="2.5"
                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3, delay: 0.2 }}
                    />
                    <motion.line x1={2} y1={-10} x2={2} y2={10} stroke="#22d3ee" strokeWidth="2.5"
                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3, delay: 0.3 }}
                    />
                    <motion.line x1={2} y1={0} x2={8} y2={0} stroke="#22d3ee" strokeWidth="2"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.4 }}
                    />
                    {value !== undefined && (
                        <text x={0} y={-14} textAnchor="middle" fill="#22d3ee" fontSize="9" fontFamily="monospace">
                            {value.toFixed(1)}µF
                        </text>
                    )}
                </g>
            )
        } else {
            // shunt to ground
            components.push(
                <g key={`cap-shunt-${label}`} transform={`translate(${x},${mid})`}>
                    <line x1={0} y1={0} x2={0} y2={15} stroke="#888" strokeWidth="1.5" />
                    <line x1={-6} y1={15} x2={6} y2={15} stroke="#22d3ee" strokeWidth="2" />
                    <line x1={-6} y1={19} x2={6} y2={19} stroke="#22d3ee" strokeWidth="2" />
                    <line x1={0} y1={19} x2={0} y2={40} stroke="#888" strokeWidth="1.5" />
                    {value !== undefined && (
                        <text x={12} y={20} textAnchor="start" fill="#22d3ee" fontSize="8" fontFamily="monospace">
                            {value.toFixed(1)}µF
                        </text>
                    )}
                </g>
            )
        }
    }

    const addInductor = (x: number, label: string, value?: number, orientation: 'series' | 'shunt' = 'series') => {
        if (orientation === 'series') {
            components.push(
                <g key={`ind-${label}`} transform={`translate(${x},${mid})`}>
                    <motion.path
                        d="M -10 0 Q -7 -8 -4 0 Q -1 -8 2 0 Q 5 -8 8 0 Q 11 -8 14 0"
                        fill="none" stroke="#a78bfa" strokeWidth="2"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
                    />
                    {value !== undefined && (
                        <text x={2} y={-10} textAnchor="middle" fill="#a78bfa" fontSize="9" fontFamily="monospace">
                            {value.toFixed(2)}mH
                        </text>
                    )}
                </g>
            )
        } else {
            // shunt to ground
            components.push(
                <g key={`ind-shunt-${label}`} transform={`translate(${x},${mid})`}>
                    <line x1={0} y1={0} x2={0} y2={8} stroke="#888" strokeWidth="1.5" />
                    <motion.path
                        d={`M 0 8 Q 8 12 0 16 Q 8 20 0 24 Q 8 28 0 32`}
                        fill="none" stroke="#a78bfa" strokeWidth="2"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
                    />
                    <line x1={0} y1={32} x2={0} y2={40} stroke="#888" strokeWidth="1.5" />
                    {value !== undefined && (
                        <text x={14} y={24} fill="#a78bfa" fontSize="8" fontFamily="monospace">
                            {value.toFixed(2)}mH
                        </text>
                    )}
                </g>
            )
        }
    }

    // Build circuit based on type and order
    if (type === 'HPF' || type === 'both') {
        addCapacitor(startX + segW, 'C1', c1, 'series')
        if (order >= 2) addInductor(startX + segW * 1.6, 'L1-shunt', l1, 'shunt')
        if (order >= 3) addCapacitor(startX + segW * 2.2, 'C2', c2, 'series')
        if (order >= 4) addInductor(startX + segW * 2.8, 'L2-shunt', l2, 'shunt')
    } else {
        addInductor(startX + segW, 'L1', l1, 'series')
        if (order >= 2) addCapacitor(startX + segW * 1.6, 'C1-shunt', c1, 'shunt')
        if (order >= 3) addInductor(startX + segW * 2.2, 'L2', l2, 'series')
        if (order >= 4) addCapacitor(startX + segW * 2.8, 'C2-shunt', c2, 'shunt')
    }

    return <>{components}</>
}
