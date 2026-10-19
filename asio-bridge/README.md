# SpeakarBuilder — ASIO Bridge

גשר WebSocket בין SpeakarBuilder (דפדפן) לבין ASIO/WDM drivers.

## דרישות

- Python 3.11+
- [ASIO4ALL](https://asio4all.org/) (אם אין כרטיס קול עם ASIO נייטיב)
- ספריות Python:

```
pip install -r requirements.txt
```

## הפעלה

```
python asio_bridge.py
```

הגשר מאזין על `ws://localhost:8765`.

## פרוטוקול WebSocket

### שרת → לקוח

| סוג | תיאור |
|-----|--------|
| `devices` | רשימת כל מכשירי השמע עם דגל `isAsio` |
| `streamStatus` | מצב ה-stream הנוכחי (פעיל/מופסק, sample rate, block size, latency) |
| `level` | `{ rms, peak }` — נשלח בזמן אמת כשה-stream פעיל |
| `sampleRates` | sample rates נתמכות למכשיר נבחר |
| `error` | הודעת שגיאה |
| `pong` | תגובה ל-ping |

### לקוח → שרת

| סוג | תיאור |
|-----|--------|
| `startStream` | `{ device, sampleRate, blockSize }` — הפעל stream |
| `stopStream` | הפסק stream |
| `getSampleRates` | `{ device }` — שאל אילו sample rates נתמכות |
| `ping` | בדוק חיבור |

## Tips

- למדידות מדויקות (FRD/ZMA) השתמשו ב-**REW** עם כרטיס ה-ASIO, ייצאו FRD ותייבאו ל-SpeakarBuilder
- ASIO4ALL עובד עם רוב כרטיסי הקול; בכרטיסי Focusrite/RME/MOTU יש ASIO נייטיב
