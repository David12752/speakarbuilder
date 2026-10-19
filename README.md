# SpeakarBuilder

A loudspeaker design workbench: crossovers, enclosures and measurements in one app, in the spirit of VituixCAD, WinISD
and XSim.

What it calculates (the engine is plain TypeScript, under `src/`):

- **Crossovers:** Butterworth, Linkwitz-Riley, Bessel and Chebyshev, orders 1 to 4. Zobel, L-pad, baffle-step and notch
  networks, values snapped to E12/E24.
- **Enclosures:** sealed (Qtc, Fc, F3), ported (port length, air speed), 4th-order bandpass and passive radiator, with the
  box's physical dimensions and a cut list.
- **Drivers:** Thiele/Small parameters, from the datasheet or estimated from imported FRD/ZMA measurement files.
- **Analysis:** frequency response, impedance, group delay, excursion, off-axis response (piston model), amplifier power
  and SPL, heat in the crossover parts, and room modes and RT60.
- **DSP:** a DSP crossover set-up with an export for miniDSP.
- `asio-bridge/`: a small Python WebSocket bridge that lets the app use ASIO and WDM audio drivers for measurements.

## Run

```bash
npm install
npm run dev            # in the browser
npm run electron:dev   # as a desktop app
npm test
```

## Status

Some models are still simplified: bandpass alignments, part of the Bessel response and shelf EQ. The detailed list is in
`FULL_GAP_ANALYSIS_AND_WORKPLAN.md` (in Hebrew). Published from the author's archive as is.

## Licence

MIT (see `LICENSE`).
