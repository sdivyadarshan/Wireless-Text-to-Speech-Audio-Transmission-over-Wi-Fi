# Algorithm and Processing Logic

## End-to-end sequence

1. The browser interface collects the announcement text.
2. The backend validates that the text is non-empty.
3. The backend attempts Wit.ai synthesis if a server token is configured.
4. If synthesis is unavailable, the current backend creates a locally generated WAV signal. This fallback is synthetic audio and is not natural-language speech.
5. The backend stores the WAV buffer in an in-memory cache and associates it with an audio ID.
6. The announcement is queued and marked for playback.
7. The ESP32 polls `GET /api/esp32/poll`.
8. When the response contains `command: STREAM`, the ESP32 reads `jobId` and `audioUrl`.
9. The ESP32 downloads the WAV file over HTTP.
10. The firmware checks RIFF/WAVE chunks and validates PCM format, mono channel count, sample width and sample rate.
11. Each signed 16-bit PCM sample is converted to an unsigned 8-bit value and sent to GPIO 25 DAC at the sample cadence.
12. The PAM8403 amplifies the analog signal and drives the speaker.
13. The ESP32 posts RSSI and receiver status to `POST /api/esp32/report`.

## Audio format supported by the standalone sketch

- Container: RIFF/WAVE
- Encoding: uncompressed PCM (format code 1)
- Channels: mono
- Sample width: 16 bits
- Sample rate: 8 kHz to 48 kHz (the repository's local generator uses 24 kHz)

Other encodings, stereo WAV and compressed audio are rejected. The sketch buffers the entire audio file in RAM before playback, so keep test announcements short.

## EMF calculation

`λ = c/f`

For a 2.412 GHz Wi-Fi channel:

`λ ≈ 3 × 10⁸ / 2.412 × 10⁹ ≈ 0.1244 m`

The actual RSSI and latency must be measured during the experiment. UI demonstration values are not experimental results.
