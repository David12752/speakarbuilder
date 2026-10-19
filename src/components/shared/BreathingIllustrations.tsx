/**
 * Breathing SVG illustrations for each wizard step.
 * Each illustration uses CSS animations for smooth, gentle motion.
 * No framer-motion dependency — pure CSS keyframes for performance.
 */

const breatheStyle = `
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.06); opacity: 1; }
}
@keyframes breatheSlow {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.04); opacity: 0.8; }
}
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
@keyframes waveSlide {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`

function InjectStyles() {
    return <style>{breatheStyle}</style>
}

/** Step 01 - Project Setup: Blueprint grid + speaker outline */
export function IllustrationProject({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Grid */}
            {Array.from({ length: 8 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 20 + 10} x2="160" y2={i * 20 + 10} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 20 + 10} y1="0" x2={i * 20 + 10} y2="160" stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />
            ))}
            {/* Speaker cabinet outline */}
            <g style={{ animation: 'breatheSlow 4s ease-in-out infinite' }}>
                <rect x="45" y="25" width="70" height="110" rx="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="4 3" />
                <circle cx="80" cy="75" r="22" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
                <circle cx="80" cy="75" r="8" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                <circle cx="80" cy="38" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
                <circle cx="80" cy="38" r="4" fill="currentColor" fillOpacity="0.1" />
            </g>
            {/* Breathing glow around woofer */}
            <circle cx="80" cy="75" r="28" stroke="currentColor" strokeOpacity="0.1" strokeWidth="8" style={{ animation: 'breathe 3s ease-in-out infinite' }} />
        </svg>
    )
}

/** Step 02 - Driver Selection: Cone cross-section with breathing suspension */
export function IllustrationDriver({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Back plate */}
            <rect x="65" y="90" width="30" height="40" rx="2" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.15" />
            {/* Magnet */}
            <rect x="58" y="100" width="44" height="20" rx="3" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            {/* Voice coil */}
            <rect x="73" y="70" width="14" height="35" rx="1" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
            {/* Cone with breathing */}
            <g style={{ animation: 'breathe 2.5s ease-in-out infinite' }}>
                <path d="M80 65 L30 30 L30 25 L80 55 Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
                <path d="M80 65 L130 30 L130 25 L80 55 Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
            </g>
            {/* Surround */}
            <g style={{ animation: 'breathe 2.5s ease-in-out infinite' }}>
                <path d="M30 30 Q25 27 28 22 L32 25 Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.15" />
                <path d="M130 30 Q135 27 132 22 L128 25 Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.15" />
            </g>
            {/* Dust cap */}
            <ellipse cx="80" cy="55" rx="12" ry="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.2" />
            {/* Spider */}
            <path d="M60 85 Q70 78 80 85 Q90 78 100 85" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" fill="none" style={{ animation: 'breatheSlow 2.5s ease-in-out infinite' }} />
            {/* Sound waves */}
            <g style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                <path d="M80 35 Q60 20 80 5" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" fill="none" />
                <path d="M80 35 Q100 20 80 5" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" fill="none" />
            </g>
        </svg>
    )
}

/** Step 03 - Enclosure: Cabinet with port and internal waves  */
export function IllustrationEnclosure({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Cabinet */}
            <rect x="35" y="15" width="90" height="130" rx="4" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            {/* Internal bracing */}
            <line x1="35" y1="80" x2="125" y2="80" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="6 4" />
            {/* Driver cutout */}
            <circle cx="80" cy="50" r="20" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            <circle cx="80" cy="50" r="7" fill="currentColor" fillOpacity="0.08" />
            {/* Port tube */}
            <rect x="65" y="120" width="30" height="25" rx="12" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            {/* Breathing internal pressure waves */}
            <g style={{ animation: 'breathe 3s ease-in-out infinite' }}>
                <ellipse cx="80" cy="100" rx="35" ry="8" fill="currentColor" fillOpacity="0.04" />
                <ellipse cx="80" cy="95" rx="28" ry="5" fill="currentColor" fillOpacity="0.06" />
                <ellipse cx="80" cy="90" rx="20" ry="3" fill="currentColor" fillOpacity="0.08" />
            </g>
            {/* Port airflow arrows */}
            <g style={{ animation: 'breatheSlow 2.5s ease-in-out infinite' }}>
                <path d="M80 132 L80 150" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" markerEnd="url(#arrowDown)" />
                <path d="M74 138 L80 145 L86 138" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" fill="none" />
            </g>
        </svg>
    )
}

