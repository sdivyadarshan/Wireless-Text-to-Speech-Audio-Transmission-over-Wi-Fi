import React, { useState } from 'react';
import {
  Cpu,
  Wifi,
  Bluetooth,
  RefreshCw,
  Play,
  Pause,
  Square,
  Volume2,
  Activity,
  Sliders,
  Terminal,
  Radio,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';
import { ESP32Device, SystemLog } from '../types';
import { SPEAKER_ZONES } from '../data/presets';
import { Esp32UsbConnection } from './Esp32UsbConnection';
import { BluetoothAudioOutput } from './BluetoothAudioOutput';

interface DeviceManagerTabProps {
  esp32: ESP32Device;
  logs: SystemLog[];
  onSendCommand: (cmd: string, val?: any) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onUpdateEsp32State?: (updater: (prev: ESP32Device) => ESP32Device) => void;
}

export const DeviceManagerTab: React.FC<DeviceManagerTabProps> = ({
  esp32,
  logs,
  onSendCommand,
  onShowToast,
  onUpdateEsp32State
}) => {
  const [selectedSpeaker, setSelectedSpeaker] = useState(esp32.connectedSpeaker);
  const [rssiInput, setRssiInput] = useState(esp32.rssi);
  const [volumeInput, setVolumeInput] = useState(esp32.volume);

  const handleSpeakerChange = (spkName: string) => {
    setSelectedSpeaker(spkName);
    onSendCommand('SET_SPEAKER', spkName);
    onShowToast('success', 'Bluetooth Route Changed', `ESP32 paired with "${spkName}"`);
  };

  const handleVolumeChange = (vol: number) => {
    setVolumeInput(vol);
    onSendCommand('SET_VOLUME', vol);
  };

  const handleRssiChange = (val: number) => {
    setRssiInput(val);
    onSendCommand('SET_RSSI', val);
  };

  const esp32Logs = logs.filter(l => l.category === 'ESP32' || l.category === 'BLUETOOTH');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-600/20">
              <Cpu className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">ESP32 Hardware Node & Bluetooth PA Controller</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Maintain bidirectional remote connection with the embedded ESP32 wireless receiver and manage Bluetooth A2DP amplifier links.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              esp32.status === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
              esp32.status === 'STREAMING' ? 'bg-indigo-400 animate-pulse' : 'bg-amber-400'
            }`} />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">DEVICE STATUS</span>
              <span className="font-mono font-bold text-white">{esp32.status}</span>
            </div>
          </div>

          <button
            onClick={() => onSendCommand('GET STATUS')}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-slate-700/80 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Poll Status</span>
          </button>
        </div>
      </div>

      {/* ESP32 USB Connection (Web Serial API) Section */}
      <Esp32UsbConnection onShowToast={onShowToast} />

      {/* Bluetooth Audio Output & Priority Controller Section */}
      <BluetoothAudioOutput
        esp32={esp32}
        onShowToast={onShowToast}
        onUpdateEsp32State={onUpdateEsp32State}
      />

      {/* Main Hardware Display & Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Device Specifications & Remote Commands (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hardware Specs Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>ESP32 Device Telemetry</span>
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                {esp32.isSimulated ? 'Simulated & Physical Endpoint' : 'Physical Hardware Node'}
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Device Name</span>
                <span className="text-xs font-bold text-slate-100 mt-0.5 block">{esp32.name}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">MAC Address</span>
                <span className="text-xs font-mono font-bold text-indigo-300 mt-0.5 block">{esp32.macAddress}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">IP Address</span>
                <span className="text-xs font-mono font-bold text-slate-100 mt-0.5 block">{esp32.ipAddress}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Wi-Fi Network</span>
                <span className="text-xs font-bold text-indigo-300 mt-0.5 block">{esp32.wifiSsid}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Signal (RSSI)</span>
                <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">{esp32.rssi} dBm</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Bluetooth Link</span>
                <span className="text-xs font-bold text-emerald-300 mt-0.5 block">{esp32.bluetoothStatus}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Firmware</span>
                <span className="text-xs font-mono text-slate-300 mt-0.5 block">{esp32.firmwareVersion}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Audio Buffer</span>
                <span className="text-xs font-mono text-indigo-300 mt-0.5 block">{esp32.bufferLevel}% (64KB DMA)</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Last Polled</span>
                <span className="text-xs font-mono text-slate-300 mt-0.5 block">12s ago</span>
              </div>
            </div>

            {/* Remote Command Bar */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Direct Hardware Remote Commands
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => onSendCommand('TEST')}
                  className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>TEST CHIME</span>
                </button>

                <button
                  onClick={() => onSendCommand('PLAY')}
                  className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-emerald-950/60 text-emerald-300 hover:text-white border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4 fill-emerald-300" />
                  <span>PLAY</span>
                </button>

                <button
                  onClick={() => onSendCommand('PAUSE')}
                  className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-amber-950/60 text-amber-300 hover:text-white border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  <span>PAUSE</span>
                </button>

                <button
                  onClick={() => onSendCommand('STOP')}
                  className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-red-300 hover:text-white border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Square className="w-4 h-4 fill-red-300" />
                  <span>STOP</span>
                </button>

                <button
                  onClick={() => onSendCommand('RECONNECT')}
                  className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>RECONNECT</span>
                </button>

                <button
                  onClick={() => onSendCommand('GET STATUS')}
                  className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  <span>GET STATUS</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bluetooth Speaker Routing & Volume Slider */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Bluetooth className="w-4 h-4 text-emerald-400" />
              <span>Bluetooth PA Speaker Audio Sink Selection</span>
            </h3>

            <div className="space-y-2">
              {SPEAKER_ZONES.map((spk) => {
                const isSelected = selectedSpeaker === spk.name;
                return (
                  <div
                    key={spk.id}
                    onClick={() => handleSpeakerChange(spk.name)}
                    className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-600/40 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span>{spk.name}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 font-mono">
                            CONNECTED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {spk.location} • {spk.auxAmplifierModel}
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-emerald-400">
                      <span>{spk.rssi} dBm</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Volume Control */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ESP32 Hardware DAC Output Volume</span>
                </span>
                <span className="font-mono text-indigo-400">{volumeInput}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volumeInput}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            {/* Wi-Fi RSSI Simulation Slider */}
            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                <span className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Test Signal Attenuation (Wi-Fi RSSI)</span>
                </span>
                <span className="font-mono text-indigo-400">{rssiInput} dBm</span>
              </div>
              <input
                type="range"
                min="-95"
                max="-30"
                value={rssiInput}
                onChange={(e) => handleRssiChange(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Simulate moving the ESP32 receiver further from the campus wireless access point.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: ESP32 Hardware OLED Display Replica & Serial Monitor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* ESP32 Hardware Enclosure & OLED Display Replica */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                <span className="text-xs font-mono font-bold text-slate-300">ESP32-WROOM-32U V2</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Hardware Status LEDs */}
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                  <span className="text-[8px] text-slate-500 font-mono mt-0.5">PWR</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${esp32.status === 'ONLINE' ? 'bg-indigo-400 shadow-[0_0_6px_#818cf8]' : 'bg-slate-700'}`} />
                  <span className="text-[8px] text-slate-500 font-mono mt-0.5">WIFI</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${esp32.bluetoothStatus === 'CONNECTED' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-slate-700'}`} />
                  <span className="text-[8px] text-slate-500 font-mono mt-0.5">BT</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${esp32.status === 'STREAMING' ? 'bg-indigo-400 animate-ping' : 'bg-slate-700'}`} />
                  <span className="text-[8px] text-slate-500 font-mono mt-0.5">AUD</span>
                </div>
              </div>
            </div>

            {/* Realistic 128x64 SSD1306 OLED Graphic Display */}
            <div className="bg-black border border-slate-800 rounded-lg p-4 font-mono text-indigo-300 shadow-[inset_0_0_20px_rgba(99,102,241,0.15)]">
              <div className="flex justify-between border-b border-indigo-900/40 pb-1 text-[10px]">
                <span>WIFI: OK {esp32.rssi}dBm</span>
                <span>VOL: {esp32.volume}%</span>
              </div>
              <div className="py-2.5 text-center">
                <p className="text-[10px] text-indigo-200 uppercase tracking-widest">COLLEGE PA RECEIVER</p>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {esp32.status === 'STREAMING' ? '>> BROADCASTING <<' : 'IDLE / READY'}
                </h4>
                <p className="text-[10px] text-indigo-400 mt-1 truncate">
                  BT: {esp32.connectedSpeaker}
                </p>
              </div>
              <div className="pt-1 border-t border-indigo-900/40 flex justify-between text-[9px] text-indigo-400">
                <span>IP: {esp32.ipAddress}</span>
                <span>BUF: {esp32.bufferLevel}%</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono leading-tight bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <p className="text-indigo-400 font-bold mb-1">Embedded Hardware Architecture:</p>
              <p>• MCU: ESP32 Dual-Core Tensilica Xtensa @ 240MHz</p>
              <p>• Protocol: HTTP Stream Chunking over Wi-Fi 802.11 b/g/n</p>
              <p>• Audio Sink: Bluetooth Classic A2DP Source (SBC codec)</p>
              <p>• Output: Ahuja / Bogen PA Amplifier via BT AUX Dongle</p>
            </div>
          </div>

          {/* Serial Terminal Monitor */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>ESP32 Live UART Serial Output (115200 baud)</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">COM3 / ttyUSB0</span>
            </div>

            <div className="bg-black/90 rounded-lg p-3 font-mono text-[11px] text-slate-300 space-y-1 max-h-60 overflow-y-auto border border-slate-800 leading-relaxed">
              <p className="text-slate-500">[00:00:01] Booting ESP32 Node firmware v2.4.1...</p>
              <p className="text-emerald-400">[00:00:02] Wi-Fi Connected to SSID "CAMPUS_IOT_WIFI_2.4G"</p>
              <p className="text-indigo-400">[00:00:03] IP Assigned: {esp32.ipAddress}, RSSI: {esp32.rssi} dBm</p>
              <p className="text-emerald-400">[00:00:04] Bluetooth A2DP Sink paired: "{esp32.connectedSpeaker}"</p>
              <p className="text-indigo-300">[00:00:05] Server Polling Daemon active. Waiting for audio queue...</p>
              {esp32Logs.slice(0, 6).map((log, i) => (
                <p key={i} className={log.level === 'SUCCESS' ? 'text-emerald-300' : 'text-slate-300'}>
                  [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
