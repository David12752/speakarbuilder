import { useState, lazy, Suspense, useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { Button } from '@/components/ui/button'
import { AudioDeviceSelector } from '@/components/shared/AudioDeviceSelector'
import {
    Settings2, Volume2, Box, GitBranch, BarChart3, Ruler,
    Zap, Home, CircuitBoard, Scissors, Wrench, FileOutput,
    Save, FolderOpen, FilePlus, RotateCcw, Trash2, Upload, Download
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Lazy-load all panels ────────────────────────────────────────────────────
const panels = {
    project: lazy(() => import('@/components/wizard/Step01_ProjectSetup').then(m => ({ default: m.Step01_ProjectSetup }))),
    drivers: lazy(() => import('@/components/wizard/Step02_DriverSelection').then(m => ({ default: m.Step02_DriverSelection }))),
    enclosure: lazy(() => import('@/components/wizard/Step03_EnclosureDesign').then(m => ({ default: m.Step03_EnclosureDesign }))),
    crossover: lazy(() => import('@/components/wizard/Step04_CrossoverDesign').then(m => ({ default: m.Step04_CrossoverDesign }))),
    analysis: lazy(() => import('@/components/wizard/Step05_FrequencyResponse').then(m => ({ default: m.Step05_FrequencyResponse }))),
    dimensions: lazy(() => import('@/components/wizard/Step06_PhysicalDimensions').then(m => ({ default: m.Step06_PhysicalDimensions }))),
    amplifier: lazy(() => import('@/components/wizard/Step07_AmplifierCalc').then(m => ({ default: m.Step07_AmplifierCalc }))),
    room: lazy(() => import('@/components/wizard/Step08_RoomAcoustics').then(m => ({ default: m.Step08_RoomAcoustics }))),
    networks: lazy(() => import('@/components/wizard/Step09_BOM').then(m => ({ default: m.Step09_BOM }))),
    cutting: lazy(() => import('@/components/wizard/Step10_CuttingDiagram').then(m => ({ default: m.Step10_CuttingDiagram }))),
    assembly: lazy(() => import('@/components/wizard/Step11_AssemblyGuide').then(m => ({ default: m.Step11_AssemblyGuide }))),
    export: lazy(() => import('@/components/wizard/Step12_ExportSummary').then(m => ({ default: m.Step12_ExportSummary }))),
} as const

type TabId = keyof typeof panels

interface TabDef {
    id: TabId
    label: string
    icon: React.ComponentType<{ className?: string }>
    group: 'design' | 'analysis' | 'build' | 'output'
}

const tabs: TabDef[] = [
    { id: 'project', label: 'פרויקט', icon: Settings2, group: 'design' },
    { id: 'drivers', label: 'דרייברים', icon: Volume2, group: 'design' },
    { id: 'enclosure', label: 'ארגז', icon: Box, group: 'design' },
    { id: 'crossover', label: 'קרוסאובר', icon: GitBranch, group: 'design' },
    { id: 'analysis', label: 'ניתוח', icon: BarChart3, group: 'analysis' },
    { id: 'room', label: 'חדר', icon: Home, group: 'analysis' },
    { id: 'dimensions', label: 'מידות', icon: Ruler, group: 'build' },
    { id: 'amplifier', label: 'מגבר', icon: Zap, group: 'build' },
    { id: 'networks', label: 'BOM', icon: CircuitBoard, group: 'build' },
    { id: 'cutting', label: 'חיתוך', icon: Scissors, group: 'build' },
    { id: 'assembly', label: 'הרכבה', icon: Wrench, group: 'build' },
    { id: 'export', label: 'ייצוא', icon: FileOutput, group: 'output' },
]

// ─── Loading Fallback ────────────────────────────────────────────────────────
function LoadingFallback() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin mx-auto"
                    style={{ borderColor: 'oklch(0.74 0.18 42 / 50%)', borderTopColor: 'transparent' }} />
                <p className="text-[11px] font-mono" style={{ color: 'oklch(0.52 0.015 40)' }}>טוען...</p>
            </div>
        </div>
    )
}