/** Step 04 - Crossover: Circuit with flowing signal */
export function IllustrationCrossover({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Input line */}
            <line x1="10" y1="80" x2="40" y2="80" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
            {/* Split node */}
            <circle cx="40" cy="80" r="3" fill="currentColor" fillOpacity="0.3" />
            {/* HPF path (top) */}
            <line x1="40" y1="80" x2="55" y2="45" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
            {/* Capacitor symbol */}
            <line x1="58" y1="40" x2="58" y2="50" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
            <line x1="63" y1="40" x2="63" y2="50" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
            <line x1="55" y1="45" x2="58" y2="45" stroke="currentColor" strokeOpacity="0.2" />
            <line x1="63" y1="45" x2="80" y2="45" stroke="currentColor" strokeOpacity="0.2" />
            {/* Tweeter */}
            <g style={{ animation: 'breathe 2.5s ease-in-out infinite' }}>
                <circle cx="100" cy="45" r="14" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
                <text x="100" y="49" textAnchor="middle" fill="currentColor" fillOpacity="0.3" fontSize="9" fontFamily="monospace">TW</text>
            </g>
            <line x1="80" y1="45" x2="86" y2="45" stroke="currentColor" strokeOpacity="0.2" />

            {/* LPF path (bottom) */}
            <line x1="40" y1="80" x2="55" y2="115" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
            {/* Inductor symbol */}
            <path d="M55 115 Q60 108 65 115 Q70 122 75 115" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
            <line x1="75" y1="115" x2="86" y2="115" stroke="currentColor" strokeOpacity="0.2" />
            {/* Woofer */}
            <g style={{ animation: 'breathe 2.5s ease-in-out infinite', animationDelay: '0.3s' }}>
                <circle cx="100" cy="115" r="18" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
                <text x="100" y="119" textAnchor="middle" fill="currentColor" fillOpacity="0.3" fontSize="9" fontFamily="monospace">WF</text>
            </g>

            {/* Signal flow dots */}
            <g style={{ animation: 'pulse 1.8s ease-in-out infinite' }}>
                <circle cx="25" cy="80" r="2" fill="currentColor" fillOpacity="0.4" />
                <circle cx="48" cy="62" r="1.5" fill="currentColor" fillOpacity="0.3" />
                <circle cx="48" cy="98" r="1.5" fill="currentColor" fillOpacity="0.3" />
            </g>

            {/* Output lines */}
            <line x1="114" y1="45" x2="150" y2="45" stroke="currentColor" strokeOpacity="0.15" />
            <line x1="118" y1="115" x2="150" y2="115" stroke="currentColor" strokeOpacity="0.15" />
        </svg>
    )
}

/** Step 05 - Frequency Response: Waveform */
export function IllustrationFrequency({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Axes */}
            <line x1="20" y1="130" x2="145" y2="130" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
            <line x1="20" y1="20" x2="20" y2="130" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
            {/* Grid lines */}
            {[40, 60, 80, 100, 120].map(y => (
                <line key={y} x1="20" y1={y} x2="145" y2={y} stroke="currentColor" strokeOpacity="0.04" strokeWidth="0.5" />
            ))}
            {/* Woofer response curve */}
            <g style={{ animation: 'breatheSlow 4s ease-in-out infinite' }}>
                <path d="M20 110 Q35 90 50 70 Q60 60 70 55 Q85 52 95 58 Q110 70 125 90 Q135 105 145 120"
                    stroke="#f59e0b" strokeOpacity="0.5" strokeWidth="2" fill="none" />
            </g>
            {/* Tweeter response */}
            <g style={{ animation: 'breatheSlow 4s ease-in-out infinite', animationDelay: '0.5s' }}>
                <path d="M20 125 Q40 120 60 110 Q75 95 85 60 Q95 45 105 40 Q115 38 130 42 Q140 48 145 55"
                    stroke="#06b6d4" strokeOpacity="0.5" strokeWidth="2" fill="none" />
            </g>
            {/* Combined/summed */}
            <g style={{ animation: 'breathe 3s ease-in-out infinite' }}>
                <path d="M20 108 Q35 85 50 65 Q60 55 70 50 Q85 48 100 46 Q115 44 130 42 Q140 45 145 50"
                    stroke="#a855f7" strokeOpacity="0.4" strokeWidth="2.5" fill="none" strokeDasharray="6 3" />
            </g>
            {/* Crossover point dot */}
            <circle cx="85" cy="55" r="4" fill="currentColor" fillOpacity="0.15" stroke="#a855f7" strokeOpacity="0.4" strokeWidth="1" style={{ animation: 'breathe 2s ease-in-out infinite' }} />
            {/* Labels */}
            <text x="145" y="128" fill="currentColor" fillOpacity="0.15" fontSize="7" fontFamily="monospace">Hz</text>
            <text x="22" y="24" fill="currentColor" fillOpacity="0.15" fontSize="7" fontFamily="monospace">dB</text>
        </svg>
    )
}

