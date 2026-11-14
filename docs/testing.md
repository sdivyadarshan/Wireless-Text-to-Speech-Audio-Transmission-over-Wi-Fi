# Testing Checklist and Observation Log

No result is marked complete until it has been performed on the actual setup.

## A. Software and server

- [ ] Install dependencies and start the backend.
- [ ] Open the web application from the laptop.
- [ ] Submit a short announcement.
- [ ] Confirm the backend returns an audio ID and audio URL.
- [ ] Download the audio URL and inspect/play the WAV.
- [ ] Confirm the ESP32 poll endpoint returns IDLE when there is no active job.
- [ ] Confirm the poll endpoint returns STREAM and a valid audio URL for an active job.

## B. ESP32 setup

- [ ] Install Espressif ESP32 board package and ArduinoJson.
- [ ] Enter local Wi-Fi credentials and server LAN IP in the sketch.
- [ ] Compile the sketch for the exact ESP32 board.
- [ ] Upload and open Serial Monitor at 115200 baud.
- [ ] Confirm Wi-Fi connection and record the ESP32 IP address.
- [ ] Confirm the ESP32 can reach the backend host.
- [ ] Confirm the receiver posts RSSI/status successfully.

## C. Audio output

- [ ] Connect GPIO 25 DAC to PAM8403 L_IN.
- [ ] Connect common ground.
- [ ] Power the PAM8403 from a suitable regulated supply.
- [ ] Connect a compatible speaker to the amplifier's speaker output.
- [ ] Start with low amplifier volume.
- [ ] Send a short supported mono 16-bit PCM WAV.
- [ ] Confirm audio playback and note noise, clipping or dropouts.
- [ ] Test a longer clip and note any ESP32 memory limitation.

## D. EMF & Waves experiment

Keep the router, ESP32 orientation and test audio consistent. Take at least three readings per distance/condition.

| Trial | Distance (m) | Condition | RSSI (dBm) | Request-to-play latency (ms) | Audio notes |
|---:|---:|---|---:|---:|---|
| 1 | | Line of sight | | | |
| 2 | | Line of sight | | | |
| 3 | | Line of sight | | | |
| 4 | | Through obstacle | | | |
| 5 | | Through obstacle | | | |

### Measurement definitions

- RSSI: record the ESP32 `WiFi.RSSI()` value in dBm.
- Latency: define the start and end events (for example, laptop submit time to receiver's playback-start event) and measure consistently.
- Packet loss: HTTP file transfer does not itself provide a project-level packet-loss percentage. Implement sequence-numbered probes or explicitly count failed application requests if packet loss is to be reported.
- Audio quality: use a consistent subjective scale or a defined objective metric.

Do not use simulated dashboard readings as measured results. Indoor multipath can make RSSI fluctuate; it need not decrease monotonically at every successive point.
