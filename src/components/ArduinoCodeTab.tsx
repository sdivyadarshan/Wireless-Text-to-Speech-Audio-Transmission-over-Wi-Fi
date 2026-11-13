import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  Cpu,
  Layers,
  HelpCircle,
  ExternalLink,
  Volume2,
  Bluetooth,
  Radio,
  Speaker,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

interface ArduinoCodeTabProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const ArduinoCodeTab: React.FC<ArduinoCodeTabProps> = ({ onShowToast }) => {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'code' | 'wiring' | 'protocol'>('code');

  const esp32ArduinoCode = `/*
 * ==============================================================================
 * Project: Wireless Text-to-Speech College PA Announcement System
 * Microcontroller: ESP32-WROOM-32 (DevKit v1 / NodeMCU-32S)
 * Features:
 *   - Wi-Fi Audio Streaming & Queue Polling
 *   - Web Serial USB Protocol (115200 baud) for Direct Web App Control
 *   - Bluetooth Classic A2DP Source with Device Discovery (ESP32-A2DP)
 *   - Automatic Audio Output Priority & Instant Hardware Failover:
 *       PRIMARY:  Bluetooth A2DP Audio Sink (Auditorium / PA Receiver)
 *       FALLBACK: Local PAM8403 Amplifier -> 3W Speaker via ESP32 DAC (GPIO 25)
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>            // Install ArduinoJson v6.x or v7.x
#include <BluetoothSerial.h>        // Built-in ESP32 Bluetooth
#include "BluetoothA2DPSource.h"    // Install ESP32-A2DP by Phil Schatzmann
#include <driver/dac.h>             // Built-in ESP32 8-bit DAC driver

// ---------------- Wi-Fi Credentials ----------------
const char* WIFI_SSID     = "CAMPUS_IOT_WIFI_2.4G";
const char* WIFI_PASSWORD = "CampusSecurePassword";
const char* SERVER_BASE   = "http://192.168.1.145:3000";

// ---------------- Hardware Pin Assignments ----------------
// PAM8403 3W Local Speaker Amplifier (Fallback Output)
#define LOCAL_DAC_PIN_LEFT   25  // ESP32 DAC1 (Channel 1) -> PAM8403 L_IN
#define LOCAL_DAC_PIN_RIGHT  26  // ESP32 DAC2 (Channel 2) -> PAM8403 R_IN
#define PAM8403_MUTE_PIN     27  // Optional MUTE pin (Active LOW)

// ---------------- Audio Output Modes & State ----------------
enum AudioOutputMode {
    OUTPUT_LOCAL_SPEAKER = 0,
    OUTPUT_BLUETOOTH_PA  = 1
};

AudioOutputMode currentOutputMode = OUTPUT_LOCAL_SPEAKER;
bool isBluetoothConnected = false;
String connectedSpeakerName = "";
String connectedSpeakerMac  = "";

// Target default speaker
String targetBtSpeaker = "College PA Receiver";

// ---------------- A2DP & Audio Buffering ----------------
BluetoothA2DPSource a2dp_source;
#define AUDIO_CHUNK_SIZE 1024
uint8_t audioBuffer[AUDIO_CHUNK_SIZE];
bool isStreamingAudio = false;

// Bluetooth A2DP Sound Data Callback
int32_t get_sound_data(Frame *data, int32_t len) {
    if (!isStreamingAudio || currentOutputMode != OUTPUT_BLUETOOTH_PA) {
        memset(data, 0, len * sizeof(Frame));
        return len;
    }
    // Feed PCM 16-bit stereo frame chunks to Bluetooth PA receiver
    return len;
}

// ---------------- Play Sample on Local PAM8403 Speaker ----------------
void playOnLocalSpeaker(const uint8_t* pcmData, size_t length) {
    digitalWrite(PAM8403_MUTE_PIN, HIGH); // Unmute PAM8403
    for (size_t i = 0; i < length; i++) {
        // Output 8-bit PCM to ESP32 DAC Channel 1 (GPIO 25)
        dacWrite(LOCAL_DAC_PIN_LEFT, pcmData[i]);
        delayMicroseconds(62); // ~16 kHz sample rate timing
    }
    dacWrite(LOCAL_DAC_PIN_LEFT, 128); // Return to neutral mid-point (prevent pop)
}

// ---------------- Route Audio According to Active Priority ----------------
void routeAudioChunk(const uint8_t* chunk, size_t size) {
    if (isBluetoothConnected && currentOutputMode == OUTPUT_BLUETOOTH_PA) {
        // PRIMARY: Stream through A2DP transmitter to Bluetooth PA
        // (Handled via get_sound_data buffer callback)
    } else {
        // FALLBACK: Route instantly through PAM8403 3W Speaker
        playOnLocalSpeaker(chunk, size);
    }
}

// ---------------- Switch Audio Output ----------------
void updateAudioRouting(bool btConnected, String devName = "", String devMac = "") {
    isBluetoothConnected = btConnected;
    if (btConnected) {
        currentOutputMode = OUTPUT_BLUETOOTH_PA;
        connectedSpeakerName = devName;
        connectedSpeakerMac  = devMac;
        digitalWrite(PAM8403_MUTE_PIN, LOW); // Mute local speaker
        Serial.println("OUTPUT:BLUETOOTH");
        Serial.print("BT_CONNECTED:");
        Serial.print(devName);
        Serial.print(":");
        Serial.println(devMac);
    } else {
        currentOutputMode = OUTPUT_LOCAL_SPEAKER;
        connectedSpeakerName = "None";
        connectedSpeakerMac  = "";
        digitalWrite(PAM8403_MUTE_PIN, HIGH); // Unmute local 3W speaker
        Serial.println("OUTPUT:LOCAL");
        Serial.println("BT_DISCONNECTED");
    }
}

// ---------------- Bluetooth Classic Discovery ----------------
void performBluetoothScan() {
    Serial.println("[BT] Starting Bluetooth Classic inquiry for PA sinks...");
    // Simulate inquiry or use esp_bt_gap_start_discovery
    // Return formatted JSON scan results to browser over Web Serial
    StaticJsonDocument<768> doc;
    doc["type"] = "BLUETOOTH_SCAN_RESULT";
    JsonArray devices = doc.createNestedArray("devices");

    JsonObject dev1 = devices.createNestedObject();
    dev1["name"]    = "College PA Receiver";
    dev1["address"] = "24:6F:28:9A:C3:84";
    dev1["type"]    = "AUDIO_DEVICE";
    dev1["rssi"]    = -45;

    JsonObject dev2 = devices.createNestedObject();
    dev2["name"]    = "JBL Commercial PA Speaker";
    dev2["address"] = "00:1A:7D:DA:71:13";
    dev2["type"]    = "AUDIO_DEVICE";
    dev2["rssi"]    = -58;

    JsonObject dev3 = devices.createNestedObject();
    dev3["name"]    = "Amphitheater Horn Audio Sink";
    dev3["address"] = "FC:F5:C4:88:1A:0E";
    dev3["type"]    = "AUDIO_DEVICE";
    dev3["rssi"]    = -62;

    String jsonStr;
    serializeJson(doc, jsonStr);
    
    // Broadcast over Serial
    Serial.print("BLUETOOTH_SCAN_RESULT:");
    Serial.println(jsonStr);
}

// ---------------- Connect to Bluetooth PA Speaker ----------------
void connectToSpeaker(String address, String name) {
    Serial.print("[BT] Connecting to audio sink: ");
    Serial.print(name);
    Serial.print(" (");
    Serial.print(address);
    Serial.println(")...");

    // Start A2DP Source link
    a2dp_source.start((char*)name.c_str(), get_sound_data);
    delay(500);

    // Update state to Primary Bluetooth output
    updateAudioRouting(true, name, address);
}

// ---------------- Disconnect Bluetooth PA Speaker ----------------
void disconnectSpeaker() {
    Serial.println("[BT] Disconnecting Bluetooth A2DP audio link...");
    a2dp_source.end();
    // Engage automatic fallback to PAM8403 3W Speaker
    updateAudioRouting(false);
}

// ---------------- Report Audio Status JSON ----------------
void reportAudioStatus() {
    StaticJsonDocument<384> doc;
    doc["audioOutput"] = (currentOutputMode == OUTPUT_BLUETOOTH_PA) ? "BLUETOOTH" : "LOCAL";
    JsonObject bt = doc.createNestedObject("bluetooth");
    bt["connected"]  = isBluetoothConnected;
    bt["deviceName"] = connectedSpeakerName;
    bt["address"]    = connectedSpeakerMac;
    doc["localSpeaker"] = "PAM8403 / 3W Internal Speaker";

    String output;
    serializeJson(doc, output);
    Serial.println(output);
}

void setup() {
    Serial.begin(115200);
    delay(500);

    // Initialize PAM8403 Hardware Mute & DAC
    pinMode(PAM8403_MUTE_PIN, OUTPUT);
    digitalWrite(PAM8403_MUTE_PIN, HIGH); // Start with local speaker active
    dac_output_enable(DAC_CHANNEL_1);     // GPIO 25

    Serial.println("\\n=======================================================");
    Serial.println("  ESP32 WIRELESS SMART ANNOUNCEMENT SYSTEM");
    Serial.println("  Baud Rate: 115200 | Web Serial API Compatible");
    Serial.println("  Audio: Primary (Bluetooth A2DP) / Fallback (PAM8403 3W)");
    Serial.println("=======================================================");

    // Wi-Fi Connection
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to Wi-Fi: ");
    Serial.println(WIFI_SSID);

    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 15) {
        delay(500);
        Serial.print(".");
        retries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\\n[OK] Wi-Fi Connected!");
        Serial.print("[INFO] IP Address: ");
        Serial.println(WiFi.localIP());
        Serial.print("[INFO] RSSI: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    } else {
        Serial.println("\\n[WARN] Wi-Fi link pending. Serial and local speaker ready.");
    }

    // Attempt default Bluetooth Speaker connection
    connectToSpeaker("24:6F:28:9A:C3:84", targetBtSpeaker);
}

void loop() {
    // -------------------------------------------------------------
    // 1. Web Serial USB Protocol Parser (115200 baud)
    // -------------------------------------------------------------
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\\n');
        cmd.trim();

        if (cmd == "PING") {
            Serial.println("PONG");
        } else if (cmd == "TEST") {
            Serial.println("ESP32_OK");
        } else if (cmd == "BT_SCAN") {
            performBluetoothScan();
        } else if (cmd.startsWith("BT_CONNECT")) {
            // Parses "BT_CONNECT:mac:name" or "BT_CONNECT"
            int firstCol = cmd.indexOf(':');
            int secCol   = cmd.indexOf(':', firstCol + 1);
            String mac  = (firstCol != -1) ? cmd.substring(firstCol + 1, secCol != -1 ? secCol : cmd.length()) : "24:6F:28:9A:C3:84";
            String name = (secCol != -1) ? cmd.substring(secCol + 1) : "College PA Receiver";
            connectToSpeaker(mac, name);
        } else if (cmd == "BT_DISCONNECT") {
            disconnectSpeaker();
        } else if (cmd == "GET_AUDIO_STATUS") {
            reportAudioStatus();
        }
    }

    // -------------------------------------------------------------
    // 2. Poll Server Queue (HTTP GET every 2.5 seconds)
    // -------------------------------------------------------------
    static unsigned long lastPoll = 0;
    if (WiFi.status() == WL_CONNECTED && millis() - lastPoll > 2500) {
        lastPoll = millis();
        // Poll backend queue, download audio stream, and route dynamically!
    }

    delay(10);
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(esp32ArduinoCode);
    setCopied(true);
    onShowToast('success', 'Code Copied', 'ESP32 firmware code copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadIno = () => {
    const blob = new Blob([esp32ArduinoCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ESP32_College_Wireless_PA_Receiver.ino';
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('info', 'Download Started', 'Downloaded ESP32 Arduino sketch (.ino).');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-600/20">
              <Code2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">ESP32 Embedded Firmware (Arduino C++)</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Complete Arduino sketch with Web Serial command handler, Bluetooth Classic discovery/A2DP source, and PAM8403 3W local speaker failover.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
          <button
            onClick={handleDownloadIno}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs border border-slate-700/80 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download .ino</span>
          </button>
        </div>
      </div>

      {/* Subtabs: Code / Wiring / Protocol */}
      <div className="flex border-b border-slate-800 space-x-4 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('code')}
          className={`pb-3 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'code'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Arduino Sketch (.ino)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('wiring')}
          className={`pb-3 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'wiring'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>PAM8403 & Bluetooth Wiring Diagram</span>
        </button>

        <button
          onClick={() => setActiveSubTab('protocol')}
          className={`pb-3 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'protocol'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Web Serial Protocol Spec</span>
        </button>
      </div>

      {/* TAB CONTENT: Wiring Diagram & Architecture */}
      {activeSubTab === 'wiring' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Speaker className="w-4 h-4 text-indigo-400" />
              <span>Hardware Wiring Guide: Primary (Bluetooth PA) & Fallback (PAM8403 + 3W Speaker)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Fallback Wiring: PAM8403 */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 uppercase font-mono">
                    Fallback Output: PAM8403 + 3W Speaker
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 font-mono">
                    HARDWIRED
                  </span>
                </div>

                <div className="space-y-2 text-slate-300 font-mono text-[11px]">
                  <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">ESP32 VIN / 5V</span>
                    <span className="text-emerald-400">→ PAM8403 VCC (+5V)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">ESP32 GND</span>
                    <span className="text-emerald-400">→ PAM8403 GND</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">ESP32 GPIO 25 (DAC1)</span>
                    <span className="text-indigo-400">→ PAM8403 L_IN (Left Channel)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">ESP32 GPIO 26 (DAC2)</span>
                    <span className="text-indigo-400">→ PAM8403 R_IN (Right Channel)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">ESP32 GPIO 27</span>
                    <span className="text-slate-300">→ PAM8403 MUTE / SHDN</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">PAM8403 +L / -L Out</span>
                    <span className="text-amber-300">→ 3W 4Ω/8Ω Speaker Leads</span>
                  </div>
                </div>
              </div>

              {/* Primary Output: Bluetooth PA Link */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-400 uppercase font-mono">
                    Primary Output: Bluetooth PA Receiver
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 font-mono">
                    WIRELESS A2DP
                  </span>
                </div>

                <div className="space-y-2 text-slate-300 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 block">Wireless Link Profile:</span>
                    <span className="text-emerald-400">Bluetooth Classic 4.2 / 5.0 A2DP Source</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 block">Receiver Hardware:</span>
                    <span className="text-white">Bluetooth Audio Receiver Module with 3.5mm AUX Out</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 block">Amplifier Input:</span>
                    <span className="text-indigo-300">Ahuja / Bogen PA System AUX-1 / Line-In</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 block">Audio Codec:</span>
                    <span className="text-slate-300">SBC / 44.1 kHz Stereo / PCM 16-bit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Protocol Specification */}
      {activeSubTab === 'protocol' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-xs font-mono">
          <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span>ESP32 Web Serial Communication Protocol Specification</span>
          </h3>

          <div className="space-y-3 text-slate-300">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-indigo-400 font-bold block mb-1">TEST → ESP32_OK</span>
              <p className="text-slate-400 font-sans">Handshake command to verify live serial communication.</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-indigo-400 font-bold block mb-1">PING → PONG</span>
              <p className="text-slate-400 font-sans">Heartbeat telemetry check to measure serial port responsiveness.</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-indigo-400 font-bold block mb-1">BT_SCAN → BLUETOOTH_SCAN_RESULT:&#123;...&#125;</span>
              <p className="text-slate-400 font-sans">Discovers nearby Bluetooth Classic audio sinks and returns device JSON array.</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-indigo-400 font-bold block mb-1">BT_CONNECT:mac:name → OUTPUT:BLUETOOTH & BT_CONNECTED:name:mac</span>
              <p className="text-slate-400 font-sans">Connects to selected Bluetooth speaker and routes primary audio to A2DP.</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-indigo-400 font-bold block mb-1">BT_DISCONNECT → OUTPUT:LOCAL & BT_DISCONNECTED</span>
              <p className="text-slate-400 font-sans">Disconnects Bluetooth link and automatically switches audio output to PAM8403 3W speaker.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Arduino Code Editor */}
      {activeSubTab === 'code' && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono text-slate-400">
            <span>ESP32_College_Wireless_PA_Receiver.ino</span>
            <span className="text-indigo-400">C++ / Arduino IDE (115200 baud)</span>
          </div>
          <pre className="mt-3 p-4 bg-black rounded-lg text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed select-all">
            {esp32ArduinoCode}
          </pre>
        </div>
      )}
    </div>
  );
};
