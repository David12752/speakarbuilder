"""
SpeakarBuilder — ASIO Bridge
============================
גשר WebSocket בין SpeakarBuilder (דפדפן) לבין ASIO / WDM drivers.

דרישות:
    pip install sounddevice websockets numpy

הפעלה:
    python asio_bridge.py

הגשר מאזין על ws://localhost:8765
"""

import asyncio
import json
import threading
import numpy as np
import sounddevice as sd
import websockets
import websockets.exceptions
from typing import Optional

# ──────────────────────────────────────────────
# State
# ──────────────────────────────────────────────
BRIDGE_PORT = 8765
_stream: Optional[sd.InputStream] = None
_active_websockets: set = set()
_selected_device: Optional[int] = None
_selected_sr: int = 48000
_selected_blocksize: int = 512
_stream_lock = threading.Lock()


# ──────────────────────────────────────────────
# Device helpers
# ──────────────────────────────────────────────
def list_devices() -> list[dict]:
    """Return all audio devices with ASIO devices flagged."""
    devices = []
    for idx, d in enumerate(sd.query_devices()):
        host_api = sd.query_hostapis(d["hostapi"])["name"]
        devices.append({
            "index": idx,
            "name": d["name"],
            "hostApi": host_api,
            "isAsio": "ASIO" in host_api,
            "maxInputChannels": d["max_input_channels"],
            "maxOutputChannels": d["max_output_channels"],
            "defaultSampleRate": int(d["default_samplerate"]),
            "defaultLatencyMs": round(d["default_low_input_latency"] * 1000, 2),
        })
    return devices


def supported_sample_rates(device_idx: int) -> list[int]:
    candidates = [44100, 48000, 88200, 96000, 192000]
    supported = []
    for sr in candidates:
        try:
            sd.check_input_settings(device=device_idx, samplerate=sr, channels=1)
            supported.append(sr)
        except Exception:
            pass
    return supported or [48000]


# ──────────────────────────────────────────────
# Audio stream — sends RMS level to all clients
# ──────────────────────────────────────────────
def _audio_callback(indata: np.ndarray, frames: int, time, status):
    if status:
        print(f"[audio] status: {status}")
    rms = float(np.sqrt(np.mean(indata ** 2)))
    peak = float(np.max(np.abs(indata)))
    msg = json.dumps({"type": "level", "rms": round(rms, 4), "peak": round(peak, 4)})
    for ws in list(_active_websockets):
        asyncio.run_coroutine_threadsafe(_safe_send(ws, msg), asyncio.get_event_loop())


async def _safe_send(ws, msg: str):
    try:
        await ws.send(msg)
    except Exception:
        _active_websockets.discard(ws)


def _stop_stream():
    global _stream
    with _stream_lock:
        if _stream and _stream.active:
            _stream.stop()
            _stream.close()
        _stream = None


def _start_stream(device_idx: int, sr: int, blocksize: int) -> Optional[str]:
    global _stream, _selected_device, _selected_sr, _selected_blocksize
    _stop_stream()
    _selected_device = device_idx
    _selected_sr = sr
    _selected_blocksize = blocksize
    try:
        dev = sd.query_devices(device_idx)
        nch = min(dev["max_input_channels"], 2)
        if nch == 0:
            return "המכשיר שנבחר אינו תומך בקלט אודיו"
        with _stream_lock:
            _stream = sd.InputStream(
                device=device_idx,
                channels=nch,
                samplerate=sr,
                blocksize=blocksize,
                callback=_audio_callback,
            )
            _stream.start()
        return None  # no error
    except Exception as e:
        return str(e)


# ──────────────────────────────────────────────
# WebSocket handler
# ──────────────────────────────────────────────
async def handler(websocket):
    _active_websockets.add(websocket)
    print(f"[ws] client connected ({len(_active_websockets)} total)")
    try:
        # Send device list immediately on connect
        devices = list_devices()
        await websocket.send(json.dumps({"type": "devices", "devices": devices}))

        # Send current stream status
        await websocket.send(json.dumps({
            "type": "streamStatus",
            "active": _stream is not None and _stream.active,
            "device": _selected_device,
            "sampleRate": _selected_sr,
            "blockSize": _selected_blocksize,
        }))

        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            # ── handle commands ──────────────────────
            if msg.get("type") == "startStream":
                dev_idx = msg.get("device", _selected_device)
                sr = msg.get("sampleRate", _selected_sr)
                bs = msg.get("blockSize", _selected_blocksize)
                if dev_idx is None:
                    await websocket.send(json.dumps({"type": "error", "message": "לא נבחר מכשיר"}))
                    continue
                err = _start_stream(int(dev_idx), int(sr), int(bs))
                if err:
                    await websocket.send(json.dumps({"type": "error", "message": err}))
                else:
                    srs = supported_sample_rates(int(dev_idx))
                    dev = sd.query_devices(int(dev_idx))
                    latency = round(dev["default_low_input_latency"] * 1000, 2)
                    await websocket.send(json.dumps({
                        "type": "streamStatus",
                        "active": True,
                        "device": dev_idx,
                        "sampleRate": sr,
                        "blockSize": bs,
                        "latencyMs": latency,
                        "supportedSampleRates": srs,
                    }))

            elif msg.get("type") == "stopStream":
                _stop_stream()
                await websocket.send(json.dumps({"type": "streamStatus", "active": False}))

            elif msg.get("type") == "getSampleRates":
                dev_idx = msg.get("device", _selected_device)
                if dev_idx is not None:
                    srs = supported_sample_rates(int(dev_idx))
                    await websocket.send(json.dumps({"type": "sampleRates", "rates": srs, "device": dev_idx}))

            elif msg.get("type") == "ping":
                await websocket.send(json.dumps({"type": "pong"}))

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        _active_websockets.discard(websocket)
        print(f"[ws] client disconnected ({len(_active_websockets)} total)")


# ──────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────
async def main():
    print("=" * 50)
    print("  SpeakarBuilder — ASIO Bridge")
    print(f"  מאזין על ws://localhost:{BRIDGE_PORT}")
    print("=" * 50)
    print("\nמכשירי שמע זמינים:")
    for d in list_devices():
        flag = "★ ASIO" if d["isAsio"] else "  "
        print(f"  [{d['index']:2d}] {flag}  {d['name']}  [{d['hostApi']}]")
    print()

    async with websockets.serve(handler, "localhost", BRIDGE_PORT):
        print(f"✓ גשר פעיל — פתחו את SpeakarBuilder בדפדפן")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