/** Step 06 - Physical Dimensions: Exploded box view */
export function IllustrationDimensions({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* 3D box - back panel */}
            <path d="M55 25 L125 25 L125 115 L55 115 Z" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.12" />
            {/* 3D box - side panel */}
            <path d="M35 40 L55 25 L55 115 L35 130 Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.15" />
            {/* 3D box - top panel */}
            <path d="M35 40 L55 25 L125 25 L105 40 Z" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.12" />
            {/* Front panel (transparent) */}
            <path d="M35 40 L105 40 L105 130 L35 130 Z" fill="currentColor" fillOpacity="0.02" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="4 3" />
            {/* Driver cutout */}
            <g style={{ animation: 'breathe 3s ease-in-out infinite' }}>
                <circle cx="70" cy="75" r="18" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" />
                <circle cx="70" cy="75" r="6" fill="currentColor" fillOpacity="0.08" />
            </g>
            {/* Dimension arrows */}
            <g stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8" style={{ animation: 'pulse 3s ease-in-out infinite' }}>
                {/* Width */}
                <line x1="35" y1="140" x2="105" y2="140" />
                <line x1="35" y1="137" x2="35" y2="143" />
                <line x1="105" y1="137" x2="105" y2="143" />
                {/* Height */}
                <line x1="115" y1="40" x2="115" y2="130" />
                <line x1="112" y1="40" x2="118" y2="40" />
                <line x1="112" y1="130" x2="118" y2="130" />
            </g>
            {/* Bracing line */}
            <line x1="35" y1="85" x2="105" y2="85" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 4" />
        </svg>
    )
}

/** Step 07 - Amplifier: Amp chassis with VU meter */
export function IllustrationAmplifier({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Amp chassis */}
            <rect x="20" y="45" width="120" height="70" rx="6" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            {/* Ventilation slots */}
            {Array.from({ length: 5 }).map((_, i) => (
                <line key={i} x1={30 + i * 8} y1="50" x2={30 + i * 8} y2="55" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
            ))}
            {/* VU Meter */}
            <g style={{ animation: 'breathe 2s ease-in-out infinite' }}>
                <rect x="40" y="62" width="40" height="25" rx="3" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" />
                {/* Meter arc */}
                <path d="M48 82 Q60 65 72 82" stroke="#f59e0b" strokeOpacity="0.4" strokeWidth="1" fill="none" />
                {/* Needle */}
                <line x1="60" y1="82" x2="55" y2="68" stroke="#f59e0b" strokeOpacity="0.6" strokeWidth="1" />
            </g>
            {/* Knob */}
            <circle cx="110" cy="80" r="12" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            <line x1="110" y1="80" x2="110" y2="70" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
            {/* Power indicator */}
            <circle cx="30" cy="80" r="3" fill="#22c55e" fillOpacity="0.4" style={{ animation: 'breathe 1.5s ease-in-out infinite' }} />
            {/* Output terminals */}
            <circle cx="55" cy="105" r="4" stroke="currentColor" strokeOpacity="0.15" fill="currentColor" fillOpacity="0.05" />
            <circle cx="75" cy="105" r="4" stroke="currentColor" strokeOpacity="0.15" fill="currentColor" fillOpacity="0.05" />
            <text x="55" y="108" textAnchor="middle" fill="currentColor" fillOpacity="0.2" fontSize="5">+</text>
            <text x="75" y="108" textAnchor="middle" fill="currentColor" fillOpacity="0.2" fontSize="5">−</text>
            {/* Signal wave going in */}
            <g style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                <path d="M5 80 Q10 72 15 80 Q20 88 25 80" stroke="currentColor" strokeOpacity="0.15" fill="none" strokeWidth="1" />
            </g>
        </svg>
    )
}

