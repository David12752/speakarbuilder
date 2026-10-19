# SpeakarBuilder - Sprint 3: UI Integration Plan

This sprint focuses on wiring the calculation engine (from Sprint 2) to the user interface for the core wizard steps.

## Proposed Changes

### Setup Form Components
- Create reusable `ParameterInput` for numerical values with validation.
- Create an `InfoTooltip` for displaying theoretical explanations in RTL.

### Step 2: Driver Selection (`Step02_DriverSelection.tsx`)
- Build the interface for inputting Thiele-Small parameters.
- Provide inputs for Fs, Qts, Qes, Qms, Vas, Xmax, Sd, Re, Le, Sensitivity, Pe, BL.
- Implement real-time calculation of EBP using the `thiele-small` module.
- Display recommendations based on EBP (Sealed vs. Ported).
- Expand Zustand `projectStore.ts` to hold driver parameters.

### Step 3: Enclosure Design (`Step03_EnclosureDesign.tsx`)
- Build the interface for Sealed and Bass Reflex enclosure selection.
- Implement real-time volume calculation (`calculateOptimalSealedVb`).
- Wire the port calculator (`calculatePortLength`) to dynamic inputs for box volume, tuning frequency, and port diameter.
- Expand Zustand store to hold enclosure choices and values.

## Verification Plan
- Manually test input validation in Step 2.
- Verify EBP recommendation updates instantly when Qes/Fs change.
- Verify Port Length calculation updates instantly when Vb/Fb/Dv change.
- Ensure state persists across Wizard navigation.
