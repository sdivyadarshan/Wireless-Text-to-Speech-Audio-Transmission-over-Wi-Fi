# ESP32 Wireless TTS Announcer

**Live Web Application:** [https://esp32-tts-announcer.ai.studio](https://esp32-tts-announcer.ai.studio)

A full-stack IoT Wireless Text-to-Speech (TTS) Public Address & Campus Announcement system built with React, TypeScript, Express, Tailwind CSS, the browser Web Serial API, and ESP32 Arduino C++ firmware — featuring neural/synthesized speech generation, Wi-Fi HTTP audio streaming, Bluetooth Classic A2DP speaker discovery, and automatic hardware failover to a local PAM8403 3W amplifier.

---

## Overview & Inspiration

Traditional campus and institutional Public Address (PA) systems rely on fixed wired rooms, manual microphone booths, and single points of failure. **ESP32 Wireless TTS Announcer** replaces rigid PA consoles with a browser-accessible, hardware-backed wireless broadcasting platform powered by an **ESP32-WROOM-32** microcontroller.

What began as a Wi-Fi TTS audio transmitter evolved into a resilient, dual-output IoT broadcast architecture:

- **Natural & Synthesized Speech Engine** powered by Wit.ai TTS with an automatic server-side 24 kHz 16-bit PCM/WAV acoustic & chime synthesizer fallback
- **10+ Institutional Tone Presets** (`Standard`, `Strict`, `Calm`, `Welcoming`, `Formal`, `Friendly`, `Urgent`, `Emergency`, `Professional`, `Gentle`, and `Custom`) with per-tone cadence, pitch, and lead-in chimes
- **Direct Browser-to-ESP32 USB Control** via the Web Serial API (`115200` baud) with live TX/RX console, `TEST`/`PING` diagnostics, and unplug/reset recovery
- **Bluetooth Classic A2DP Speaker Discovery & Management** controlled directly from the web interface through the ESP32 (`BT_SCAN`, `BT_CONNECT`, `BT_DISCONNECT`)
- **Zero-Downtime Automatic Audio Failover** prioritizing external Bluetooth PA receivers while keeping a wired **PAM8403 + 3W speaker** continuously armed as an instant fallback
- **1-Second Precision Background Scheduler** for automated timed campus broadcasts across multi-zone PA endpoints
- **2.4 GHz EMF & Wireless Propagation Lab** (`2.412 GHz`, λ ≈ 12.44 cm) plotting measured vs. theoretical Log-Distance / FSPL RSSI, latency, and packet loss with CSV export

---

## System & Audio Output Architecture

The ESP32 acts as the physical hardware controller bridging the web console to campus audio hardware over **USB Web Serial** (development/direct control) and **2.4 GHz Wi-Fi HTTP** (remote streaming & queue polling):

```text
Website Console (React + Web Serial API)
   │
   ├──► USB Serial (115200 baud) / Wi-Fi HTTP (/api/esp32/*)
   │
   ▼
ESP32-WROOM-32 Hardware Controller
   │
   ├── Bluetooth PA Connected? ── YES ──► Bluetooth Classic A2DP Source ──► Bluetooth PA Receiver / Campus Amplifier (AUX)
   │
   └── Bluetooth Disconnected  ── NO  ──► ESP32 DAC (GPIO 25/26) + MUTE (GPIO 27) ──► PAM8403 Class-D Amp ──► 3W Local Speaker
