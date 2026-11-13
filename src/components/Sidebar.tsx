import React from 'react';
import {
  Layers,
  Radio,
  Calendar,
  Cpu,
  Activity,
  History,
  Terminal,
  Code2,
  Sparkles,
  Server,
  Wifi,
  X
} from 'lucide-react';
import { ESP32Device } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  esp32: ESP32Device;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  esp32,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'composer', label: 'Announcements', icon: Radio },
    { id: 'schedule', label: 'Schedule & Queue', icon: Calendar },
    { id: 'devices', label: 'ESP32 Device', icon: Cpu },
    { id: 'wireless', label: 'Wireless Analysis', icon: Activity },
    { id: 'history', label: 'History', icon: History },
    { id: 'logs', label: 'System Logs', icon: Terminal },
    { id: 'firmware', label: 'ESP32 Firmware', icon: Code2 }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white leading-none">
                Wireless TTS
              </h1>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                PA Transmission
              </p>
            </div>
          </div>

          {/* Close Mobile Button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Tab Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Navigation
          </div>
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`sidebar-nav-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]" />}
              </button>
            );
          })}
        </nav>

        {/* Project Tagline Card */}
        <div className="p-3.5 mx-3 mb-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-1">
            System Concept
          </span>
          <p className="text-xs font-serif italic text-indigo-300 leading-snug">
            "Create. Schedule. Transmit. Announce."
          </p>
          <span className="text-[10px] text-slate-500 block mt-1.5">
            Wi-Fi & Bluetooth Audio PA
          </span>
        </div>

        {/* Live System Pulse Telemetry Footer */}
        <div className="p-3.5 mx-3 mb-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono uppercase tracking-wider">
            <span>System Pulse</span>
            <span className="text-indigo-400">2.4 GHz</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-slate-300">Server</span>
            </div>
            <span className="text-emerald-400 font-semibold">Online</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                esp32.status === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                esp32.status === 'STREAMING' ? 'bg-indigo-400 animate-ping' : 'bg-amber-400'
              }`} />
              <span className="text-slate-300">ESP32</span>
            </div>
            <span className={esp32.status === 'ONLINE' ? 'text-emerald-400 font-semibold' : 'text-indigo-300 font-semibold'}>
              {esp32.status}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
