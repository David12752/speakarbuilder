# SpeakarBuilder — ניתוח פערים מלא ותכנית עבודה
## Full Gap Analysis vs VituixCAD / XSim / WinISD / Hornresp / REW

---

## חלק א׳ — מה קיים ועובד ✅

### מנוע חישובים (18 מודולים)
| מודול | סטטוס | הערות |
|---|---|---|
| `crossover.ts` — BW/LR/Bessel/Cheby סדר 1-4 | ✅ עובד | 10 פונקציות, ערכי g-values תקינים |
| `sealed-box.ts` — Qtc, Fc, F3 | ✅ עובד | נוסחאות מדויקות |
| `ported-box.ts` — אורך פורט, מהירות, בטיחות | ✅ עובד | 4 פונקציות |
| `bandpass.ts` — 4th-order single-reflex | ⚠️ מפושט | multipliers אמפיריים, לא alignment tables |
| `passive-radiator.ts` — מסה מוספת, כיוונון | ✅ עובד | נפח ארגז מפושט |
| `frequency-response.ts` — sealed rolloff, filter atten | ⚠️ חלקי | Bessel משתמש באקספוננטים אמפיריים |
| `analysis.ts` — impedance, group delay, excursion | ⚠️ שגיאות | ראה חלק ב׳ |
| `off-axis.ts` — מודל פיסטון, Bessel J1 | ✅ מדויק | פיזיקה נכונה |
| `networks.ts` — Zobel, L-Pad, BSC, Notch | ❌ שגיאת L-Pad | ראה חלק ב׳ |
| `parametric-eq.ts` — Peak, Shelf EQ | ⚠️ חלקי | Shelf לא biquad מלא |
| `dsp-crossover.ts` — DSP config, miniDSP export | ✅ עובד | |
| `frd-zma-import.ts` — FRD/ZMA parsing + T/S estimation | ✅ מדויק | Impedance peak method |
| `thiele-small.ts` — 9 פונקציות T/S derivation | ✅ מדויק | כל הנוסחאות נכונות |
| `physical-dimensions.ts` — מידות ארגז, cut list | ✅ עובד | |
| `amplifier.ts` — power/SPL | ✅ עובד | |
| `room-acoustics.ts` — modes, RT60, Schroeder | ✅ מדויק | Sabine equation |
| `e-series.ts` — E12/E24 snap | ✅ עובד | |
| `power-dissipation.ts` — DCR/ESR heat | ✅ עובד | |

### ממשק משתמש (12 שלבי Wizard)
| שלב | סטטוס |
|---|---|
| Step01 — הגדרות פרויקט | ⚠️ חסרות שדות (roomDimensions, listeningDistance, mainUse) |
| Step02 — בחירת דרייברים | ✅ presets + ידני + FRD/ZMA import |
| Step03 — עיצוב ארגז (sealed/ported/bandpass/PR) | ✅ |
| Step04 — עיצוב קרוסאובר (passive + DSP) | ✅ schematic + component values |
| Step05 — 9 גרפים (SPL, Impedance, Phase, GroupDelay, Excursion, PortVelocity, OffAxis, Polar, EQ) | ✅ |
| Step06 — מידות פיזיות + cut list | ✅ |
| Step07 — חישוב מגבר | ✅ |
| Step08 — אקוסטיקת חדר | ✅ |
| Step09 — רשתות (Zobel, L-Pad, BSC, Notch) | ✅ |
| Step10 — Power Dissipation | ✅ |
| Step11 — Analysis Dashboard | ✅ |
| Step12 — PDF Export | ✅ |

---

## חלק ב׳ — שגיאות נוסחה קריטיות 🔴

### 1. L-Pad — `networks.ts` שורות 23-42
**בעיה**: הנוסחה הנוכחית:
```
R1 = Z × (k - 1)
R2 = Z × k / (k - 1)
```
**הנוסחה הנכונה** (Standard L-Pad for audio attenuator):
```
R1 = Z × (k - 1) / k
R2 = Z × k / (k - 1)
```
> כאשר k = 10^(dB/20)

