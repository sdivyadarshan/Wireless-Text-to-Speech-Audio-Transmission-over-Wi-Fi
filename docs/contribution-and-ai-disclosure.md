# Contribution and AI-Assistance Disclosure

## Project-owner responsibilities

The project owner is responsible for:
- Selecting the project topic and defining its EMF & Waves application.
- Deciding the project modules and intended system behavior.
- Creating and maintaining the GitHub repository.
- Selecting, purchasing and assembling the physical components.
- Wiring the ESP32, amplifier and speaker.
- Configuring the Wi-Fi network and server.
- Uploading and testing the firmware on the actual board.
- Collecting RSSI, latency and audio-quality measurements.
- Reviewing the implementation and taking responsibility for final project claims.

Only claim hardware assembly, original code, experiments or validation that have actually been completed.

## AI-assisted work

AI assistance was used for:
- Explaining system architecture, Wi-Fi communication and WAV/PCM handling.
- Reviewing and drafting the standalone ESP32 receiver sketch.
- Suggesting code structure, error handling and debugging steps.
- Drafting README, wiring, algorithm, design and testing documentation.

AI-assisted code must be compiled, tested and understood by the project owner before being presented as a validated hardware implementation.

## Existing repository provenance

The React/TypeScript application, backend and UI components existed in the repository before this documentation package. This disclosure does not claim that the project owner independently authored every existing source file.

The standalone firmware in `firmware/ESP32_Wireless_PA.ino` was prepared with AI assistance based on the repository's current backend poll/report endpoints and WAV generator. It has not yet been compiled or verified on physical hardware.

## Validation status

No physical test results are claimed by this documentation. Add photographs, serial logs and measured observations after completing the tests. Clearly label any simulated UI values as simulated.
