import React from 'react';
import {
  Radio,
  Wifi,
  Bluetooth,
  Clock,
  Volume2,
  Calendar,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Cpu
} from 'lucide-react';
import { Announcement, ESP32Device, SystemLog, User } from '../types';
import { AudioPlayerWave } from './AudioPlayerWave';

interface DashboardTabProps {
  esp32: ESP32Device;
  announcements: Announcement[];
  logs: SystemLog[];
  currentUser: User | null;
  onNavigateTab: (tab: string) => void;
  onQuickBroadcast: (text: string, tone: string) => void;
  onSendCommand: (cmd: string, val?: any) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  esp32,
  announcements,
  logs,
  currentUser,
  onNavigateTab,
  onQuickBroadcast,
  onSendCommand
}) => {
  const currentPlaying = announcements.find(a => a.status === 'Playing');
  const pendingList = announcements.filter(a => a.status === 'Scheduled' || a.status === 'Waiting');
  const nextScheduled = [...pendingList].sort((a, b) => {
    return new Date(a.scheduledTime || 0).getTime() - new Date(b.scheduledTime || 0).getTime();
  })[0];

  const formatCountdown = (dateStr?: string) => {
    if (!dateStr) return 'Not scheduled';
    const target = new Date(dateStr).getTime();
    const diff = target - Date.now();
    if (diff <= 0) return 'Due now';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `in ${hrs}h ${mins % 60}m`;
    }
    return `in ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Primary Action + System Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span>WIRELESS PA & ANNOUNCEMENT DISPATCHER</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Campus Audio Transmission Console
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Broadcast synthesized natural speech to campus zones over Wi-Fi and Bluetooth PA amplifiers. Schedule automated announcements or dispatch instant campus alerts.
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="dash-create-announcement-btn"
              onClick={() => onNavigateTab('composer')}
              className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Announcement</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Live IoT Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. ESP32 Node Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ESP32 Hardware Node</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-3">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                esp32.status === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                esp32.status === 'STREAMING' ? 'bg-indigo-400 animate-pulse' : 'bg-amber-400'
              }`} />
              <span className="text-lg font-bold text-white">{esp32.status}</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1 truncate">{esp32.name}</p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
            <span>IP: {esp32.ipAddress}</span>
            <span className="text-emerald-400">Buffer: {esp32.bufferLevel}%</span>
          </div>
        </div>

        {/* 2. Wi-Fi 2.4 GHz Signal */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wi-Fi Connection</span>
            <Wifi className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-indigo-400 font-mono">{esp32.rssi}</span>
              <span className="text-xs text-slate-400 font-mono">dBm</span>
            </div>
            <p className="text-xs text-emerald-400 font-medium mt-1">
              {esp32.signalQuality} Signal ({esp32.wifiSsid})
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
            <span>Freq: 2.412 GHz</span>
            <span className="text-indigo-300">Ch: 1</span>
          </div>
        </div>

        {/* 3. Audio Output & Priority Controller */}
        {(() => {
          const isBtConnected = esp32.bluetoothStatus === 'CONNECTED';
          return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AUDIO OUTPUT</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  ACTIVE
                </span>
              </div>

              <div className="my-2.5 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Mode:</span>
                  <span className={`font-bold ${isBtConnected ? 'text-indigo-400' : 'text-amber-400'}`}>
                    {isBtConnected ? 'Bluetooth' : 'Local Speaker'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Device:</span>
                  <span className="text-white font-semibold truncate max-w-[150px]" title={isBtConnected ? (esp32.connectedSpeaker || 'College PA Receiver') : 'PAM8403 + 3W Speaker'}>
                    {isBtConnected ? (esp32.connectedSpeaker || 'College PA Receiver') : 'PAM8403 + 3W Speaker'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-sans">Fallback:</span>
                  <span className="text-slate-400">3W Local Speaker</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-sans">Bluetooth:</span>
                  <span className={isBtConnected ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                    {isBtConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-1.5 text-[10px] font-mono">
                {isBtConnected ? (
                  <>
                    <button
                      onClick={() => {
                        onSendCommand('BT_SCAN');
                        onNavigateTab('devices');
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold transition-colors cursor-pointer"
                    >
                      SCAN
                    </button>
                    <button
                      onClick={() => onNavigateTab('devices')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    >
                      CHANGE SPEAKER
                    </button>
                    <button
                      onClick={() => onSendCommand('BT_DISCONNECT')}
                      className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 font-semibold transition-colors cursor-pointer"
                    >
                      DISCONNECT
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onSendCommand('BT_SCAN');
                      onNavigateTab('devices');
                    }}
                    className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Bluetooth className="w-3.5 h-3.5" />
                    <span>SCAN FOR SPEAKERS</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* 4. Queue / Scheduled Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cloud Audio Queue</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-400 font-mono">{pendingList.length}</span>
              <span className="text-xs text-slate-400">queued in buffer</span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-1">
              Next: {nextScheduled ? nextScheduled.title : 'None pending'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
            <span>{formatCountdown(nextScheduled?.scheduledTime)}</span>
            <button
              onClick={() => onNavigateTab('schedule')}
              className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              View Queue
            </button>
          </div>
        </div>
      </div>

      {/* Main Section: Live Broadcast Monitor & Quick Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Stream Monitor & Next in Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Audio Broadcast Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${currentPlaying ? 'bg-red-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`} />
                <h3 className="text-sm font-semibold text-slate-200">
                  {currentPlaying ? 'Live Audio Transmission to PA Speaker' : 'ESP32 Audio Stream Standby'}
                </h3>
              </div>
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded border ${
                currentPlaying ? 'bg-red-950/60 text-red-400 border-red-800/60' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {currentPlaying ? 'PLAYING' : 'IDLE'}
              </span>
            </div>

            {currentPlaying ? (
              <div className="p-4 bg-slate-950 rounded-lg border-l-2 border-emerald-500 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-emerald-400 tracking-wider">Broadcasting Now</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{currentPlaying.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 italic">"{currentPlaying.text}"</p>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shrink-0">
                    {currentPlaying.tone}
                  </span>
                </div>

                <AudioPlayerWave
                  audioUrl={currentPlaying.audioUrl}
                  duration={currentPlaying.durationSeconds}
                  label="Live Stream to ESP32"
                  autoPlay={true}
                />

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-mono">
                  <span>Target: {currentPlaying.speakerName}</span>
                  <span>By: {currentPlaying.createdBy}</span>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-slate-950 rounded-lg border border-slate-800/80 flex flex-col items-center justify-center text-center py-8">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <Volume2 className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-300">No active audio stream</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  The ESP32 receiver is online and polling the cloud queue for incoming audio payloads.
                </p>
                <button
                  onClick={() => onSendCommand('TEST')}
                  className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-slate-700 transition-colors cursor-pointer"
                >
                  🔊 Play Campus Test Chime
                </button>
              </div>
            )}

            {/* Quick Remote ESP32 Control Buttons */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400">Remote Controls:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSendCommand('TEST')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700/60 cursor-pointer transition-colors"
                >
                  Test Chime
                </button>
                <button
                  onClick={() => onSendCommand('STOP')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-xs font-medium text-slate-200 border border-slate-700/60 cursor-pointer transition-colors"
                >
                  Stop Audio
                </button>
                <button
                  onClick={() => onSendCommand('RECONNECT')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700/60 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reconnect</span>
                </button>
              </div>
            </div>
          </div>

          {/* Next Scheduled Announcement Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Next Scheduled Broadcast</span>
              </h3>
              <button
                onClick={() => onNavigateTab('schedule')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Queue ({pendingList.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {nextScheduled ? (
              <div className="p-4 bg-slate-950 rounded-lg border-l-2 border-indigo-500 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{nextScheduled.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 font-mono">
                      {nextScheduled.tone}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">"{nextScheduled.text}"</p>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                    <span>Target: {nextScheduled.speakerName}</span>
                    <span>•</span>
                    <span className="text-indigo-300 font-medium">
                      Time: {new Date(nextScheduled.scheduledTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-indigo-400 block">
                    {formatCountdown(nextScheduled.scheduledTime)}
                  </span>
                  <button
                    onClick={() => onSendCommand('PLAY')}
                    className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 transition-colors font-medium cursor-pointer"
                  >
                    ▶ Broadcast Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center text-xs text-slate-500">
                No upcoming announcements in queue. Click "Create Announcement" to schedule one.
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Broadcast Presets & Recent Telemetry (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick 1-Click Announcement Presets */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>Instant 1-Click Presets</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Immediately dispatch campus announcements with pre-configured vocal styles.
            </p>

            <div className="space-y-2.5">
              {[
                {
                  label: 'Exam Hall 4 PM Closure',
                  tone: 'Strict',
                  text: 'Attention students, the examination hall will be closed after 4 PM. Please submit your answer booklets.'
                },
                {
                  label: 'Campus Quadrangle Assembly',
                  tone: 'Welcoming',
                  text: 'Faculty and students, please assemble in the central quadrangle for the special felicitation program.'
                },
                {
                  label: 'Laboratory Session Briefing',
                  tone: 'Professional',
                  text: 'Electronics and microwave lab sessions will begin in 10 minutes at Block A Room 204.'
                },
                {
                  label: 'Campus Emergency Siren & Alert',
                  tone: 'Emergency',
                  text: 'Emergency attention. Campus safety drill is currently active. Evacuate through designated fire exit corridors.'
                }
              ].map((preset, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-600/40 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200 truncate">{preset.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono border ${
                        preset.tone === 'Emergency' ? 'bg-red-950/60 text-red-400 border-red-800/40' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {preset.tone}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{preset.text}</p>
                  </div>
                  <button
                    onClick={() => onQuickBroadcast(preset.text, preset.tone)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-medium border border-indigo-600/30 shrink-0 transition-colors cursor-pointer"
                  >
                    Broadcast
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Last Broadcast & Live Telemetry Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Telemetry Event Stream</span>
              </h3>
              <button
                onClick={() => onNavigateTab('logs')}
                className="text-xs text-slate-400 hover:text-indigo-300 cursor-pointer"
              >
                All Logs
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs font-mono">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    log.level === 'SUCCESS' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' :
                    log.level === 'WARN' ? 'bg-amber-400' :
                    log.level === 'ERROR' ? 'bg-red-400' : 'bg-indigo-400'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                      <span className="text-indigo-400 font-bold">[{log.category}]</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed break-words">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