**השפעה**: R1 מחושב גבוה מדי בפקטור של k. עבור 6dB attenuation, R1 יהיה כפול מהדרוש.

### 2. Cone Excursion — `analysis.ts` שורות 105-125
**בעיה**: הנוסחה משתמשת ב-`sdM2 * 1000` בנואמינטור, שאין לו הצדקה פיזיקלית.
הנוסחה הנכונה ל-excursion בתחום הנמוך:
```
x(f) = V_rms / (Bl × ω²  × Mms) × |H(s)|
```
כאשר Mms מחולץ מ-T/S params: `Mms = (Bl²) / (2π × fs × Re × Qes × 2π × fs)`
**השפעה**: ערכים לא מדויקים שעלולים להטעות בתכנון sub/woofer.

### 3. Impedance Model — `analysis.ts` שורות 12-45
**בעיה**: חישוב `rTotal` ו-`xTotal` משתמש ב-denominator פעמיים (division by denominator²  effectively), מה שמשטח את העקום מסביב לתהודה.
**הנכון**: מודל impedance של רמקול הוא parallel RLC:
```
Zmotor(f) = Res / (1 + jQms(f/fs - fs/f))
Ztotal = Ze(f) + Zmotor(f)
Ze(f) = Re + j×2πf×Le
```
**השפעה**: גרף impedance לא מציג peak חד מספיק ב-Fs.

### 4. Bessel Filter Attenuation — `frequency-response.ts` שורות 62-64, 78-79
**בעיה**: משתמש באקספוננטים אמפיריים (3.6, 5.2) במקום transfer function אמיתי.
**הנכון**: Bessel 2nd order: `H(s) = 3/(s² + 3s + 3)`, 3rd order: `H(s) = 15/(s³ + 6s² + 15s + 15)`
**השפעה**: Roll-off rate לא מדויק — Bessel אמור להיות gentler מ-Butterworth.

### 5. Bandpass Response Model — `bandpass.ts`
**בעיה**: משתמש ב-simplified 2nd-order bandpass transfer function במקום proper 4th-order model. הנוסחאות לנפחים מבוססות על multipliers אמפיריים.
**השפעה**: תגובת תדר לא מדויקה, bandpass alignment לא אופטימלי.

---

## חלק ג׳ — פערים מול כל מתחרה

### VituixCAD — פערים
| פיצ׳ר | סטטוס | עדיפות |
|---|---|---|
| ייבוא מדידות רב-זוויתיות (Multi-angle FRD) | ❌ חסר | גבוהה |
| סימולציית Baffle Diffraction מגיאומטריית הפנל | ❌ חסר | גבוהה |
| אופטימיזציית קרוסאובר אוטומטית (target curve) | ❌ חסר | גבוהה |
| תמיכת FIR filter (בנוסף ל-IIR) | ❌ חסר | בינונית |
| Near-field/Far-field merge | ❌ חסר | בינונית |
| Directivity Index (DI) calculation | ❌ חסר | גבוהה |
| CTA-2034 spinorama display | ❌ חסר | גבוהה |
| Power response calculation | ❌ חסר | בינונית |
| System SPL with crossover + driver summing | ⚠️ חלקי | גבוהה |

### XSim — פערים
| פיצ׳ר | סטטוס | עדיפות |
|---|---|---|
| Drag-and-drop schematic capture | ❌ חסר (יש סכמטי סטטי) | בינונית |
| Minimum phase derivation from magnitude-only FRD | ❌ חסר | גבוהה |
| תמיכה ב-3-Way crossover | ❌ חסר (רק woofer+tweeter) | גבוהה |
| Acoustic delay/offset compensation | ⚠️ בסיסי (offsetMm בלבד) | בינונית |
| Reverse polarity per driver | ❌ חסר | בינונית |
| Component tolerance simulation | ❌ חסר | נמוכה |