// ─── Main Layout ─────────────────────────────────────────────────────────────
export function AppLayout() {
    const [activeTab, setActiveTab] = useState<TabId>('project')
    const [showProjectMenu, setShowProjectMenu] = useState(false)
    const projectMenuRef = useRef<HTMLDivElement>(null)

    const {
        settings, updateSettings, resetProject,
        savedProjects, activeProjectId,
        saveProject, saveProjectAs, loadProject, deleteProject, createNewProject,
    } = useProjectStore()

    // Close project menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
                setShowProjectMenu(false)
            }
        }
        if (showProjectMenu) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showProjectMenu])

    // Ctrl+S / Cmd+S shortcut
    const handleSave = useCallback(() => {
        if (!settings.name) {
            const name = prompt('שם הפרויקט:', 'פרויקט חדש')
            if (name) {
                saveProjectAs(name)
            }
        } else {
            saveProject()
        }
    }, [settings.name, saveProject, saveProjectAs])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handleSave])

    // File export (native dialog in Electron, download in browser)
    const handleExportFile = useCallback(() => {
        const json = JSON.stringify(settings, null, 2)
        if (window.electronAPI?.isElectron) {
            window.electronAPI.saveFileDialog({
                defaultName: `${settings.name || 'SpeakarBuilder'}_project.sbp`,
                content: json,
            })
        } else {
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${settings.name || 'SpeakarBuilder'}_project.json`
            a.click()
            URL.revokeObjectURL(url)
        }
    }, [settings])

    // File import
    const handleImportFile = useCallback(async () => {
        if (window.electronAPI?.isElectron) {
            const result = await window.electronAPI.openFileDialog()
            if (result.success && result.content) {
                try { updateSettings(JSON.parse(result.content)) }
                catch { alert('שגיאה בטעינת הקובץ') }
            }
        } else {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json,.sbp'
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                try { updateSettings(JSON.parse(await file.text())) }
                catch { alert('שגיאה בטעינת הקובץ') }
            }
            input.click()
        }
    }, [updateSettings])

    const ActivePanel = panels[activeTab]
    const woofer = settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer')
    const tweeter = settings.drivers.find(d => d.type === 'tweeter')

    const completionChecks = [
        Boolean(settings.name?.trim()),
        settings.drivers.length > 0,
        Boolean(woofer),
        settings.crossover.fc > 0,
        settings.roomLength > 0 && settings.roomWidth > 0 && settings.roomHeight > 0,
        settings.listeningDistance > 0,
        settings.enclosure.wallThickness > 0,
    ]
    const completedCount = completionChecks.filter(Boolean).length
    const completeness = Math.round((completedCount / completionChecks.length) * 100)

    const designReady = Boolean(settings.name?.trim()) && settings.drivers.length > 0 && Boolean(woofer) && settings.crossover.fc > 0
    const analysisReady = settings.roomLength > 0 && settings.roomWidth > 0 && settings.roomHeight > 0 && settings.listeningDistance > 0
    const buildReady = settings.enclosure.wallThickness > 0 && Boolean(woofer)
    const outputReady = designReady && analysisReady && buildReady

    // Build tab elements with group separators
    const tabElements: React.ReactNode[] = []
    tabs.forEach((tab, idx) => {
        if (idx > 0 && tabs[idx - 1].group !== tab.group) {
            tabElements.push(
                <div key={`sep-${idx}`} className="w-px h-5 mx-0.5 shrink-0 self-center"
                    style={{ background: 'oklch(1 0 0 / 10%)' }} />
            )
        }
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        tabElements.push(
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 h-full text-[12px] transition-all duration-150 shrink-0 ${
                    isActive ? 'font-medium' : 'hover:bg-white/[0.04]'
                }`}
                style={isActive ? {
                    color: 'oklch(0.92 0.005 40)',
                    background: 'oklch(0.105 0.006 35)',
                } : {
                    color: 'oklch(0.50 0.015 40)',
                }}
            >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {isActive && (
                    <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 inset-x-1 h-[2px] rounded-full"
                        style={{ background: 'linear-gradient(90deg, oklch(0.74 0.18 42), oklch(0.80 0.16 50))' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                )}
            </button>
        )
    })

    return (
        <div className="h-screen flex flex-col bg-background text-foreground font-sans dark overflow-hidden" dir="rtl">

            {/* ═══════════════ Header ═══════════════ */}
            <header
                className="h-[48px] flex items-center justify-between px-4 shrink-0 z-30 select-none"
                style={{
                    background: 'linear-gradient(180deg, oklch(0.155 0.008 35) 0%, oklch(0.130 0.006 35) 100%)',
                    borderBottom: '1px solid oklch(1 0 0 / 8%)',
                }}
            >
                {/* Left: Logo + project name */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] tracking-wider shadow-lg shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, oklch(0.78 0.18 42) 0%, oklch(0.62 0.20 38) 100%)',
                                color: 'oklch(0.10 0.005 35)',
                                boxShadow: '0 2px 12px oklch(0.74 0.18 42 / 30%)',
                            }}
                        >
                            SB
                        </div>
                        <div className="hidden sm:flex flex-col leading-none gap-[3px]">
                            <span className="text-[13px] font-bold tracking-tight text-foreground">SpeakarBuilder</span>
                            <span className="text-[10px] text-muted-foreground/60 font-mono tracking-wide">Speaker Design Studio</span>
                        </div>
                    </div>

                    <div className="hidden md:block w-px h-6 bg-border/50 mx-0.5" />

                    {/* Project name + status */}
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-xs text-foreground/70 font-medium truncate max-w-[200px]">
                            {settings.name || 'פרויקט חדש'}
                        </span>
                        {activeProjectId && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono">
                                שמור
                            </span>
                        )}
                        <span className="hidden lg:inline-flex items-center text-[10px] font-mono px-2 py-[3px] rounded-full border border-primary/25 bg-primary/8 text-primary/90 tracking-wide">
                            {settings.configuration === '3_way' ? '3-Way' : settings.configuration === 'full_range_sub' ? 'FR+Sub' : '2-Way'}
                            <span className="mx-1 opacity-40">·</span>
                            {settings.enclosureType}
                        </span>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-0.5">
                    {/* Save */}
                    <Button variant="ghost" size="sm"
                        className="h-8 px-2.5 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={handleSave}
                        title="Ctrl+S"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">שמור</span>
                    </Button>

                    {/* Projects dropdown */}
                    <div className="relative" ref={projectMenuRef}>
                        <Button variant="ghost" size="sm"
                            className={`h-8 px-2.5 text-[11px] gap-1.5 transition-colors ${
                                showProjectMenu ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => setShowProjectMenu(!showProjectMenu)}
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">פרויקטים</span>
                        </Button>

                        <AnimatePresence>
                            {showProjectMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 top-full mt-1.5 w-[340px] bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
                                >
                                    {/* Menu header */}
                                    <div className="px-3.5 py-2.5 border-b border-border/40 flex items-center justify-between"
                                        style={{ background: 'oklch(0.14 0.007 35)' }}>
                                        <span className="text-[13px] font-bold">📂 פרויקטים</span>
                                        <Button variant="ghost" size="sm"
                                            className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                            onClick={() => { createNewProject(); setShowProjectMenu(false) }}>
                                            <FilePlus className="w-3 h-3" /> פרויקט חדש
                                        </Button>
                                    </div>

                                    {/* Project list */}
                                    <div className="max-h-[280px] overflow-y-auto">
                                        {savedProjects.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground/60 text-sm">
                                                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                אין פרויקטים שמורים
                                            </div>
                                        ) : (
                                            savedProjects.slice().sort((a, b) => b.savedAt - a.savedAt).map(proj => (
                                                <div
                                                    key={proj.id}
                                                    className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors border-b border-border/15 ${
                                                        proj.id === activeProjectId
                                                            ? 'bg-primary/8 border-r-2 border-r-primary'
                                                            : 'hover:bg-muted/40'
                                                    }`}
                                                    onClick={() => { loadProject(proj.id); setShowProjectMenu(false) }}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-[13px] truncate">{proj.name}</div>
                                                        <div className="text-[10px] text-muted-foreground/60 flex gap-1.5 mt-0.5">
                                                            <span>{proj.speakerType === 'studio_monitor' ? 'מוניטור' : proj.speakerType === 'home_hifi' ? 'Hi-Fi' : 'סאב'}</span>
                                                            <span className="opacity-40">·</span>
                                                            <span>{proj.configuration}</span>
                                                            <span className="opacity-40">·</span>
                                                            <span>{proj.driverCount} דרייברים</span>
                                                            <span className="opacity-40">·</span>
                                                            <span>{new Date(proj.savedAt).toLocaleDateString('he-IL')}</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm"
                                                        className="h-6 w-6 p-0 text-muted-foreground/30 hover:text-destructive shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (confirm(`למחוק "${proj.name}"?`)) deleteProject(proj.id)
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* File import/export */}
                                    <div className="px-3 py-2 border-t border-border/40 flex gap-2"
                                        style={{ background: 'oklch(0.14 0.007 35)' }}>
                                        <Button variant="outline" size="sm"
                                            className="flex-1 h-7 text-[10px] gap-1.5"
                                            onClick={() => { handleImportFile(); setShowProjectMenu(false) }}>
                                            <Upload className="w-3 h-3" /> ייבוא מקובץ
                                        </Button>
                                        <Button variant="outline" size="sm"
                                            className="flex-1 h-7 text-[10px] gap-1.5"
                                            onClick={() => { handleExportFile(); setShowProjectMenu(false) }}>
                                            <Download className="w-3 h-3" /> ייצוא לקובץ
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="w-px h-4 bg-border/40 mx-1" />

                    <AudioDeviceSelector />

                    <div className="w-px h-4 bg-border/40 mx-1" />

                    <Button variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-destructive"
                        title="איפוס פרויקט"
                        onClick={() => { if (confirm('לאפס את כל הפרויקט?')) resetProject() }}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </header>

            {/* ═══════════════ Tab Bar ═══════════════ */}
            <nav
                className="h-[40px] flex items-stretch px-2 shrink-0 z-20 overflow-x-auto scrollbar-none"
                style={{
                    background: 'oklch(0.120 0.006 35)',
                    borderBottom: '1px solid oklch(1 0 0 / 10%)',
                }}
            >
                {tabElements}
            </nav>

            <div
                className="h-[36px] px-3 flex items-center justify-between gap-3 shrink-0 text-[10px]"
                style={{
                    background: 'oklch(0.112 0.006 35)',
                    borderBottom: '1px solid oklch(1 0 0 / 8%)',
                }}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="px-2 py-0.5 rounded-full border border-primary/25 bg-primary/10 text-primary/90 font-mono whitespace-nowrap">
                        Data {completeness}%
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full border whitespace-nowrap ${designReady ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-300 bg-amber-500/10'}`}>
                        תכנון {designReady ? 'מוכן' : 'חסר'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full border whitespace-nowrap ${analysisReady ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-300 bg-amber-500/10'}`}>
                        ניתוח {analysisReady ? 'מוכן' : 'חסר'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full border whitespace-nowrap ${buildReady ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-300 bg-amber-500/10'}`}>
                        בנייה {buildReady ? 'מוכן' : 'חסר'}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    <span className="font-mono whitespace-nowrap">Drivers: {settings.drivers.length}</span>
                    <span className="opacity-40">|</span>
                    <span className="font-mono whitespace-nowrap">Fc: {settings.crossover.fc}Hz</span>
                    <span className="opacity-40">|</span>
                    <span className="font-mono whitespace-nowrap">Room: {settings.roomLength}×{settings.roomWidth}×{settings.roomHeight}m</span>
                    <span className={`px-1.5 py-0.5 rounded-full border whitespace-nowrap ${outputReady ? 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10' : 'border-muted-foreground/30 text-muted-foreground bg-muted/20'}`}>
                        ייצוא {outputReady ? 'מוכן' : 'לא מוכן'}
                    </span>
                </div>
            </div>

            {/* ═══════════════ Content ═══════════════ */}
            <main className="flex-1 overflow-hidden" style={{ background: 'oklch(0.105 0.006 35)' }}>
                <div className="h-full px-4 py-2">
                    <Suspense fallback={<LoadingFallback />}>
                        <ActivePanel />
                    </Suspense>
                </div>
            </main>
        </div>
    )
}
