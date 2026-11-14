# Hardware and Wiring

## Components

| Component | Qty. | Purpose |
|---|---:|---|
| ESP32-WROOM-32 DevKit | 1 | Wi-Fi receiver and DAC |
| PAM8403 amplifier module | 1 | Analog audio power amplifier |
| Compatible speaker (e.g. 3 W) | 1 | Audio output |
| Regulated 5 V supply | 1 | Amplifier power |
| USB cable | 1 | ESP32 programming and power |
| Breadboard and jumper wires | As needed | Prototype connections |

## Wiring for the standalone firmware

| ESP32 / supply | PAM8403 |
|---|---|
| GPIO 25 (DAC1) | L_IN |
| GND | GND |
| Regulated 5 V | VCC |
| PAM8403 +L / -L output | Speaker terminals |

The sketch uses GPIO 25 only. GPIO 26 is not required for the mono firmware. GPIO 27 mute control is not used because PAM8403 breakout boards do not share a universal mute-pin layout.

## Power and safety notes

- Use a regulated 5 V supply with sufficient current for the amplifier and speaker.
- If using a separate amplifier supply, connect its ground to ESP32 ground.
- Do not assume the ESP32 board's 5 V/VIN pin can supply the amplifier load.
- PAM8403 speaker outputs are bridge-tied; do not connect either speaker terminal to ground.
- Never connect a speaker directly to an ESP32 GPIO.
- Confirm the module's printed pin labels and speaker impedance before powering it.

## Alternative amplifier warning

MAX98357A is an I2S digital-input amplifier. It requires BCLK, LRCLK and DIN signals and a matching I2S firmware implementation. It cannot be substituted for PAM8403 without changing the firmware and wiring.