### WinISD — פערים
| פיצ׳ר | סטטוס | עדיפות |
|---|---|---|
| Ported box SPL frequency response | ❌ חסר (רק port velocity) | גבוהה |
| Sealed box SPL frequency response (full curve) | ⚠️ חלקי (rolloff בלבד) | גבוהה |
| 6th-order bandpass | ❌ חסר | נמוכה |
| Sub-sonic high-pass filter simulation | ❌ חסר | בינונית |
| Sealed vs Ported comparison mode (side-by-side) | ❌ חסר | בינונית |
| Multiple port configurations (round/slot/passive) | ❌ חסר | בינונית |
| Power compression simulation | ❌ חסר | נמוכה |
| Group delay for ported/bandpass | ⚠️ חלקי (רק מ-phase data) | בינונית |
| Optimal Vb/Fb calculator (QB3/SC4/SBB4 alignments) | ❌ חסר | גבוהה |
| Multi-driver parallel wiring impact | ❌ חסר | בינונית |

### Hornresp — פערים
| פיצ׳ר | סטטוס | עדיפות |
|---|---|---|
| Horn simulation (conical, exponential, tractrix) | ❌ חסר | נמוכה* |
| Transmission line calculation | ❌ חסר | נמוכה* |
| Tapped horn design | ❌ חסר | נמוכה* |
| Acoustic impedance calculation | ❌ חסר | בינונית |
| Horn mouth/throat impedance | ❌ חסר | נמוכה* |
| 3D horn geometry export | ❌ חסר | נמוכה |

*\* Hornresp הוא כלי ייעודי מאוד — מימוש מלא דורש מאמץ רב. מומלץ להתמקד בסימולציית horn בסיסית בלבד.*

### REW (Room EQ Wizard) — פערים
| פיצ׳ר | סטטוס | עדיפות |
|---|---|---|
| Real measurement capability (mic input, sweep gen) | ❌ לא ניתן כ-web app | — |
| Waterfall/spectrogram display | ❌ חסר | בינונית |
| Minimum phase extraction (Hilbert transform) | ❌ חסר | גבוהה |
| EQ auto-optimization to target curve | ❌ חסר | בינונית |
| Measurement merge (near+far) | ❌ חסר | בינונית |
| SPL calibration/weighting (A/C/Z) | ❌ חסר | נמוכה |
| Impulse response analysis | ❌ חסר | נמוכה |

---

## חלק ד׳ — ממשקים וחיבורים חיצוניים

### ממשקים אפשריים (Web App)
| ממשק | אפשרי? | הערות |
|---|---|---|
| **ייבוא FRD/ZMA** | ✅ קיים | עובד |
| **ייצוא miniDSP config** | ✅ קיים | DSP crossover export |
| **ייצוא PDF** | ✅ קיים | jsPDF |
| **ייבוא multi-angle FRD (zip/folder)** | ⚠️ אפשרי להוסיף | File API |
| **ייצוא/ייבוא פרויקט (JSON)** | ❌ חסר — קל להוסיף | Zustand state serialize |
| **ייצוא ARTA/CLIO measurements** | ⚠️ אפשרי | Format conversion |
| **חיבור UMIK/מיקרופון USB** | ❌ לא ניתן | Web Audio API מוגבל |
| **sweep generation + measurement** | ⚠️ חלקית אפשרי | Web Audio API (מוגבל) |

### מה אי אפשר ב-Web App
1. **מדידה אמיתית עם מיקרופון** — Web Audio API תומך בקלט, אבל ללא calibration מדויקת, ללא ASIO, ללא latency compensation ברמה של REW
2. **ASIO/exclusive-mode audio** — לא קיים בדפדפנים
3. **Hardware I/O ישיר** — USB measurement mic דורש drivers

