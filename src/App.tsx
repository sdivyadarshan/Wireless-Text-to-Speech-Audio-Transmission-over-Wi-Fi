import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardTab } from './components/DashboardTab';
import { ComposerTab } from './components/ComposerTab';
import { ScheduleTab } from './components/ScheduleTab';
import { DeviceManagerTab } from './components/DeviceManagerTab';
import { WirelessAnalysisTab } from './components/WirelessAnalysisTab';
import { HistoryTab } from './components/HistoryTab';
import { SystemLogsTab } from './components/SystemLogsTab';
import { ArduinoCodeTab } from './components/ArduinoCodeTab';
import { LoginModal } from './components/LoginModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Announcement, ESP32Device, SystemLog, EMFMeasurement, User } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // User Authentication State (Default authorized official session)
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'user-default-admin',
    name: 'Dr. S. Ramanathan',
    email: 'admin@college.edu',
    role: 'Administrator',
    department: 'Campus Safety & Wireless Infrastructure'
  });

  // ESP32 Hardware State
  const [esp32, setEsp32] = useState<ESP32Device>({
    id: 'esp32-college-01',
    name: 'College Announcement ESP32',
    ipAddress: '192.168.1.145',
    macAddress: '24:6F:28:9A:C3:84',
    status: 'ONLINE',
    connectionType: 'Wi-Fi',
    wifiSsid: 'CAMPUS_IOT_WIFI_2.4G',
    rssi: -52,
    signalQuality: 'Good',
    bluetoothStatus: 'CONNECTED',
    connectedSpeaker: 'College Auditorium Speaker',
    speakerRssi: -48,
    volume: 85,
    bufferLevel: 94,
    lastSeen: new Date().toISOString(),
    uptimeSeconds: 86400 * 3,
    firmwareVersion: 'v2.4.1-A2DP-PROD',
    audioCodec: 'WAV',
    isSimulated: true
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [emfMeasurements, setEmfMeasurements] = useState<EMFMeasurement[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [prefillAnnouncement, setPrefillAnnouncement] = useState<Partial<Announcement> | null>(null);

  // Toast Dispatcher
  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync with Backend Server
  const fetchAllData = useCallback(async () => {
    try {
      const [statusRes, annRes, logsRes, emfRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/announcements'),
        fetch('/api/logs'),
        fetch('/api/emf/experiments')
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.esp32) setEsp32(statusData.esp32);
      }
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
      if (emfRes.ok) {
        const emfData = await emfRes.json();
        setEmfMeasurements(emfData);
      }
    } catch (err) {
      console.warn('Sync poll check:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 2500);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Quick 1-Click Broadcast from Dashboard
  const handleQuickBroadcast = async (text: string, tone: string) => {
    try {
      const isBt = esp32.bluetoothStatus === 'CONNECTED';
      const outputTarget = isBt
        ? (esp32.connectedSpeaker || 'College PA Receiver')
        : `${esp32.localSpeakerName || 'Local 3W Speaker'} (PAM8403 Fallback)`;

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: text.substring(0, 35) + '...',
          text,
          voice: 'wit-rebecca',
          tone,
          speakerName: outputTarget,
          playImmediately: true,
          createdBy: currentUser?.name || 'Authorized Official',
          creatorRole: currentUser?.role || 'Staff'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch broadcast');

      if (isBt) {
        showToast('success', 'Broadcasting via Bluetooth', `Transmitting audio to "${esp32.connectedSpeaker || 'College PA Receiver'}"`);
      } else {
        showToast('info', 'Broadcasting via Local Speaker', `Bluetooth disconnected - transmitting via Fallback: ${esp32.localSpeakerName || 'Local 3W Speaker (PAM8403)'}`);
      }
      fetchAllData();
    } catch (err: any) {
      showToast('error', 'Broadcast Error', err.message || 'Server communication failed');
    }
  };

  // Dispatch Remote Commands to ESP32
  const handleSendCommand = async (command: string, value?: any) => {
    try {
      const res = await fetch('/api/esp32/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Command execution failed');

      if (data.esp32) setEsp32(data.esp32);
      showToast('info', 'Command Dispatched', data.message || `Executed: ${command}`);
      fetchAllData();
    } catch (err: any) {
      showToast('error', 'ESP32 Error', err.message || 'Failed to send hardware command');
    }
  };

  // Immediate Play of Existing Announcement
  const handlePlayNow = async (id: string) => {
    try {
      const isBt = esp32.bluetoothStatus === 'CONNECTED';
      const res = await fetch(`/api/announcements/${id}/play-now`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger broadcast');

      if (isBt) {
        showToast('success', 'Broadcasting via Bluetooth', `Broadcasting through Bluetooth PA Speaker ("${esp32.connectedSpeaker || 'College PA Receiver'}").`);
      } else {
        showToast('info', 'Broadcasting via Local Speaker', `Bluetooth disconnected. Broadcasting through Fallback: ${esp32.localSpeakerName || 'Local 3W Speaker (PAM8403)'}.`);
      }
      fetchAllData();
    } catch (err: any) {
      showToast('error', 'Playback Error', err.message || 'Server error');
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete announcement');
      showToast('info', 'Deleted', 'Announcement removed from queue.');
      fetchAllData();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message);
    }
  };

  // Edit in Composer
  const handleEditAnnouncement = (ann: Announcement) => {
    setPrefillAnnouncement(ann);
    setActiveTab('composer');
  };

  // Add EMF Measurement Record
  const handleAddMeasurement = async (data: Partial<EMFMeasurement>) => {
    try {
      const res = await fetch('/api/emf/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (res.ok && resData.measurement) {
        setEmfMeasurements(prev => [...prev, resData.measurement]);
      }
    } catch (err) {
      console.error('EMF add measurement error:', err);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs/clear', { method: 'POST' });
      setLogs([]);
      showToast('info', 'Logs Cleared', 'System telemetry events cleared.');
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to clear logs.');
    }
  };

  const isStreaming = esp32.status === 'STREAMING' || announcements.some(a => a.status === 'Playing');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* Sleek Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        esp32={esp32}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Sleek Top Telemetry Bar */}
        <Header
          activeTab={activeTab}
          esp32={esp32}
          currentUser={currentUser}
          onOpenLogin={() => setIsLoginOpen(true)}
          onLogout={() => {
            setCurrentUser(null);
            showToast('info', 'Signed Out', 'You have logged out of the announcement system.');
          }}
          isStreaming={isStreaming}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardTab
              esp32={esp32}
              announcements={announcements}
              logs={logs}
              currentUser={currentUser}
              onNavigateTab={setActiveTab}
              onQuickBroadcast={handleQuickBroadcast}
              onSendCommand={handleSendCommand}
            />
          )}

          {activeTab === 'composer' && (
            <ComposerTab
              esp32={esp32}
              currentUser={currentUser}
              onAnnouncementCreated={(ann, playNow) => {
                fetchAllData();
                if (playNow) {
                  setActiveTab('dashboard');
                } else {
                  setActiveTab('schedule');
                }
              }}
              onShowToast={showToast}
              prefillAnnouncement={prefillAnnouncement}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleTab
              announcements={announcements}
              currentUser={currentUser}
              onPlayNow={handlePlayNow}
              onDelete={handleDeleteAnnouncement}
              onEdit={handleEditAnnouncement}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'devices' && (
            <DeviceManagerTab
              esp32={esp32}
              logs={logs}
              onSendCommand={handleSendCommand}
              onShowToast={showToast}
              onUpdateEsp32State={setEsp32}
            />
          )}

          {activeTab === 'wireless' && (
            <WirelessAnalysisTab
              esp32={esp32}
              measurements={emfMeasurements}
              onAddMeasurement={handleAddMeasurement}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              announcements={announcements}
              currentUser={currentUser}
              onPlayNow={handlePlayNow}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'logs' && (
            <SystemLogsTab
              logs={logs}
              onClearLogs={handleClearLogs}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'firmware' && (
            <ArduinoCodeTab onShowToast={showToast} />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 py-4 px-6 text-center sm:text-left text-xs text-slate-500 font-mono mt-auto bg-slate-900/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <div>
              <span className="text-indigo-400 font-medium">Wireless Text-to-Speech Audio Transmission</span>
              <span className="text-slate-600 mx-2">•</span>
              <span>Wi-Fi & Bluetooth PA System</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              "Create. Schedule. Transmit. Announce."
            </div>
          </div>
        </footer>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(u) => setCurrentUser(u)}
        onShowToast={showToast}
      />

      {/* Toast Notification Stream */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
