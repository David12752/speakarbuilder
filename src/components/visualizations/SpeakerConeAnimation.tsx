import { motion } from 'framer-motion'

interface SpeakerConeAnimationProps {
    /** Excursion amplitude 0-1 (1 = full Xmax) */
    amplitude?: number
    /** Frequency affects animation speed */
    frequency?: number
    /** Size in pixels */
    size?: number
}

/**
 * Animated SVG speaker cone that "breathes" based on excursion amplitude.
 * Visual demonstration of cone excursion — bigger amplitude = more visible movement.
 */
export function SpeakerConeAnimation({
    amplitude = 0.5,
    frequency = 50,
    size = 200
}: SpeakerConeAnimationProps) {
    const cx = size / 2
    const cy = size / 2
    const outerR = size * 0.42
    const surround = size * 0.38
    const coneR = size * 0.30
    const dustCapR = size * 0.10
    const maxDisp = size * 0.04 * amplitude

    // Animation duration: lower frequency = slower oscillation
    const duration = Math.max(0.15, 1 / (frequency / 30))

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Speaker frame (static) */}
                <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#555" strokeWidth="3" />
                <circle cx={cx} cy={cy} r={outerR + 4} fill="none" stroke="#333" strokeWidth="1.5" />

                {/* Mounting holes */}
                {[0, 90, 180, 270].map(angle => {
                    const rad = (angle * Math.PI) / 180
                    const hx = cx + (outerR + 8) * Math.cos(rad)
                    const hy = cy + (outerR + 8) * Math.sin(rad)
                    return <circle key={angle} cx={hx} cy={hy} r={2} fill="#444" />
                })}

                {/* Surround (rubber ring) — animated */}
                <motion.circle
                    cx={cx}
                    cy={cy}
                    r={surround}
                    fill="none"
                    stroke="#666"
                    strokeWidth={size * 0.06}
                    opacity={0.4}
                    animate={{
                        r: [surround - maxDisp * 0.3, surround + maxDisp * 0.3],
                        strokeWidth: [size * 0.06 - maxDisp * 0.1, size * 0.06 + maxDisp * 0.1]
                    }}
                    transition={{
                        duration,
                        repeat: Infinity,
                        repeatType: 'reverse' as const,
                        ease: 'easeInOut' as const
                    }}
                />

                {/* Cone — animated with gradient */}
                <defs>
                    <radialGradient id="coneGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#555" />
                        <stop offset="70%" stopColor="#333" />
                        <stop offset="100%" stopColor="#222" />
                    </radialGradient>
                    <radialGradient id="dustCapGrad" cx="40%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#666" />
                        <stop offset="100%" stopColor="#333" />
                    </radialGradient>
                </defs>

                <motion.circle
                    cx={cx}
                    cy={cy}
                    r={coneR}
                    fill="url(#coneGrad)"
                    stroke="#444"
                    strokeWidth="1"
                    animate={{
                        r: [coneR - maxDisp, coneR + maxDisp]
                    }}
                    transition={{
                        duration,
                        repeat: Infinity,
                        repeatType: 'reverse' as const,
                        ease: 'easeInOut' as const
                    }}
                />

                {/* Spider/corrugation lines */}
                {[0.65, 0.75, 0.85].map((ratio, i) => (
                    <motion.circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={coneR * ratio}
                        fill="none"
                        stroke="#444"
                        strokeWidth="0.5"
                        opacity={0.3}
                        animate={{
                            r: [coneR * ratio - maxDisp * 0.7, coneR * ratio + maxDisp * 0.7]
                        }}
                        transition={{
                            duration,
                            repeat: Infinity,
                            repeatType: 'reverse' as const,
                            ease: 'easeInOut' as const
                        }}
                    />
                ))}

                {/* Dust cap — animated */}
                <motion.circle
                    cx={cx}
                    cy={cy}
                    r={dustCapR}
                    fill="url(#dustCapGrad)"
                    stroke="#555"
                    strokeWidth="1"
                    animate={{
                        r: [dustCapR - maxDisp * 1.2, dustCapR + maxDisp * 1.2]
                    }}
                    transition={{
                        duration,
                        repeat: Infinity,
                        repeatType: 'reverse' as const,
                        ease: 'easeInOut' as const
                    }}
                />

                {/* Center highlight */}
                <motion.circle
                    cx={cx - dustCapR * 0.2}
                    cy={cy - dustCapR * 0.2}
                    r={dustCapR * 0.3}
                    fill="white"
                    opacity={0.08}
                    animate={{
                        opacity: [0.06, 0.12]
                    }}
                    transition={{
                        duration,
                        repeat: Infinity,
                        repeatType: 'reverse' as const,
                        ease: 'easeInOut' as const
                    }}
                />
            </svg>

            {/* Excursion indicator */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-mono">
                {(amplitude * 100).toFixed(0)}% Xmax
            </div>
        </div>
    )
}