### מה כן אפשרי להוסיף
1. **בסיסי:** Web Audio API → tone generation + mic input → פשוט מדי למדידות רציניות
2. **מומלץ:** ייבוא קבצי מדידה מ-REW/ARTA/CLIO → נתמך כבר (FRD/ZMA) + אפשר להרחיב

---

## חלק ה׳ — תכנית עבודה מלאה

### Sprint 1 — תיקון שגיאות קריטיות (2-3 ימים)
| # | משימה | קובץ | מורכבות |
|---|---|---|---|
| 1.1 | תיקון נוסחת L-Pad: `R1 = Z×(k-1)/k` | `networks.ts` | קלה |
| 1.2 | תיקון Cone Excursion — חישוב Mms מ-T/S, הסרת `*1000` | `analysis.ts` | בינונית |
| 1.3 | תיקון Impedance Model — parallel RLC נכון | `analysis.ts` | בינונית |
| 1.4 | תיקון Bessel filter response — transfer function אמיתי | `frequency-response.ts` | בינונית |
| 1.5 | עדכון unit tests לכל התיקונים | `*.test.ts` | בינונית |
| 1.6 | תיקון סדר פרמטרים ב-Step12 ל-calculateAmplifierRecommendation | `Step12` | קלה |

### Sprint 2 — השלמת חישובי ליבה (3-4 ימים)
| # | משימה | קובץ | מורכבות |
|---|---|---|---|
| 2.1 | Ported box full SPL frequency response | `ported-box.ts` (new function) | גבוהה |
| 2.2 | Sealed box full SPL frequency response | `sealed-box.ts` (enhance) | בינונית |
| 2.3 | Optimal Vb/Fb calculator (QB3, SC4, SBB4 alignments) | `ported-box.ts` (new) | גבוהה |
| 2.4 | Bandpass proper 4th-order model | `bandpass.ts` (rewrite) | גבוהה |
| 2.5 | Minimum phase from magnitude (Hilbert transform) | `analysis.ts` (new) | גבוהה |
| 2.6 | Shelf EQ → proper biquad implementation | `parametric-eq.ts` | בינונית |
| 2.7 | Notch filter → proper RLC from impedance data | `networks.ts` | בינונית |

### Sprint 3 — תמיכה ב-3-Way (3-4 ימים)
| # | משימה | קובץ | מורכבות |
|---|---|---|---|
| 3.1 | הרחבת Store ל-3-way: 2 crossover frequencies | `projectStore.ts` | בינונית |
| 3.2 | UI ל-3-Way crossover design | `Step04` | גבוהה |
| 3.3 | System SPL sum — woofer+mid+tweeter עם crossover | `frequency-response.ts` | גבוהה |
| 3.4 | Acoustic delay compensation per driver | `frequency-response.ts` | בינונית |
| 3.5 | Reverse polarity per driver toggle | `projectStore.ts` + `Step04` | קלה |

### Sprint 4 — Directivity & Baffle (3-4 ימים)
| # | משימה | קובץ | מורכבות |
|---|---|---|---|
| 4.1 | Baffle diffraction simulation (Olson model) | `baffle-diffraction.ts` (new) | גבוהה |
| 4.2 | Multi-angle FRD import (zip with 0°-180° files) | `frd-zma-import.ts` (enhance) | בינונית |
| 4.3 | Directivity Index (DI) calculation | `off-axis.ts` (enhance) | גבוהה |
| 4.4 | CTA-2034 Spinorama plot | `Step05` (new tab) | גבוהה |
| 4.5 | Power response calculation & display | `off-axis.ts` | בינונית |

### Sprint 5 — WinISD Parity (2-3 ימים)
| # | משימה | קובץ | מורכבות |
|---|---|---|---|
| 5.1 | Sealed vs Ported comparison mode (split chart) | `Step05` | בינונית |
| 5.2 | Sub-sonic high-pass filter simulation | `frequency-response.ts` | קלה |
| 5.3 | Multiple port configs (round/slot) | `ported-box.ts` + `Step03` | בינונית |
| 5.4 | Multi-driver parallel wiring impact on T/S | `thiele-small.ts` | בינונית |
| 5.5 | Power compression simulation | `amplifier.ts` (new) | בינונית |
| 5.6 | Group delay for ported/bandpass transfer function | `analysis.ts` | בינונית |

