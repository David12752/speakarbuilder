import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DriverParams {
    id: string
    name: string
    type: 'woofer' | 'midrange' | 'tweeter' | 'subwoofer'
    diameterParams: number // inches
    fs: number
    qts: number
    qes: number
    qms: number
    vas: number
    xmax: number
    sd: number
    re: number
    le: number
    sensitivity: number
    pe: number
    bl: number
}

export interface ProjectSettings {
    name: string
    speakerType: 'studio_monitor' | 'home_hifi' | 'subwoofer'
    configuration: '2_way' | '3_way' | 'full_range_sub'
    mainUse: 'mix_mastering' | 'production' | 'casual_listening' | 'home_theater'
    roomLength: number // meters
    roomWidth: number // meters
    roomHeight: number // meters
    listeningDistance: number // meters
    drivers: DriverParams[]
    crossover: {
        fc: number
        order: 1 | 2 | 3 | 4
        alignment: 'butterworth' | 'linkwitz-riley' | 'bessel' | 'chebyshev'
        /** Second crossover frequency for 3-way (mid→tweeter) */
        fc2?: number
        order2?: 1 | 2 | 3 | 4
        alignment2?: 'butterworth' | 'linkwitz-riley' | 'bessel' | 'chebyshev'
        baffleWidth: number
        baffleAtten: number
        acousticOffset: number // mm — physical offset between tweeter and woofer on Z axis
        /** Per-driver polarity reversal, keyed by driver ID */
        reversePolarity?: Record<string, boolean>
    }
    enclosureType: 'sealed' | 'ported' | 'bandpass' | 'passive-radiator'
    /** Enclosure design parameters — persisted between steps */
    enclosure: {
        /** Custom box volume override (liters, 0 = auto from T/S) */
        customVolume: number
        /** Wall thickness (mm) */
        wallThickness: number
        /** Damping fill percentage */
        dampingFill: number
        /** Ported: target box volume (liters) */
        portedVb: number
        /** Ported: target tuning frequency (Hz) */
        portedFb: number
        /** Ported: port diameter (cm) */
        portDiameter: number
        /** Ported: number of ports */
        numPorts: number
        /** Bandpass: port diameter (cm) */
        bandpassPortDiameter: number
        /** Passive radiator params */
        prFs: number
        prMms: number
        prSd: number
        prQms: number
    }
    /** FRD/ZMA imported measurement data keyed by driver ID */
    importedMeasurements?: Record<string, {
        frdData?: Array<{ frequency: number; spl: number; phase: number }>
        zmaData?: Array<{ frequency: number; impedance: number; phase: number }>
    }>
}

export interface SavedProjectMeta {
    id: string
    name: string
    savedAt: number
    speakerType: string
    configuration: string
    driverCount: number
}

interface ProjectState {
    settings: ProjectSettings
    activeProjectId: string | null
    savedProjects: SavedProjectMeta[]
    updateSettings: (settings: Partial<ProjectSettings>) => void
    updateDriver: (id: string, params: Partial<DriverParams>) => void
    addDriver: (driver: DriverParams) => void
    removeDriver: (id: string) => void
    resetProject: () => void
    saveProject: () => void
    saveProjectAs: (name: string) => string
    loadProject: (id: string) => void
    deleteProject: (id: string) => void
    createNewProject: () => void
}

const defaultSettings: ProjectSettings = {
    name: '',
    speakerType: 'studio_monitor',
    configuration: '2_way',
    mainUse: 'mix_mastering',
    roomLength: 4,
    roomWidth: 3,
    roomHeight: 2.7,
    listeningDistance: 1.5,
    drivers: [],
    crossover: {
        fc: 2500,
        order: 2,
        alignment: 'linkwitz-riley',
        baffleWidth: 0.2, // 20cm default monitor size approx
        baffleAtten: 3,
        acousticOffset: 0 // mm
    },
    enclosureType: 'sealed',
    enclosure: {
        customVolume: 0,
        wallThickness: 18,
        dampingFill: 50,
        portedVb: 0,
        portedFb: 0,
        portDiameter: 5,
        numPorts: 1,
        bandpassPortDiameter: 5,
        prFs: 20,
        prMms: 80,
        prSd: 220,
        prQms: 5,
    },
    importedMeasurements: {}
}

export const useProjectStore = create<ProjectState>()(
    persist(
        (set, get) => ({
            settings: defaultSettings,
            activeProjectId: null,
            savedProjects: [],
            updateSettings: (newSettings) =>
                set((state) => ({ settings: { ...state.settings, ...newSettings } })),
            updateDriver: (id, params) => set((state) => ({
                settings: {
                    ...state.settings,
                    drivers: state.settings.drivers.map((d) => (d.id === id ? { ...d, ...params } : d)),
                },
            })),
            addDriver: (driver) => set((state) => ({
                settings: {
                    ...state.settings,
                    drivers: [...state.settings.drivers, driver],
                },
            })),
            removeDriver: (id) => set((state) => ({
                settings: {
                    ...state.settings,
                    drivers: state.settings.drivers.filter(d => d.id !== id),
                },
            })),
            resetProject: () => set({ settings: { ...defaultSettings }, activeProjectId: null }),
            saveProject: () => {
                const state = get()
                const { settings, activeProjectId, savedProjects } = state
                const name = settings.name || 'ללא שם'
                if (activeProjectId) {
                    localStorage.setItem(`speakar-project-${activeProjectId}`, JSON.stringify(settings))
                    set({
                        savedProjects: savedProjects.map(p =>
                            p.id === activeProjectId
                                ? { ...p, name, savedAt: Date.now(), speakerType: settings.speakerType, configuration: settings.configuration, driverCount: settings.drivers.length }
                                : p
                        )
                    })
                } else {
                    const id = `proj_${Date.now()}`
                    localStorage.setItem(`speakar-project-${id}`, JSON.stringify(settings))
                    set({
                        activeProjectId: id,
                        savedProjects: [...savedProjects, {
                            id, name, savedAt: Date.now(),
                            speakerType: settings.speakerType,
                            configuration: settings.configuration,
                            driverCount: settings.drivers.length,
                        }]
                    })
                }
            },
            saveProjectAs: (name: string) => {
                const state = get()
                const id = `proj_${Date.now()}`
                const newSettings = { ...state.settings, name }
                localStorage.setItem(`speakar-project-${id}`, JSON.stringify(newSettings))
                set({
                    settings: newSettings,
                    activeProjectId: id,
                    savedProjects: [...state.savedProjects, {
                        id, name, savedAt: Date.now(),
                        speakerType: newSettings.speakerType,
                        configuration: newSettings.configuration,
                        driverCount: newSettings.drivers.length,
                    }]
                })
                return id
            },
            loadProject: (id: string) => {
                const raw = localStorage.getItem(`speakar-project-${id}`)
                if (!raw) return
                try {
                    const loaded = JSON.parse(raw) as ProjectSettings
                    set({ settings: loaded, activeProjectId: id })
                } catch { /* corrupt data */ }
            },
            deleteProject: (id: string) => {
                localStorage.removeItem(`speakar-project-${id}`)
                const state = get()
                set({
                    savedProjects: state.savedProjects.filter(p => p.id !== id),
                    ...(state.activeProjectId === id ? { activeProjectId: null } : {}),
                })
            },
            createNewProject: () => {
                set({ settings: { ...defaultSettings }, activeProjectId: null })
            },
        }),
        {
            name: 'speakar-builder-storage',
        }
    )
)
