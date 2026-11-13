import React, { useState } from 'react';
import {
  Terminal,
  Search,
  Filter,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { SystemLog } from '../types';

interface SystemLogsTabProps {
  logs: SystemLog[];
  onClearLogs: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const SystemLogsTab: React.FC<SystemLogsTabProps> = ({
  logs,
  onClearLogs,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.message.toLowerCase().includes(searchQuery.toLowerCase()) || l.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' || l.level === levelFilter;
    const matchesCategory = categoryFilter === 'ALL' || l.category === categoryFilter;
    return matchesSearch && matchesLevel && matchesCategory;
  });

  const getLevelBadge = (level: SystemLog['level']) => {
    switch (level) {
      case 'SUCCESS':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
      case 'WARN':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/60';
      case 'ERROR':
        return 'bg-red-950/60 text-red-300 border-red-800/60';
      default:
        return 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60';
    }
  };

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_telemetry_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('info', 'Logs Exported', 'Telemetry log stream exported as JSON.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-600/20">
              <Terminal className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">System Telemetry & Event Monitoring</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time diagnostics across Wi-Fi sockets, ESP32 buffers, Bluetooth links, and AI speech synthesis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs border border-slate-700/80 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Logs</span>
          </button>
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 font-semibold text-xs border border-slate-700/80 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search telemetry events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          <option value="ALL">All Severity Levels</option>
          <option value="INFO">INFO</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          <option value="ALL">All Subsystems</option>
          <option value="ESP32">ESP32 Receiver</option>
          <option value="BLUETOOTH">Bluetooth A2DP</option>
          <option value="TTS">Speech Synthesis (TTS)</option>
          <option value="SCHEDULE">Queue & Scheduler</option>
          <option value="RF">EMF & Wireless Propagation</option>
          <option value="AUTH">Authentication</option>
        </select>
      </div>

      {/* Terminal View Log Console */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm font-mono text-xs space-y-2 max-h-[600px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No logs found matching current filters.</div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-start gap-3 transition-colors"
            >
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getLevelBadge(log.level)}`}>
                {log.level}
              </span>
              <span className="text-slate-500 text-[11px] shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-indigo-400 font-bold text-[11px] shrink-0">
                [{log.category}]
              </span>
              <span className="text-slate-300 text-[11px] flex-1 break-words">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