### Sprint 6 — Crossover Optimizer & DSP (3-4 ימים)
| # | משימה | קובץ | מורכבות |
|---|---|---|---|
| 6.1 | Crossover auto-optimizer (minimize error vs target) | `crossover-optimizer.ts` (new) | גבוהה מאוד |
| 6.2 | FIR filter support alongside IIR | `dsp-crossover.ts` (enhance) | גבוהה |
| 6.3 | EQ auto-optimization to target curve | `parametric-eq.ts` (enhance) | גבוהה |
| 6.4 | Component tolerance Monte Carlo simulation | `crossover.ts` (new) | בינונית |

### Sprint 7 — UI השלמות וייצוא (2-3 ימים)
| # | משימה | קובץ | מורכבות |
|---|---|---|---|
| 7.1 | הוספת שדות roomDimensions/listeningDistance/mainUse ל-Step01 | `Step01` | קלה |
| 7.2 | הצגת Qtc/Fc ב-UI של sealed box | `Step03` | קלה |
| 7.3 | ייצוא/ייבוא פרויקט כ-JSON | store + new UI | קלה |
| 7.4 | Waterfall/spectrogram display (from imported data) | `Step05` (new tab) | גבוהה |
| 7.5 | Near-field + Far-field FRD merge tool | `frd-zma-import.ts` | בינונית |

### Sprint 8 — Horn & Transmission Line (אופציונלי, 5+ ימים)
| # | משימה | קובץ | מורכבות |
|---|---|---|---|
| 8.1 | Basic horn simulation (conical, exp, tractrix profiles) | `horn.ts` (new) | גבוהה מאוד |
| 8.2 | Transmission line calculation | `transmission-line.ts` (new) | גבוהה |
| 8.3 | Acoustic impedance at horn mouth/throat | `horn.ts` | גבוהה |
| 8.4 | Horn/TL enclosure type ב-Step03 | `Step03` (enhance) | בינונית |
| 8.5 | 6th-order bandpass model | `bandpass.ts` (enhance) | גבוהה |

---

## סיכום עדיפויות

### חייב לתקן עכשיו (Sprint 1) — 🔴
- נוסחת L-Pad שגויה
- מודל Impedance לא מדויק
- Cone excursion עם factor שגוי
- Bessel response לא מדויק

### חייב להוסיף לגרסת core (Sprints 2-3) — 🟠
- Ported box frequency response (חסר לחלוטין!)
- 3-Way crossover support
- Minimum phase extraction
- Optimal alignment calculator

### חשוב לתחרותיות (Sprints 4-6) — 🟡
- Baffle diffraction
- Spinorama/CTA-2034
- Crossover optimizer
- Multi-angle measurements

### Nice-to-have (Sprints 7-8) — 🔵
- Horn/Transmission line (Hornresp parity)
- Waterfall display
- Monte Carlo tolerance

---

## אומדן זמן כולל
| Sprint | ימים | תיאור |
|---|---|---|
| Sprint 1 | 2-3 | תיקון שגיאות |
| Sprint 2 | 3-4 | חישובי ליבה |
| Sprint 3 | 3-4 | 3-Way support |
| Sprint 4 | 3-4 | Directivity & Baffle |
| Sprint 5 | 2-3 | WinISD parity |
| Sprint 6 | 3-4 | Optimizer & DSP |
| Sprint 7 | 2-3 | UI & Export |
| Sprint 8 | 5+ | Horn/TL (אופציונלי) |
| **סה״כ** | **~23-30 ימים** | **ללא Sprint 8** |