/** Step 08 - Room Acoustics: Room with sound propagation */
export function IllustrationRoom({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Room outline (perspective) */}
            <path d="M20 130 L20 40 L80 15 L140 40 L140 130 Z" fill="currentColor" fillOpacity="0.02" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
            {/* Floor grid */}
            <line x1="20" y1="130" x2="140" y2="130" stroke="currentColor" strokeOpacity="0.1" />
            {/* Speaker (left) */}
            <rect x="30" y="95" width="12" height="25" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.2" />
            {/* Listener position */}
            <circle cx="100" cy="105" r="6" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.2" />
            <circle cx="100" cy="98" r="4" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.15" />
            {/* Sound waves expanding */}
            <g style={{ animation: 'breathe 3s ease-in-out infinite' }}>
                <path d="M42 107 Q55 95 42 83" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" fill="none" />
                <path d="M48 112 Q68 95 48 78" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" fill="none" />
                <path d="M55 117 Q82 95 55 73" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" fill="none" />
            </g>
            {/* Reflection paths */}
            <g style={{ animation: 'pulse 4s ease-in-out infinite' }}>
                <path d="M42 100 L20 80 L60 70" stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.8" strokeDasharray="3 3" fill="none" />
                <path d="M42 100 L80 40 L100 105" stroke="currentColor" strokeOpacity="0.04" strokeWidth="0.8" strokeDasharray="3 3" fill="none" />
            </g>
            {/* Absorption panel */}
            <rect x="18" y="55" width="4" height="30" rx="1" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeOpacity="0.2" />
        </svg>
    )
}

