# Design Decisions

## Current hardware baseline

- Controller: ESP32-WROOM-32 / classic ESP32 DevKit with built-in DAC
- Wireless link: 2.4 GHz Wi-Fi station mode
- Transport: HTTP polling and WAV download
- Audio: mono 16-bit PCM WAV
- Analog output: GPIO 25 DAC1
- Amplifier: PAM8403
- Output transducer: compatible speaker

## Why Wi-Fi and HTTP

Wi-Fi provides the 2.4 GHz electromagnetic-wave link relevant to the EMF & Waves course. HTTP polling and file download are simple to inspect and implement for a first embedded prototype. This is a queued file-transfer design, not a low-latency continuous audio stream.

## Why audio synthesis runs on the backend

The backend handles text processing and audio generation; the ESP32 performs network reception and playback. This keeps the microcontroller's workload relatively small.

## Why PAM8403 rather than MAX98357A

The standalone firmware currently writes analog samples to the classic ESP32 DAC. PAM8403 accepts an analog input. MAX98357A is an I2S digital-input amplifier and requires an I2S firmware driver and separate BCLK/LRCLK/DIN wiring. It is not a drop-in replacement for PAM8403 in this sketch.

## Known constraints

- Entire WAV file is buffered in ESP32 RAM before playback; long audio can fail allocation.
- The external TTS provider may return an encoding the sketch does not support.
- The server's queue/cache are in-memory.
- The local fallback WAV generator produces synthetic tones/formant-like audio, not intelligible speech.
- Dashboard RF readings and some device states are demonstration data.
- The existing Arduino-code UI tab contains a separate Bluetooth/local-output prototype; it should not be confused with the standalone firmware file.
