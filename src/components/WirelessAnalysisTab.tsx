import React, { useState } from 'react';
import {
  Activity,
  Radio,
  Wifi,
  Download,
  Plus,
  Zap,
  TrendingDown,
  Layers,
  HelpCircle,
  Clock,
  Compass,
  CheckCircle2
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { EMFMeasurement, ESP32Device } from '../types';

interface WirelessAnalysisTabProps {
  esp32: ESP32Device;
  measurements: EMFMeasurement[];
  onAddMeasurement: (data: Partial<EMFMeasurement>) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const WirelessAnalysisTab: React.FC<WirelessAnalysisTabProps> = ({
  esp32,
  measurements,
  onAddMeasurement,
  onShowToast
}) => {
  const [distanceInput, setDistanceInput] = useState<number>(15);
  const [environmentInput, setEnvironmentInput] = useState<EMFMeasurement['environment']>('Indoor Hallway');
  const [pathLossExponent, setPathLossExponent] = useState<number>(2.8);
  const [notesInput, setNotesInput] = useState<string>('');
  const [isProbing, setIsProbing] = useState<boolean>(false);

  // Constants for 2.4 GHz Wi-Fi
  const frequencyGhz = 2.412; // Channel 1
  const c = 3e8; // Speed of light m/s
  const wavelengthCm = ((c / (frequencyGhz * 1e9)) * 100).toFixed(2); // ~12.44 cm

  // Calculate Theoretical Free Space Path Loss (FSPL) + Log Distance Model
  const calculateTheoreticalRssi = (d: number, n: number = 2.0) => {
    if (d <= 0.5) return -30;
    const pTx = 20; // 20 dBm (100mW) ESP32 standard transmit power
    const gTx = 2; // 2 dBi antenna
    const gRx = 2; // 2 dBi receiver antenna
    const pl1m = 20 * Math.log10(1) + 20 * Math.log10(frequencyGhz * 1e9) + 20 * Math.log10((4 * Math.PI) / c) - gTx - gRx;
    const pl_d = pl1m + 10 * n * Math.log10(d);
    return Number((pTx - pl_d).toFixed(1));
  };

  const currentTheoreticalRssi = calculateTheoreticalRssi(distanceInput, pathLossExponent);

  const chartData = measurements
    .map(m => ({
      distance: m.distanceMeters,
      measuredRssi: m.measuredRssi,
      theoreticalRssi: m.theoreticalRssi,
      latency: m.latencyMs,
      packetLoss: m.packetLossPercent,
      environment: m.environment
    }))
    .sort((a, b) => a.distance - b.distance);

  const handleRecordExperiment = () => {
    setIsProbing(true);
    setTimeout(() => {
      const noise = (Math.random() - 0.5) * 6;
      const measured = Number((currentTheoreticalRssi + noise).toFixed(1));
      const simulatedLatency = Math.round(12 + Math.pow(distanceInput, 1.1) * 1.2 + (Math.random() * 8));
      const simulatedPacketLoss = Number(Math.max(0, (distanceInput > 30 ? (distanceInput - 30) * 0.2 : 0)).toFixed(1));

      onAddMeasurement({
        distanceMeters: distanceInput,
        measuredRssi: measured,
        theoreticalRssi: currentTheoreticalRssi,
        latencyMs: simulatedLatency,
        packetLossPercent: simulatedPacketLoss,
        environment: environmentInput,
        notes: notesInput || `Probe at ${distanceInput}m in ${environmentInput}`
      });

      setIsProbing(false);
      setNotesInput('');
      onShowToast('success', 'Experiment Recorded', `Logged point: ${distanceInput}m -> ${measured} dBm (${simulatedLatency}ms RTT)`);
    }, 500);
  };

  const handleExportCsv = () => {
    const headers = 'ID,Timestamp,Distance (m),Measured RSSI (dBm),Theoretical RSSI (dBm),Latency (ms),Packet Loss (%),Environment,Notes\n';
    const rows = measurements
      .map(m => `${m.id},"${m.timestamp}",${m.distanceMeters},${m.measuredRssi},${m.theoreticalRssi},${m.latencyMs},${m.packetLossPercent},"${m.environment}","${m.notes || ''}"`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EMF_Waves_ESP32_Propagation_Lab_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('info', 'Data Exported', 'Downloaded EMF lab experiment data as CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Top Academic Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-600/20">
                <Radio className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                EMF & Wireless Waves Propagation Laboratory
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Academic experimental demonstration of 2.4 GHz electromagnetic wave propagation, Free Space Path Loss (FSPL), Distance vs. RSSI attenuation, and wireless latency across campus architectural spaces.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs border border-slate-700/80 transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Electromagnetic Parameters Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Wi-Fi Carrier Frequency</span>
            <span className="text-sm font-bold text-indigo-400 mt-0.5 block">{frequencyGhz} GHz</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Free-Space Wavelength (λ)</span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{wavelengthCm} cm</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Current ESP32 RSSI</span>
            <span className="text-sm font-bold text-indigo-300 mt-0.5 block">{esp32.rssi} dBm</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Path Loss Model Exponent</span>
            <span className="text-sm font-bold text-amber-400 mt-0.5 block">n = {pathLossExponent}</span>
          </div>
        </div>
      </div>

      {/* Main Charts: Distance vs RSSI & Distance vs Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Distance vs RSSI (Signal Attenuation) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-indigo-400" />
              <span>Distance (m) vs. Received Signal (RSSI in dBm)</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Compares measured laboratory test points against theoretical Log-Distance Path Loss curve at 2.4 GHz.
          </p>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="distance"
                  unit="m"
                  stroke="#64748b"
                  fontSize={11}
                  label={{ value: 'Distance (m)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  unit="dBm"
                  domain={[-95, -30]}
                  stroke="#64748b"
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '12px' }}
                  labelFormatter={(v) => `Distance: ${v} meters`}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="measuredRssi"
                  name="Measured RSSI (dBm)"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#6366f1' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="theoreticalRssi"
                  name="Theoretical FSPL (dBm)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distance vs Latency (Packet Round-Trip Time) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Distance (m) vs. Transmission Latency (ms)</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Demonstrates TCP/IP packet transmission buffer latency degradation with lower wireless signal strength.
          </p>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="distance"
                  unit="m"
                  stroke="#64748b"
                  fontSize={11}
                  label={{ value: 'Distance (m)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  unit="ms"
                  stroke="#64748b"
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '12px' }}
                  labelFormatter={(v) => `Distance: ${v} meters`}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="latency"
                  name="Round-Trip Latency (ms)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Laboratory Experiment Workbench: Record New Test Point */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span>Interactive Experiment Workbench & RF Signal Logger</span>
          </h3>
          <span className="text-xs text-indigo-400 font-mono">Recorded: {measurements.length} points</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Distance Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Distance from Wi-Fi Access Point (m):
            </label>
            <input
              type="number"
              min="1"
              max="150"
              value={distanceInput}
              onChange={(e) => setDistanceInput(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
            />
          </div>

          {/* Environment Model */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Propagation Environment:
            </label>
            <select
              value={environmentInput}
              onChange={(e) => {
                const env = e.target.value as EMFMeasurement['environment'];
                setEnvironmentInput(env);
                if (env === 'Free Space (Line of Sight)') setPathLossExponent(2.0);
                else if (env === 'Indoor Hallway') setPathLossExponent(2.8);
                else if (env === 'Auditorium Partition') setPathLossExponent(3.5);
                else setPathLossExponent(4.2);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="Free Space (Line of Sight)">Free Space (Line of Sight, n=2.0)</option>
              <option value="Indoor Hallway">Indoor Hallway (Corridor, n=2.8)</option>
              <option value="Auditorium Partition">Auditorium Partition (Acoustic Baffles, n=3.5)</option>
              <option value="Reinforced Concrete">Reinforced Concrete (Obstacle, n=4.2)</option>
            </select>
          </div>

          {/* Path Loss Exponent Slider */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Path Loss Exponent (n)</span>
              <span className="font-mono text-indigo-400 font-bold">{pathLossExponent}</span>
            </div>
            <input
              type="range"
              min="1.8"
              max="4.5"
              step="0.1"
              value={pathLossExponent}
              onChange={(e) => setPathLossExponent(Number(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded cursor-pointer mt-2"
            />
          </div>

          {/* Notes / Observation */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Observation / Location Notes:
            </label>
            <input
              type="text"
              placeholder="e.g. Near Auditorium Doorway"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Live Calculation Preview & Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-3 font-mono">
            <span>Theoretical FSPL @ {distanceInput}m: <strong className="text-amber-400">{currentTheoreticalRssi} dBm</strong></span>
            <span>•</span>
            <span>Fresnel Radius: <strong className="text-emerald-400">{(0.5 * Math.sqrt((c * distanceInput) / (frequencyGhz * 1e9))).toFixed(2)} m</strong></span>
          </div>

          <button
            onClick={handleRecordExperiment}
            disabled={isProbing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isProbing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sampling RF Probe...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Record Experiment Test Point</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Experiment Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Recorded Laboratory Measurement Dataset</h3>
          <span className="text-xs text-slate-400 font-mono">{measurements.length} Total Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3 px-4">Distance</th>
                <th className="py-3 px-4">Measured RSSI</th>
                <th className="py-3 px-4">Theoretical FSPL</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {measurements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-white">{m.distanceMeters} m</td>
                  <td className="py-3 px-4 text-indigo-400 font-bold">{m.measuredRssi} dBm</td>
                  <td className="py-3 px-4 text-amber-400">{m.theoreticalRssi} dBm</td>
                  <td className="py-3 px-4 text-emerald-400">{m.latencyMs} ms</td>
                  <td className="py-3 px-4 font-sans text-slate-300">{m.environment}</td>
                  <td className="py-3 px-4 font-sans text-slate-400 italic">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
