import React, { useState, useEffect, useRef } from 'react';
import {
  Usb,
  CheckCircle2,
  AlertCircle,
  Play,
  Activity,
  Send,
  Trash2,
  RefreshCw,
  Power,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Terminal,
  Clock,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import {
  WebSerialService,
  ConnectionStatus,
  ConsoleMessage,
  getSharedWebSerialService
} from '../services/webSerialService';

interface Esp32UsbConnectionProps {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const Esp32UsbConnection: React.FC<Esp32UsbConnectionProps> = ({ onShowToast }) => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [deviceInfo, setDeviceInfo] = useState<string>('No device selected');
  const [baudRate] = useState<number>(115200);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Protocol state indicators
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [pingSuccessMessage, setPingSuccessMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [customCommand, setCustomCommand] = useState<string>('');
  const [showFirmwareHelper, setShowFirmwareHelper] = useState<boolean>(false);

  const serialServiceRef = useRef<WebSerialService | null>(null);
  const consoleBottomRef = useRef<HTMLDivElement | null>(null);
  const pingTimestampRef = useRef<number>(0);
  const testTimeoutRef = useRef<any>(null);
  const pingTimeoutRef = useRef<any>(null);

  // Initialize service
  useEffect(() => {
    const supported = WebSerialService.isSupported();
    setIsSupported(supported);

    const service = getSharedWebSerialService();
    serialServiceRef.current = service;
    setStatus(service.getStatus());
    setDeviceInfo(service.getDeviceInfo());

    const unsubStatus = service.addStatusListener((newStatus, info) => {
      setStatus(newStatus);
      if (info) setDeviceInfo(info);
      if (newStatus === 'DISCONNECTED') {
        setTestSuccessMessage(null);
        setPingSuccessMessage(null);
      }
    });

    const unsubMsg = service.addMessageListener((msg) => {
      setConsoleLogs((prev) => [...prev.slice(-150), msg]);
    });

    const unsubLine = service.addLineListener((line) => {
      // Check for exact protocol matches
      if (line === 'ESP32_OK' || line.includes('ESP32_OK')) {
        if (testTimeoutRef.current) clearTimeout(testTimeoutRef.current);
        setIsTesting(false);
        setTestSuccessMessage('ESP32 Connected Successfully');
        if (onShowToast) {
          onShowToast('success', 'ESP32 Verified', 'Received "ESP32_OK" - ESP32 Connected Successfully');
        }
      }

      if (line === 'PONG' || line.includes('PONG')) {
        if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
        setIsPinging(false);
        const rtt = pingTimestampRef.current ? Date.now() - pingTimestampRef.current : null;
        const pingMsg = rtt ? `PONG received (${rtt} ms RTT)` : 'PONG received';
        setPingSuccessMessage(pingMsg);
        if (onShowToast) {
          onShowToast('success', 'Ping Succeeded', pingMsg);
        }
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
      unsubLine();
    };
  }, [onShowToast]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const handleConnect = async () => {
    setErrorMessage(null);
    setTestSuccessMessage(null);
    setPingSuccessMessage(null);

    if (!serialServiceRef.current) return;
    const ok = await serialServiceRef.current.connect(baudRate);
    if (ok && onShowToast) {
      onShowToast('info', 'Serial Port Opened', `Connected at ${baudRate} baud. Ready for test.`);
    }
  };

  const handleDisconnect = async () => {
    if (!serialServiceRef.current) return;
    await serialServiceRef.current.disconnect();
    setTestSuccessMessage(null);
    setPingSuccessMessage(null);
    setErrorMessage(null);
    if (onShowToast) {
      onShowToast('info', 'USB Disconnected', 'Serial port closed.');
    }
  };

  const handleTestConnection = async () => {
    if (status !== 'CONNECTED' || !serialServiceRef.current) {
      setErrorMessage('Please connect ESP32 before testing.');
      return;
    }

    setErrorMessage(null);
    setIsTesting(true);
    setTestSuccessMessage(null);

    const sent = await serialServiceRef.current.send('TEST\n');
    if (!sent) {
      setIsTesting(false);
      return;
    }

    // Set 4s timeout if ESP32 doesn't respond
    if (testTimeoutRef.current) clearTimeout(testTimeoutRef.current);
    testTimeoutRef.current = setTimeout(() => {
      setIsTesting(false);
      setErrorMessage('No response to "TEST\\n" within 4 seconds. Verify ESP32 serial baud rate is 115200 and firmware contains test handler.');
      if (onShowToast) {
        onShowToast('error', 'Test Timeout', 'ESP32 did not respond with ESP32_OK.');
      }
    }, 4000);
  };

  const handlePingTest = async () => {
    if (status !== 'CONNECTED' || !serialServiceRef.current) {
      setErrorMessage('Please connect ESP32 before testing.');
      return;
    }

    setErrorMessage(null);
    setIsPinging(true);
    setPingSuccessMessage(null);
    pingTimestampRef.current = Date.now();

    const sent = await serialServiceRef.current.send('PING\n');
    if (!sent) {
      setIsPinging(false);
      return;
    }

    // Set 4s timeout if ESP32 doesn't respond
    if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
    pingTimeoutRef.current = setTimeout(() => {
      setIsPinging(false);
      setErrorMessage('No response to "PING\\n" within 4 seconds.');
      if (onShowToast) {
        onShowToast('error', 'Ping Timeout', 'ESP32 did not respond with PONG.');
      }
    }, 4000);
  };

  const handleSendCustom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customCommand.trim() || status !== 'CONNECTED' || !serialServiceRef.current) return;

    await serialServiceRef.current.send(customCommand.trim() + '\n');
    setCustomCommand('');
  };

  const handleClearConsole = () => {
    setConsoleLogs([]);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-600/20">
            <Usb className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>ESP32 USB Connection</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                Web Serial API
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct physical browser-to-ESP32 serial communication over USB (115200 baud). No server proxy required.
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2">
          {status === 'CONNECTED' ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Power className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={!isSupported || status === 'CONNECTING'}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {status === 'CONNECTING' ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Selecting Port...</span>
                </>
              ) : (
                <>
                  <Usb className="w-4 h-4" />
                  <span>Connect ESP32</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Browser Support Warning if not supported */}
      {!isSupported && (
        <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold block text-amber-300">Web Serial API Not Supported in this Browser</strong>
            <p className="text-amber-200/90 leading-relaxed">
              Your current browser does not have the W3C Web Serial API enabled. To connect your ESP32 directly via USB, please open this app in <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, <strong>Opera</strong>, or <strong>Brave</strong> over HTTPS or localhost.
            </p>
          </div>
        </div>
      )}

      {/* Connection Parameters & Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Connection Status */}
        <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Connection Status</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'CONNECTED'
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                  : status === 'CONNECTING'
                  ? 'bg-amber-400 animate-ping'
                  : status === 'ERROR'
                  ? 'bg-red-500'
                  : 'bg-slate-600'
              }`}
            />
            <span
              className={`text-xs font-mono font-bold ${
                status === 'CONNECTED'
                  ? 'text-emerald-400'
                  : status === 'ERROR'
                  ? 'text-red-400'
                  : 'text-slate-200'
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        {/* 2. Connected Device Status */}
        <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Connected Device</span>
          <span className="text-xs font-bold text-white truncate block mt-0.5" title={deviceInfo}>
            {status === 'CONNECTED' ? deviceInfo : 'Not connected'}
          </span>
        </div>

        {/* 3. Connection Type */}
        <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Connection Type</span>
          <span className="text-xs font-mono font-bold text-indigo-400 block mt-0.5">
            USB Serial
          </span>
        </div>

        {/* 4. Baud Rate */}
        <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Baud Rate</span>
          <span className="text-xs font-mono font-bold text-emerald-400 block mt-0.5">
            {baudRate} bps
          </span>
        </div>
      </div>

      {/* Prominent Success / Error Notifications */}
      {testSuccessMessage && (
        <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 flex items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-sm font-bold text-white">{testSuccessMessage}</strong>
              <p className="text-xs text-emerald-300/90 mt-0.5">
                ESP32 successfully received "TEST" and verified handshake with "ESP32_OK".
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 shrink-0">
            HANDSHAKE OK
          </span>
        </div>
      )}

      {pingSuccessMessage && (
        <div className="p-3.5 rounded-lg bg-indigo-950/60 border border-indigo-800/80 text-indigo-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold">{pingSuccessMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-indigo-300">ESP32 ALIVE</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <strong className="font-semibold text-red-300 block">Serial Communication Notice</strong>
            <p className="text-red-200/90 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Interactive Command Bar: TEST and PING Buttons */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Serial Protocol Test Controls
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Test Connection Button */}
          <button
            onClick={handleTestConnection}
            disabled={status !== 'CONNECTED' || isTesting}
            className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800/80 disabled:opacity-50 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all cursor-pointer text-left group"
          >
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Test Connection</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sends <code className="text-indigo-400 bg-slate-900 px-1 py-0.2 rounded font-mono">TEST\n</code> & expects <code className="text-emerald-400 bg-slate-900 px-1 py-0.2 rounded font-mono">ESP32_OK</code>
              </p>
            </div>
            {isTesting ? (
              <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin shrink-0" />
            ) : (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                SEND TEST
              </span>
            )}
          </button>

          {/* PING Test Button */}
          <button
            onClick={handlePingTest}
            disabled={status !== 'CONNECTED' || isPinging}
            className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800/80 disabled:opacity-50 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all cursor-pointer text-left group"
          >
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>PING Test</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sends <code className="text-indigo-400 bg-slate-900 px-1 py-0.2 rounded font-mono">PING\n</code> & expects <code className="text-emerald-400 bg-slate-900 px-1 py-0.2 rounded font-mono">PONG</code>
              </p>
            </div>
            {isPinging ? (
              <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin shrink-0" />
            ) : (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                SEND PING
              </span>
            )}
          </button>
        </div>

        {/* Custom Serial Command Input */}
        <form onSubmit={handleSendCustom} className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder={status === 'CONNECTED' ? 'Type custom command (e.g. GET STATUS, REBOOT)...' : 'Connect ESP32 to send commands...'}
            value={customCommand}
            disabled={status !== 'CONNECTED'}
            onChange={(e) => setCustomCommand(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 disabled:opacity-50 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 font-mono outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={status !== 'CONNECTED' || !customCommand.trim()}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Serial Debug Console */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Serial Monitor (TX / RX Stream)</span>
          </span>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono">
              {consoleLogs.length} messages
            </span>
            <button
              onClick={handleClearConsole}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="bg-black border border-slate-800 rounded-lg p-3 font-mono text-[11px] h-44 overflow-y-auto space-y-1 select-text">
          {consoleLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600 italic">
              No serial communication yet. Click "Connect ESP32" or "Test Connection" to begin.
            </div>
          ) : (
            consoleLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-tight">
                <span className="text-slate-600 text-[10px] shrink-0">{log.timestamp}</span>
                <span
                  className={`font-bold px-1 rounded text-[10px] shrink-0 ${
                    log.type === 'TX'
                      ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/50'
                      : log.type === 'RX'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                      : log.type === 'ERR'
                      ? 'bg-red-950 text-red-400 border border-red-800/50'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {log.type}
                </span>
                <span
                  className={`break-all ${
                    log.type === 'TX'
                      ? 'text-indigo-200'
                      : log.type === 'RX'
                      ? 'text-emerald-200 font-bold'
                      : log.type === 'ERR'
                      ? 'text-red-300'
                      : 'text-slate-400'
                  }`}
                >
                  {log.text}
                </span>
              </div>
            ))
          )}
          <div ref={consoleBottomRef} />
        </div>
      </div>

      {/* Expandable ESP32 Firmware Snippet Helper */}
      <div className="pt-2">
        <button
          onClick={() => setShowFirmwareHelper(!showFirmwareHelper)}
          className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>Need the ESP32 code to handle TEST & PING?</span>
          {showFirmwareHelper ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showFirmwareHelper && (
          <div className="mt-2.5 p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <p className="text-slate-300 leading-relaxed">
              Add this serial command handler inside your ESP32 Arduino <code className="text-indigo-400 font-mono">loop()</code> function:
            </p>
            <pre className="p-3 bg-black rounded border border-slate-800/80 font-mono text-[11px] text-emerald-300 overflow-x-auto">
{`void loop() {
    // Read serial commands from Web Serial API
    if (Serial.available()) {
        String command = Serial.readStringUntil('\\n');
        command.trim();

        if (command == "TEST") {
            Serial.println("ESP32_OK");
        } else if (command == "PING") {
            Serial.println("PONG");
        }
    }
    // ... rest of your loop (Wi-Fi polling, audio streaming, etc.)
}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
