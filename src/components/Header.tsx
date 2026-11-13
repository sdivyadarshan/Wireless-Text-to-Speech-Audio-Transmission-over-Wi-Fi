import React from 'react';
import {
  Wifi,
  Bluetooth,
  Radio,
  UserCheck,
  LogOut,
  Sparkles,
  Menu,
  Volume2
} from 'lucide-react';
import { ESP32Device, User } from '../types';

interface HeaderProps {
  activeTab: string;
  esp32: ESP32Device;
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  isStreaming: boolean;
  onToggleMobileMenu?: () => void;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Live IoT Telemetry & Broadcast Overview' },
  composer: { title: 'Announcement Composer', subtitle: 'Natural Speech Generation & TTS Synthesis' },
  schedule: { title: 'Schedule & Cloud Queue', subtitle: 'Automated Broadcast Pipeline & Transmissions' },
  devices: { title: 'ESP32 Device Node', subtitle: 'Embedded Receiver & Bluetooth Sink Manager' },
  wireless: { title: 'Wireless Analysis', subtitle: 'EMF 2.4 GHz Propagation & Path Loss Laboratory' },
  history: { title: 'Broadcast History', subtitle: 'Archive of Dispatched College Announcements' },
  logs: { title: 'System Logs', subtitle: 'Raw Telemetry & Device Communication Stream' },
  firmware: { title: 'ESP32 Firmware', subtitle: 'Production C++ / Arduino A2DP Source Code' }
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  esp32,
  currentUser,
  onOpenLogin,
  onLogout,
  isStreaming,
  onToggleMobileMenu
}) => {
  const currentView = TAB_TITLES[activeTab] || { title: 'Wireless TTS', subtitle: 'Campus Announcement System' };

  // Generate initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'AU';
    const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between bg-slate-900/40 backdrop-blur-md sticky top-0 z-30">
      {/* Left: Mobile Menu Toggle + Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {currentView.title}
            </h2>
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
              Wi-Fi / 2.4 GHz
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden md:block leading-none mt-0.5">
            {currentView.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Live Telemetry Status Pills & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs">
        {/* On-Air Active Broadcast Badge */}
        {isStreaming && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/60 text-red-300 font-medium animate-pulse">
            <Volume2 className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">ON-AIR STREAMING</span>
            <span className="sm:hidden">ON-AIR</span>
          </div>
        )}

        {/* Bluetooth PA Speaker Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <Bluetooth className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">BT:</span>
          <span className="text-emerald-400 font-medium truncate max-w-[120px] lg:max-w-[160px]" title={esp32.connectedSpeaker}>
            {esp32.connectedSpeaker}
          </span>
        </div>

        {/* Wi-Fi RSSI Pill */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400 hidden sm:inline">RSSI:</span>
          <span className="text-indigo-400 font-mono font-medium">{esp32.rssi} dBm</span>
        </div>

        {/* User Profile Pill / Login */}
        {currentUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
              <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-[11px] flex items-center justify-center font-mono">
                {getInitials(currentUser.name)}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-none">{currentUser.name}</p>
                <p className="text-[10px] text-indigo-400 uppercase font-mono mt-0.5">{currentUser.role}</p>
              </div>
            </div>
            <button
              id="logout-btn"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            id="login-btn"
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
};
