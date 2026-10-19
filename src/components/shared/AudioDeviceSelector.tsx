import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Mic, MicOff, ChevronDown, AlertCircle, CheckCircle2,
    Activity, Wifi, WifiOff, RefreshCw, CircleStop, Play, Zap
} from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface AudioDevice {
    deviceId: string
    label: string
    kind: MediaDeviceKind
}

interface AsioDevice {
    index: number
    name: string
    hostApi: string
    isAsio: boolean
    maxInputChannels: number
    maxOutputChannels: number
    defaultSampleRate: number
    defaultLatencyMs: number
}

type BridgeState = 'disconnected' | 'connecting' | 'connected'

const BRIDGE_URL = 'ws://localhost:8765'
const BUFFER_SIZES = [64, 128, 256, 512, 1024, 2048]
const COMMON_SR = [44100, 48000, 88200, 96000, 192000]

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function AudioDeviceSelector() {
    const [open, setOpen] = useState(false)
    const [tab, setTab] = useState<'web' | 'asio'>('web')
    const dropdownRef = useRef<HTMLDivElement>(null)

    // ── Web Audio state ──────────────────────
    const [inputDevices, setInputDevices] = useState<AudioDevice[]>([])
    const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([])
    const [selectedInput, setSelectedInput] = useState('')
    const [selectedOutput, setSelectedOutput] = useState('')
    const [permissionState, setPermissionState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
    const [webLevel, setWebLevel] = useState(0)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const webStreamRef = useRef<MediaStream | null>(null)
    const webRafRef = useRef<number>(0)

    // ── ASIO Bridge state ────────────────────
    const [bridgeState, setBridgeState] = useState<BridgeState>('disconnected')
    const [asioDevices, setAsioDevices] = useState<AsioDevice[]>([])
    const [selectedAsioDevice, setSelectedAsioDevice] = useState<number | null>(null)
    const [asioSampleRate, setAsioSampleRate] = useState(48000)
    const [asioBufferSize, setAsioBufferSize] = useState(512)
    const [asioLatencyMs, setAsioLatencyMs] = useState<number | null>(null)
    const [asioStreamActive, setAsioStreamActive] = useState(false)
    const [asioLevel, setAsioLevel] = useState({ rms: 0, peak: 0 })
    const [supportedSR, setSupportedSR] = useState<number[]>([])
    const [asioError, setAsioError] = useState('')
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ─────────────────────────────────────────
    // Close on outside click
    // ─────────────────────────────────────────
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
                setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Stop level meter when closed
    useEffect(() => {
        if (!open) {
            cancelAnimationFrame(webRafRef.current)
            setWebLevel(0)
        }
    }, [open])

    // ─────────────────────────────────────────
    // Web Audio helpers
    // ─────────────────────────────────────────
    const enumerateDevices = async () => {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const inputs = devices.filter(d => d.kind === 'audioinput').map(d => ({
            deviceId: d.deviceId,
            label: d.label || `כניסה ${d.deviceId.slice(0, 6)}`,
            kind: d.kind as MediaDeviceKind,
        }))
        const outputs = devices.filter(d => d.kind === 'audiooutput').map(d => ({
            deviceId: d.deviceId,
            label: d.label || `יציאה ${d.deviceId.slice(0, 6)}`,
            kind: d.kind as MediaDeviceKind,
        }))
        setInputDevices(inputs)
        setOutputDevices(outputs)
        if (!selectedInput && inputs.length) setSelectedInput(inputs[0].deviceId)
        if (!selectedOutput && outputs.length) setSelectedOutput(outputs[0].deviceId)
    }

    const requestPermission = async () => {
        setPermissionState('requesting')
        try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true })
            s.getTracks().forEach(t => t.stop())
            setPermissionState('granted')
            await enumerateDevices()
        } catch {
            setPermissionState('denied')
        }
    }

    const startWebLevelMeter = async () => {
        if (permissionState !== 'granted' || !selectedInput) return
        webStreamRef.current?.getTracks().forEach(t => t.stop())
        cancelAnimationFrame(webRafRef.current)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: selectedInput } }
            })
            webStreamRef.current = stream
            const ctx = new AudioContext()
            const source = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            analyserRef.current = analyser
            const data = new Uint8Array(analyser.frequencyBinCount)
            const tick = () => {
                analyser.getByteTimeDomainData(data)
                let sum = 0
                for (let i = 0; i < data.length; i++) {
                    const v = (data[i] - 128) / 128
                    sum += v * v
                }
                setWebLevel(Math.min(Math.sqrt(sum / data.length) * 4, 1))
                webRafRef.current = requestAnimationFrame(tick)
            }
            tick()
        } catch { /* ignore */ }
    }

    useEffect(() => () => {
        cancelAnimationFrame(webRafRef.current)
        webStreamRef.current?.getTracks().forEach(t => t.stop())
    }, [])

    // ─────────────────────────────────────────
    // ASIO Bridge WebSocket
    // ─────────────────────────────────────────
    const connectBridge = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return
        setBridgeState('connecting')
        setAsioError('')
        const ws = new WebSocket(BRIDGE_URL)
        wsRef.current = ws

        ws.onopen = () => {
            setBridgeState('connected')
            if (reconnectRef.current) clearTimeout(reconnectRef.current)
        }

        ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data as string)
                if (msg.type === 'devices') {
                    setAsioDevices(msg.devices)
                    const asioFirst = (msg.devices as AsioDevice[]).find(d => d.isAsio)
                    const first = asioFirst ?? msg.devices[0]
                    if (first) setSelectedAsioDevice(first.index)
                }
                if (msg.type === 'streamStatus') {
                    setAsioStreamActive(!!msg.active)
                    if (msg.latencyMs != null) setAsioLatencyMs(msg.latencyMs)
                    if (msg.sampleRate) setAsioSampleRate(msg.sampleRate)
                    if (msg.blockSize) setAsioBufferSize(msg.blockSize)
                    if (msg.supportedSampleRates) setSupportedSR(msg.supportedSampleRates)
                }
                if (msg.type === 'level') {
                    setAsioLevel({ rms: msg.rms, peak: msg.peak })
                }
                if (msg.type === 'sampleRates') {
                    setSupportedSR(msg.rates)
                }
                if (msg.type === 'error') {
                    setAsioError(msg.message)
                }
            } catch { /* ignore */ }
        }

        ws.onclose = () => {
            setBridgeState('disconnected')
            setAsioStreamActive(false)
            setAsioLevel({ rms: 0, peak: 0 })
            reconnectRef.current = setTimeout(connectBridge, 4000)
        }

        ws.onerror = () => ws.close()
    }, [])

    // Auto-try bridge when switching to ASIO tab
    useEffect(() => {
        if (tab === 'asio') connectBridge()
    }, [tab, connectBridge])

    useEffect(() => () => {
        if (reconnectRef.current) clearTimeout(reconnectRef.current)
        wsRef.current?.close()
    }, [])

    const wsSend = (msg: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN)
            wsRef.current.send(JSON.stringify(msg))
    }

    const handleDeviceChange = (idx: number) => {
        setSelectedAsioDevice(idx)
        setSupportedSR([])
        setAsioLatencyMs(null)
        wsSend({ type: 'getSampleRates', device: idx })
    }

    const startAsioStream = () => {
        setAsioError('')
        wsSend({ type: 'startStream', device: selectedAsioDevice, sampleRate: asioSampleRate, blockSize: asioBufferSize })
    }

    const stopAsioStream = () => wsSend({ type: 'stopStream' })

    // ─────────────────────────────────────────
    // Header button label
    // ─────────────────────────────────────────
    const headerLabel = () => {
        if (tab === 'asio' && bridgeState === 'connected')
            return (asioDevices.find(d => d.index === selectedAsioDevice)?.name ?? 'ASIO').slice(0, 20)
        if (permissionState === 'granted' && inputDevices.length)
            return (inputDevices.find(d => d.deviceId === selectedInput)?.label ?? '').slice(0, 22) || 'Audio OK'
        if (permissionState === 'denied') return 'אין גישה'
        if (permissionState === 'requesting') return 'מבקש...'
        return 'כרטיס קול'
    }

    const headerIcon = () => {
        if (tab === 'asio') {
            if (bridgeState === 'connected') return <Zap className="w-3.5 h-3.5 text-amber-400" />
            if (bridgeState === 'connecting') return <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            return <Zap className="w-3.5 h-3.5 text-muted-foreground/50" />
        }
        if (permissionState === 'granted') return <Mic className="w-3.5 h-3.5 text-emerald-400" />
        if (permissionState === 'denied') return <MicOff className="w-3.5 h-3.5 text-destructive" />
        return <Mic className="w-3.5 h-3.5 text-muted-foreground/60" />
    }

    const LevelBar = ({ level, peak }: { level: number; peak?: number }) => (
        <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden relative">
            {peak != null && (
                <div
                    className="absolute top-0 w-0.5 h-full bg-white/40 rounded"
                    style={{ left: `${Math.min(peak, 1) * 100}%` }}
                />
            )}
            <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                    width: `${Math.min(level, 1) * 100}%`,
                    background: level > 0.8 ? 'oklch(0.6 0.22 20)' : level > 0.5 ? 'oklch(0.75 0.18 75)' : 'oklch(0.7 0.18 162)'
                }}
            />
        </div>
    )

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger */}
            <button
                onClick={() => {
                    setOpen(v => !v)
                    if (!open && tab === 'web' && permissionState === 'idle') requestPermission()
                    else if (!open && tab === 'web' && permissionState === 'granted') enumerateDevices()
                }}
                className={`h-7 flex items-center gap-1.5 px-2 rounded text-[11px] border transition-colors ${
                    open
                        ? 'bg-muted/60 border-border text-foreground'
                        : 'bg-transparent border-transparent hover:border-border/50 hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                }`}
            >
                {headerIcon()}
                <span className="hidden sm:inline max-w-[130px] truncate">{headerLabel()}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute top-full mt-1.5 left-0 w-[370px] bg-[oklch(0.18_0_0)] border border-border rounded-lg shadow-2xl z-50"
                    dir="rtl"
                >
                    {/* Tab bar */}
                    <div className="flex border-b border-border/50">
                        {(['web', 'asio'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                                    tab === t
                                        ? 'text-primary border-b-2 border-primary -mb-px bg-primary/5'
                                        : 'text-muted-foreground/60 hover:text-muted-foreground'
                                }`}
                            >
                                {t === 'web'
                                    ? <><Mic className="w-3 h-3" /> Web Audio</>
                                    : <><Zap className="w-3 h-3" /> ASIO Bridge</>
                                }
                            </button>
                        ))}
                    </div>

                    {/* ── Web Audio Tab ─────────────── */}
                    {tab === 'web' && (
                        <div className="p-3 space-y-3">
                            {permissionState === 'denied' ? (
                                <div className="py-4 text-center space-y-2">
                                    <MicOff className="w-8 h-8 text-destructive mx-auto opacity-60" />
                                    <p className="text-xs text-muted-foreground">הגישה למיקרופון נדחתה.</p>
                                    <p className="text-[11px] text-muted-foreground/50">לחצו על סמל המנעול בשורת הכתובת ואפשרו מיקרופון.</p>
                                </div>
                            ) : permissionState === 'requesting' ? (
                                <div className="py-4 text-center space-y-2">
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-xs text-muted-foreground">מבקש גישה...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1.5">
                                            <Mic className="w-3 h-3" /> כניסה (מיקרופון)
                                        </label>
                                        <select
                                            value={selectedInput}
                                            onChange={e => setSelectedInput(e.target.value)}
                                            className="w-full bg-[oklch(0.22_0_0)] border border-border rounded px-2 py-1.5 text-xs appearance-none cursor-pointer hover:border-primary/50 transition-colors"
                                        >
                                            {inputDevices.length === 0
                                                ? <option>— לא נמצאו —</option>
                                                : inputDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)
                                            }
                                        </select>
                                        <div className="flex items-center gap-2">
                                            <LevelBar level={webLevel} />
                                            <button
                                                onClick={startWebLevelMeter}
                                                className="text-[10px] text-primary/70 hover:text-primary transition-colors shrink-0"
                                            >
                                                {webLevel > 0 ? '● live' : '▶ test'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="border-t border-border/30" />
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1.5">
                                            <Activity className="w-3 h-3" /> יציאה (רמקולים)
                                        </label>
                                        <select
                                            value={selectedOutput}
                                            onChange={e => setSelectedOutput(e.target.value)}
                                            className="w-full bg-[oklch(0.22_0_0)] border border-border rounded px-2 py-1.5 text-xs appearance-none cursor-pointer hover:border-primary/50 transition-colors"
                                        >
                                            {outputDevices.length === 0
                                                ? <option>— לא נמצאו —</option>
                                                : outputDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)
                                            }
                                        </select>
                                    </div>
                                    <div className="border-t border-border/30" />
                                    <p className="text-[10px] text-muted-foreground/40 pb-0.5">
                                        Web Audio API — אין גישה ל-ASIO. לחצו על "ASIO Bridge" לתמיכה מלאה.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── ASIO Bridge Tab ───────────── */}
                    {tab === 'asio' && (
                        <div className="p-3 space-y-3" dir="rtl">
                            {/* Connection status */}
                            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] ${
                                bridgeState === 'connected'   ? 'bg-emerald-500/10 text-emerald-400' :
                                bridgeState === 'connecting'  ? 'bg-amber-500/10 text-amber-400' :
                                                                'bg-destructive/10 text-destructive'
                            }`}>
                                {bridgeState === 'connected'
                                    ? <Wifi className="w-3.5 h-3.5 shrink-0" />
                                    : bridgeState === 'connecting'
                                        ? <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                                        : <WifiOff className="w-3.5 h-3.5 shrink-0" />
                                }
                                <span className="flex-1">
                                    {bridgeState === 'connected'   ? 'מחובר — ws://localhost:8765' :
                                     bridgeState === 'connecting'  ? 'מתחבר ל-bridge...' :
                                                                     'לא מחובר — הפעילו את asio_bridge.py'}
                                </span>
                                {bridgeState !== 'connected' && (
                                    <button
                                        onClick={connectBridge}
                                        className="text-[10px] border border-current rounded px-1.5 py-0.5 shrink-0 hover:opacity-80"
                                    >
                                        נסה שוב
                                    </button>
                                )}
                            </div>

                            {/* Setup instructions (when disconnected) */}
                            {bridgeState === 'disconnected' && (
                                <div className="bg-[oklch(0.22_0_0)] rounded p-3 space-y-1.5 text-[11px] text-muted-foreground/60 border border-border/40">
                                    <p className="font-semibold text-muted-foreground/80 flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5 text-primary" /> הפעלת ה-bridge
                                    </p>
                                    <div className="font-mono text-[10px] bg-black/30 rounded px-2 py-1.5 space-y-0.5 text-left" dir="ltr">
                                        <p>cd asio-bridge</p>
                                        <p>pip install -r requirements.txt</p>
                                        <p>python asio_bridge.py</p>
                                    </div>
                                    <p className="text-[10px]">
                                        ASIO4ALL נדרש אם אין driver ASIO נייטיב.{' '}
                                        <a
                                            href="https://asio4all.org"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary/70 hover:text-primary underline"
                                        >
                                            asio4all.org ↗
                                        </a>
                                    </p>
                                </div>
                            )}

                            {/* Controls (when connected) */}
                            {bridgeState === 'connected' && (
                                <>
                                    {/* Device selector */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">מכשיר שמע</label>
                                        <select
                                            value={selectedAsioDevice ?? ''}
                                            onChange={e => handleDeviceChange(Number(e.target.value))}
                                            className="w-full bg-[oklch(0.22_0_0)] border border-border rounded px-2 py-1.5 text-xs appearance-none cursor-pointer hover:border-primary/50 transition-colors"
                                        >
                                            {asioDevices.length === 0
                                                ? <option>— לא נמצאו מכשירים —</option>
                                                : asioDevices.map(d => (
                                                    <option key={d.index} value={d.index}>
                                                        {d.isAsio ? '★ ' : ''}{d.name} [{d.hostApi}]
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        {selectedAsioDevice != null && (() => {
                                            const dev = asioDevices.find(d => d.index === selectedAsioDevice)
                                            return dev ? (
                                                <div className="flex gap-3 text-[10px] text-muted-foreground/50 px-0.5">
                                                    <span>↓ {dev.maxInputChannels}ch in</span>
                                                    <span>↑ {dev.maxOutputChannels}ch out</span>
                                                    {asioLatencyMs != null && <span>⏱ {asioLatencyMs}ms</span>}
                                                </div>
                                            ) : null
                                        })()}
                                    </div>

                                    {/* Sample rate + buffer size */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Sample Rate</label>
                                            <select
                                                value={asioSampleRate}
                                                onChange={e => setAsioSampleRate(Number(e.target.value))}
                                                className="w-full bg-[oklch(0.22_0_0)] border border-border rounded px-2 py-1.5 text-xs appearance-none cursor-pointer hover:border-primary/50 transition-colors"
                                            >
                                                {(supportedSR.length ? supportedSR : COMMON_SR).map(sr => (
                                                    <option key={sr} value={sr}>
                                                        {(sr / 1000).toFixed(sr % 1000 === 0 ? 0 : 1)}kHz
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Buffer Size</label>
                                            <select
                                                value={asioBufferSize}
                                                onChange={e => setAsioBufferSize(Number(e.target.value))}
                                                className="w-full bg-[oklch(0.22_0_0)] border border-border rounded px-2 py-1.5 text-xs appearance-none cursor-pointer hover:border-primary/50 transition-colors"
                                            >
                                                {BUFFER_SIZES.map(bs => {
                                                    const latMs = ((bs / asioSampleRate) * 1000).toFixed(1)
                                                    return <option key={bs} value={bs}>{bs} ({latMs}ms)</option>
                                                })}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Level meter */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 space-y-0.5">
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mb-1">
                                                    <span>RMS</span>
                                                    <span className="ml-auto font-mono">
                                                        {(20 * Math.log10(Math.max(asioLevel.rms, 1e-6))).toFixed(1)} dBFS
                                                    </span>
                                                </div>
                                                <LevelBar level={asioLevel.rms * 6} peak={asioLevel.peak * 6} />
                                            </div>
                                        </div>

                                        {asioError && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1">
                                                <AlertCircle className="w-3 h-3 shrink-0" />
                                                {asioError}
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            {!asioStreamActive ? (
                                                <button
                                                    onClick={startAsioStream}
                                                    disabled={selectedAsioDevice == null}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold transition-colors disabled:opacity-40"
                                                >
                                                    <Play className="w-3 h-3" /> הפעל stream
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={stopAsioStream}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs font-semibold transition-colors"
                                                >
                                                    <CircleStop className="w-3 h-3" /> עצור stream
                                                </button>
                                            )}
                                            <button
                                                onClick={() => wsSend({ type: 'ping' })}
                                                className="px-2.5 py-1.5 rounded border border-border/40 hover:border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                ping
                                            </button>
                                        </div>

                                        {asioStreamActive && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Stream פעיל — {asioSampleRate / 1000}kHz / {asioBufferSize} samples
                                                {asioLatencyMs != null && ` / ${asioLatencyMs}ms`}
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-border/30" />
                                    <p className="text-[10px] text-muted-foreground/40 pb-0.5">
                                        💡 לניתוח FRD/ZMA: השתמשו ב-REW/ARTA עם ASIO, ייצאו FRD וייבאו בשלב הדרייברים.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
