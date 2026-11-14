# System Architecture

## Module 1 — User Interface & Text Acquisition
The React/TypeScript web interface accepts announcement text and sends it to the backend.

## Module 2 — Text Processing & Speech Synthesis
The Express backend validates the text and attempts the configured Wit.ai synthesis service. When unavailable, the current backend generates a synthetic WAV signal locally.

## Module 3 — Wireless Audio Streaming & Network Management
The ESP32 joins the same 2.4 GHz Wi-Fi network as the backend host. It polls the queue endpoint and downloads the audio file over HTTP.

## Module 4 — Embedded Playback & System Monitoring
The standalone firmware validates WAV/PCM data and writes samples to GPIO 25 DAC. PAM8403 amplifies the signal for the speaker. The ESP32 reports Wi-Fi RSSI and status to the backend.

## Block flow

```text
Browser GUI -> Backend TTS/WAV -> Queue + Audio API
                                  |
                             HTTP polling
                                  |
                         2.4 GHz Wi-Fi RF
                                  |
                           ESP32 receiver
                                  |
                         WAV / PCM decoder
                                  |
                          GPIO 25 DAC output
                                  |
                             PAM8403 amp
                                  |
                               Speaker
```

## Backend endpoints used by firmware

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/esp32/poll` | Read pending playback command |
| GET | Audio URL returned by poll | Download generated WAV |
| POST | `/api/esp32/report` | Report RSSI and receiver status |

The Web Serial and Bluetooth features present in the wider web application are separate prototype interfaces and are not used by this standalone Wi-Fi receiver sketch.
