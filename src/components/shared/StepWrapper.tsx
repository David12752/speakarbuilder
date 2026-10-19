import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Shared wrapper for all wizard steps.
 * Full-height layout: compact header + scrollable content body.
 */

const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 }
}

/* ── Full-height step container ── */
export function AnimatedStep({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`h-full flex flex-col gap-1.5 ${className}`}
        >
            {children}
        </motion.div>
    )
}

/* ── Compact step header (single row) ── */
export function StepHeader({ title, subtitle, icon, children }: {
    title: string
    subtitle?: string
    icon?: ReactNode
    children?: ReactNode
}) {
    return (
        <div className="flex items-center justify-between shrink-0 px-1">
            <div className="flex items-center gap-2">
                {icon && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 border border-primary/20 text-primary">
                        {icon}
                    </div>
                )}
                <h2 className="text-sm font-bold text-foreground">{title}</h2>
                {subtitle && <span className="text-[11px] text-muted-foreground hidden sm:inline">— {subtitle}</span>}
            </div>
            {children && <div className="flex items-center gap-1.5">{children}</div>}
        </div>
    )
}

/* ── Scrollable content body (takes remaining space) ── */
export function StepBody({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 ${className}`}
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'oklch(0.3 0.01 40) transparent' }}>
            {children}
        </div>
    )
}

/* ── Stagger container ── */
export function StaggerGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            variants={{ animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } } }}
            initial="initial"
            animate="animate"
            className={className}
        >
            {children}
        </motion.div>
    )
}

export function FadeUpItem({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

/* ── Compact stat card ── */
export function GlowStat({ label, value, unit, color = 'amber' }: {
    label: string
    value: string | number
    unit?: string
    color?: 'amber' | 'cyan' | 'purple' | 'emerald' | 'rose'
}) {
    const colorMap = {
        amber: 'from-amber-500/15 to-orange-500/5 border-amber-500/25 text-amber-400',
        cyan: 'from-cyan-500/15 to-sky-500/5 border-cyan-500/25 text-cyan-400',
        purple: 'from-purple-500/15 to-indigo-500/5 border-purple-500/25 text-purple-400',
        emerald: 'from-emerald-500/15 to-green-500/5 border-emerald-500/25 text-emerald-400',
        rose: 'from-rose-500/15 to-pink-500/5 border-rose-500/25 text-rose-400',
    }

    return (
        <div className={`rounded-lg border bg-gradient-to-br px-3 py-1.5 ${colorMap[color]}`}>
            <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
            <p className={`text-base font-bold font-mono tabular-nums leading-tight ${colorMap[color].split(' ').pop()}`}>
                {value}
                {unit && <span className="text-[10px] font-normal text-muted-foreground mr-1">{unit}</span>}
            </p>
        </div>
    )
}

/* ── Section header with subtle line ── */
export function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
    return (
        <div className="flex items-center gap-2 mb-1.5">
            {icon && (
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 border border-primary/20 text-primary">
                    {icon}
                </div>
            )}
            <div>
                <h3 className="text-xs font-bold leading-tight">{title}</h3>
                {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
        </div>
    )
}