/** Step 09 - BOM: Parts list with components */
export function IllustrationBOM({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Clipboard */}
            <rect x="35" y="20" width="90" height="120" rx="6" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            <rect x="60" y="14" width="40" height="12" rx="4" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.2" />
            {/* List items with checkmarks */}
            {[0, 1, 2, 3, 4].map(i => (
                <g key={i} style={{ animation: `float 3s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}>
                    <rect x="45" y={40 + i * 20} width="10" height="10" rx="2" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.15" />
                    {i < 3 && <path d={`M47 ${45 + i * 20} L50 ${48 + i * 20} L55 ${42 + i * 20}`} stroke="#22c55e" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />}
                    <line x1="62" y1={45 + i * 20} x2={95 + (i % 3) * 10} y2={45 + i * 20} stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" strokeLinecap="round" />
                </g>
            ))}
            {/* Price tag */}
            <g style={{ animation: 'breathe 2.5s ease-in-out infinite' }}>
                <circle cx="115" cy="35" r="10" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeOpacity="0.2" />
                <text x="115" y="38" textAnchor="middle" fill="#f59e0b" fillOpacity="0.5" fontSize="8" fontFamily="monospace">$</text>
            </g>
        </svg>
    )
}

/** Step 10 - Cutting Diagram: MDF sheet with cut pieces */
export function IllustrationCutting({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* MDF Sheet */}
            <rect x="15" y="20" width="130" height="120" rx="2" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
            {/* Cut pieces */}
            <g style={{ animation: 'breatheSlow 4s ease-in-out infinite' }}>
                <rect x="20" y="25" width="55" height="45" rx="1" fill="#f59e0b" fillOpacity="0.06" stroke="#f59e0b" strokeOpacity="0.2" />
                <text x="47" y="50" textAnchor="middle" fill="currentColor" fillOpacity="0.15" fontSize="7" fontFamily="monospace">Front</text>
            </g>
            <g style={{ animation: 'breatheSlow 4s ease-in-out infinite', animationDelay: '0.3s' }}>
                <rect x="80" y="25" width="60" height="45" rx="1" fill="#06b6d4" fillOpacity="0.06" stroke="#06b6d4" strokeOpacity="0.2" />
                <text x="110" y="50" textAnchor="middle" fill="currentColor" fillOpacity="0.15" fontSize="7" fontFamily="monospace">Back</text>
            </g>
            <g style={{ animation: 'breatheSlow 4s ease-in-out infinite', animationDelay: '0.6s' }}>
                <rect x="20" y="75" width="55" height="30" rx="1" fill="#a855f7" fillOpacity="0.06" stroke="#a855f7" strokeOpacity="0.2" />
                <text x="47" y="93" textAnchor="middle" fill="currentColor" fillOpacity="0.15" fontSize="7" fontFamily="monospace">Side</text>
            </g>
            <g style={{ animation: 'breatheSlow 4s ease-in-out infinite', animationDelay: '0.9s' }}>
                <rect x="80" y="75" width="60" height="30" rx="1" fill="#22c55e" fillOpacity="0.06" stroke="#22c55e" strokeOpacity="0.2" />
                <text x="110" y="93" textAnchor="middle" fill="currentColor" fillOpacity="0.15" fontSize="7" fontFamily="monospace">Top</text>
            </g>
            {/* Saw blade line */}
            <line x1="20" y1="110" x2="140" y2="110" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 2" />
            <rect x="20" y="115" width="40" height="20" rx="1" fill="#ec4899" fillOpacity="0.06" stroke="#ec4899" strokeOpacity="0.15" />
        </svg>
    )
}

/** Step 11 - Assembly Guide: Tools and wrench */
export function IllustrationAssembly({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Wrench */}
            <g style={{ animation: 'breatheSlow 3s ease-in-out infinite' }} transform="rotate(-30,80,80)">
                <rect x="70" y="40" width="20" height="80" rx="3" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
                <path d="M65 40 Q60 30 65 20 L70 20 L70 40 Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.15" />
                <path d="M95 40 Q100 30 95 20 L90 20 L90 40 Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.15" />
            </g>
            {/* Screws */}
            <g style={{ animation: 'float 2.5s ease-in-out infinite' }}>
                <circle cx="35" cy="50" r="4" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.2" />
                <line x1="33" y1="50" x2="37" y2="50" stroke="currentColor" strokeOpacity="0.2" />
                <line x1="35" y1="48" x2="35" y2="52" stroke="currentColor" strokeOpacity="0.2" />
            </g>
            <g style={{ animation: 'float 2.5s ease-in-out infinite', animationDelay: '0.3s' }}>
                <circle cx="130" cy="65" r="4" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.2" />
                <line x1="128" y1="65" x2="132" y2="65" stroke="currentColor" strokeOpacity="0.2" />
                <line x1="130" y1="63" x2="130" y2="67" stroke="currentColor" strokeOpacity="0.2" />
            </g>
            {/* Progress circle */}
            <g style={{ animation: 'breathe 2s ease-in-out infinite' }}>
                <circle cx="80" cy="135" r="12" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="3" />
                <circle cx="80" cy="135" r="12" fill="none" stroke="#22c55e" strokeOpacity="0.4" strokeWidth="3" strokeDasharray="50 75" strokeLinecap="round" transform="rotate(-90,80,135)" />
            </g>
        </svg>
    )
}

/** Step 12 - Export: Document with check */
export function IllustrationExport({ size = 160 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <InjectStyles />
            {/* Document */}
            <g style={{ animation: 'float 3.5s ease-in-out infinite' }}>
                <path d="M40 15 L100 15 L120 35 L120 145 L40 145 Z" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
                {/* Folded corner */}
                <path d="M100 15 L100 35 L120 35" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.15" />
                {/* Text lines */}
                {[0, 1, 2, 3, 4].map(i => (
                    <line key={i} x1="52" y1={55 + i * 15} x2={90 + (i % 2) * 15} y2={55 + i * 15} stroke="currentColor" strokeOpacity="0.08" strokeWidth="2" strokeLinecap="round" />
                ))}
            </g>
            {/* Checkmark badge */}
            <g style={{ animation: 'breathe 2s ease-in-out infinite' }}>
                <circle cx="115" cy="120" r="18" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeOpacity="0.3" strokeWidth="1.5" />
                <path d="M106 120 L112 126 L124 114" stroke="#22c55e" strokeOpacity="0.6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* Download arrow */}
            <g style={{ animation: 'pulse 2.5s ease-in-out infinite' }}>
                <path d="M80 130 L80 150 M72 143 L80 151 L88 143" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </g>
        </svg>
    )
}
