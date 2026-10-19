/**
 * PDF Export utility using jsPDF.
 * Generates a comprehensive project report with all specs.
 */

import jsPDF from 'jspdf'
import type { ProjectSettings } from '@/store/projectStore'
import { calculateQtc, calculateFc, calculateF3 } from '@/calculations/sealed-box'
import { calculatePortLength } from '@/calculations/ported-box'
import { calculateBoxDimensions, calculateBracing, calculateDampingVolume, generateCutList } from '@/calculations/physical-dimensions'
import { calculateAmplifierRecommendation } from '@/calculations/amplifier'
import { calculateRoomModes } from '@/calculations/room-acoustics'

// Hebrew-safe text output — jsPDF doesn't support RTL/Hebrew natively,
// so we output spec data in LTR English with Hebrew labels as best-effort.
// For full Hebrew PDF, a more advanced solution (e.g., pdfmake) would be needed.

export function exportProjectPDF(settings: ProjectSettings): void {
    try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    const addTitle = (text: string) => {
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(text, pageWidth / 2, y, { align: 'center' })
        y += 10
    }

    const addSectionHeader = (text: string) => {
        if (y > 260) { doc.addPage(); y = 20 }
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40, 100, 200)
        doc.text(text, 14, y)
        doc.setTextColor(0, 0, 0)
        y += 8
    }

    const addLine = (label: string, value: string) => {
        if (y > 275) { doc.addPage(); y = 20 }
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`${label}: ${value}`, 18, y)
        y += 6
    }

    const addSeparator = () => {
        doc.setDrawColor(200, 200, 200)
        doc.line(14, y, pageWidth - 14, y)
        y += 6
    }

    // ─── Title ───
    addTitle('SpeakarBuilder - Project Report')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(settings.name || 'Untitled Project', pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(8)
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' })
    y += 12
    addSeparator()

    // ─── Project Setup ───
    addSectionHeader('1. Project Setup')
    addLine('Speaker Type', settings.speakerType.replace('_', ' '))
    addLine('Configuration', settings.configuration.replace('_', ' '))
    addLine('Main Use', settings.mainUse.replace('_', ' '))
    addLine('Room Dimensions', `${settings.roomLength} x ${settings.roomWidth} x ${settings.roomHeight} m`)
    addLine('Listening Distance', `${settings.listeningDistance} m`)
    addLine('Enclosure Type', settings.enclosureType)
    y += 4
    addSeparator()

    // ─── Drivers ───
    addSectionHeader('2. Driver Parameters (Thiele-Small)')
    settings.drivers.forEach(driver => {
        if (y > 260) { doc.addPage(); y = 20 }
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${driver.name} (${driver.type} - ${driver.diameterParams}")`, 18, y)
        y += 7
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const params = [
            `Fs=${driver.fs}Hz`, `Qts=${driver.qts}`, `Qes=${driver.qes}`, `Qms=${driver.qms}`,
            `Vas=${driver.vas}L`, `Xmax=${driver.xmax}mm`, `Sd=${driver.sd}cm2`,
            `Re=${driver.re}ohm`, `Le=${driver.le}mH`, `Sens=${driver.sensitivity}dB`,
            `Pe=${driver.pe}W`, `BL=${driver.bl}N/A`
        ]
        // Split into 2 rows
        doc.text(params.slice(0, 6).join('  |  '), 22, y)
        y += 5
        doc.text(params.slice(6).join('  |  '), 22, y)
        y += 5

        // EBP
        const ebp = driver.fs / driver.qes
        addLine('  EBP', `${ebp.toFixed(1)} (${ebp < 50 ? 'Sealed recommended' : ebp > 100 ? 'Ported recommended' : 'Either'})`)
        y += 2
    })
    addSeparator()

    // ─── Enclosure ───
    addSectionHeader('3. Enclosure Design')
    const woofer = settings.drivers.find(d => d.type === 'woofer' || d.type === 'subwoofer')
    if (woofer && woofer.vas > 0 && woofer.qts > 0 && woofer.fs > 0) {
        const vb = settings.enclosure?.customVolume && settings.enclosure.customVolume > 0
            ? settings.enclosure.customVolume
            : Math.max(woofer.vas * 0.8, 1)
        const qtc = calculateQtc(woofer.qts, woofer.vas, vb)
        const fc = calculateFc(woofer.fs, woofer.vas, vb)
        const f3 = calculateF3(fc, qtc)
        addLine('Box Volume', `${vb.toFixed(1)} L`)
        addLine('Qtc', qtc.toFixed(3))
        addLine('Fc', `${fc.toFixed(1)} Hz`)
        addLine('F3 (-3dB)', `${f3.toFixed(1)} Hz`)
        if (settings.enclosureType === 'ported') {
            const fb = woofer.fs * 0.9
            const portLen = calculatePortLength(vb, fb, 5)
            addLine('Port Tuning', `${fb.toFixed(1)} Hz`)
            addLine('Port Length (5cm dia)', `${portLen.toFixed(1)} cm`)
        }
    }
    y += 4
    addSeparator()

    // ─── Crossover ───
    addSectionHeader('4. Crossover Design')
    const xo = settings.crossover
    addLine('Crossover Frequency', `${xo.fc} Hz`)
    addLine('Order', `${xo.order} (${xo.order * 6}dB/oct)`)
    addLine('Alignment', xo.alignment)
    addLine('Baffle Width', `${xo.baffleWidth} m`)
    addLine('Baffle Step Compensation', `${xo.baffleAtten} dB`)
    if (xo.acousticOffset > 0) {
        addLine('Acoustic Offset', `${xo.acousticOffset} mm`)
        const delayMs = (xo.acousticOffset / 1000) / 343 * 1000
        addLine('Time Delay', `${delayMs.toFixed(3)} ms`)
    }
    y += 4
    addSeparator()

    // ─── Physical Dimensions ───
    addSectionHeader('6. Physical Dimensions')
    if (woofer && woofer.vas > 0) {
        const vb = settings.enclosure?.customVolume && settings.enclosure.customVolume > 0
            ? settings.enclosure.customVolume
            : Math.max(woofer.vas * 0.8, 1)
        const dims = calculateBoxDimensions(vb, 18, woofer.diameterParams || 6.5)
        addLine('External (W x H x D)', `${dims.externalWidth}mm x ${dims.externalHeight}mm x ${dims.externalDepth}mm`)
        addLine('Internal Volume', `${dims.actualInternalVolume.toFixed(1)} L`)
        addLine('Wall Thickness', '18mm')

        const bracing = calculateBracing(dims.internalWidth, dims.internalHeight, dims.internalDepth, 18)
        addLine('Bracing', bracing.description)

        const damping = calculateDampingVolume(vb)
        addLine('Damping Material', damping.material)
        addLine('Damping Weight', `${(damping.weightGrams / 1000).toFixed(2)} kg`)

        y += 4
        addSeparator()

        // ─── Cut List ───
        addSectionHeader('10. Cut List')
        const cuts = generateCutList(dims, 18)
        cuts.forEach(cut => {
            addLine(cut.nameHe, `${cut.widthMm} x ${cut.heightMm} mm (x${cut.quantity})`)
        })
    }
    y += 4
    addSeparator()

    // ─── Amplifier ───
    addSectionHeader('7. Amplifier Requirements')
    if (woofer && woofer.sensitivity > 0 && woofer.re > 0) {
        try {
        const ampRec = calculateAmplifierRecommendation(
            woofer.sensitivity, settings.listeningDistance,
            woofer.re, woofer.pe || 85
        )
        addLine('Min Power', `${ampRec.minPowerWatts.toFixed(1)} W`)
        addLine('Recommended Power', `${ampRec.recommendedPowerWatts.toFixed(0)} W`)
        addLine('Min Damping Factor', `${ampRec.dampingFactorMin}`)
        addLine('Recommended Class', ampRec.classRecommendation)
        } catch { /* ignore */ }
    }
    y += 4
    addSeparator()

    // ─── Room Acoustics ───
    addSectionHeader('8. Room Acoustics')
    const modes = calculateRoomModes(settings.roomLength, settings.roomWidth, settings.roomHeight)
    addLine('Axial Modes (first 3)', modes.slice(0, 3).map(m => `${m.frequency.toFixed(1)}Hz (${m.dimension})`).join(', '))
    const vol = settings.roomLength * settings.roomWidth * settings.roomHeight
    const schroeder = 2000 * Math.sqrt(0.5 / vol)
    addLine('Room Volume', `${vol.toFixed(1)} m3`)
    addLine('Schroeder Frequency', `${schroeder.toFixed(0)} Hz`)

    y += 8

    // ─── Footer ───
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text('Generated by SpeakarBuilder | https://speakarbuilder.app', pageWidth / 2, 285, { align: 'center' })

    // Save
    const filename = (settings.name || 'SpeakarBuilder-Report').replace(/[^a-zA-Z0-9\u0590-\u05FF_-]/g, '_')
    doc.save(`${filename}.pdf`)
    } catch (err) {
        console.error('PDF export failed:', err)
        alert('שגיאה בייצוא PDF. ודאו שהזנתם נתוני דרייבר תקינים.')
    }
}
