import { DiscoveredBluetoothDevice } from '../types';

// Web Serial API service for ESP32 hardware communication
// Works directly in browser without backend dependencies

export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export interface SerialOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

export interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
  forget?(): Promise<void>;
}

export interface ConsoleMessage {
  id: string;
  timestamp: string;
  type: 'TX' | 'RX' | 'SYS' | 'ERR';
  text: string;
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export type LineListener = (line: string) => void;
export type StatusListener = (status: ConnectionStatus, info?: string) => void;
export type MessageListener = (msg: ConsoleMessage) => void;
export type BtScanListener = (devices: DiscoveredBluetoothDevice[]) => void;
export type BtStatusListener = (status: {
  connected: boolean;
  deviceName?: string;
  address?: string;
  audioOutput: 'BLUETOOTH' | 'LOCAL';
}) => void;

export class WebSerialService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private isReading = false;
  private readBuffer = '';
  private disconnectListener: ((event: any) => void) | null = null;
  private currentStatus: ConnectionStatus = 'DISCONNECTED';
  private currentInfo: string = 'No device selected';

  // Event listener sets
  private lineListeners = new Set<LineListener>();
  private statusListeners = new Set<StatusListener>();
  private messageListeners = new Set<MessageListener>();
  private btScanListeners = new Set<BtScanListener>();
  private btStatusListeners = new Set<BtStatusListener>();

  public onStatusChange?: StatusListener;
  public onMessage?: MessageListener;
  public onLineReceived?: LineListener;
  public onError?: (error: string) => void;

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public getPortInfo(): SerialPortInfo | null {
    if (!this.port) return null;
    try {
      return this.port.getInfo();
    } catch {
      return null;
    }
  }

  public isConnected(): boolean {
    return this.port !== null && this.isReading;
  }

  public getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  public getDeviceInfo(): string {
    return this.currentInfo;
  }

  // Listener registration methods
  public addLineListener(cb: LineListener): () => void {
    this.lineListeners.add(cb);
    return () => this.lineListeners.delete(cb);
  }

  public addStatusListener(cb: StatusListener): () => void {
    this.statusListeners.add(cb);
    cb(this.currentStatus, this.currentInfo);
    return () => this.statusListeners.delete(cb);
  }

  public addMessageListener(cb: MessageListener): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  public addBtScanListener(cb: BtScanListener): () => void {
    this.btScanListeners.add(cb);
    return () => this.btScanListeners.delete(cb);
  }

  public addBtStatusListener(cb: BtStatusListener): () => void {
    this.btStatusListeners.add(cb);
    return () => this.btStatusListeners.delete(cb);
  }

  public async connect(baudRate: number = 115200): Promise<boolean> {
    if (!WebSerialService.isSupported()) {
      const err = 'Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera over HTTPS or localhost.';
      this.notifyError(err);
      this.notifyStatus('ERROR', err);
      return false;
    }

    try {
      this.notifyStatus('CONNECTING', 'Requesting serial port from browser...');
      this.notifyConsole('SYS', 'Requesting USB Serial Port (115200 baud)...');

      const serial = (navigator as any).serial;
      const selectedPort: SerialPort = await serial.requestPort();

      await selectedPort.open({ baudRate });
      this.port = selectedPort;
      this.isReading = true;

      const info = selectedPort.getInfo();
      const devDesc = info.usbVendorId
        ? `USB Device (VID: 0x${info.usbVendorId.toString(16).toUpperCase().padStart(4, '0')}, PID: 0x${(info.usbProductId || 0).toString(16).toUpperCase().padStart(4, '0')})`
        : 'USB Serial Device (CH340 / CP2102 / FTDI)';

      this.notifyStatus('CONNECTED', devDesc);
      this.notifyConsole('SYS', `Port opened successfully @ ${baudRate} baud. ${devDesc}`);

      // Query current audio output status upon connection
      setTimeout(() => {
        this.send('GET_AUDIO_STATUS\n');
      }, 500);

      this.disconnectListener = (event: any) => {
        if (event.port === this.port || !event.port) {
          this.handleUnexpectedDisconnect('USB cable was unplugged or ESP32 disconnected.');
        }
      };
      serial.addEventListener('disconnect', this.disconnectListener);

      this.startReadingLoop();
      return true;
    } catch (err: any) {
      let errorMessage = 'Failed to open serial port';
      if (err.name === 'NotFoundError') {
        errorMessage = 'Port selection was cancelled by the user.';
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'Serial port is already open or in use.';
      } else if (err.name === 'NetworkError' || (err.message && err.message.includes('Failed to open'))) {
        errorMessage = 'Serial port is busy or unavailable. Ensure Arduino Serial Monitor or other apps are closed.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      this.notifyError(errorMessage);
      this.notifyConsole('ERR', errorMessage);
      this.notifyStatus('DISCONNECTED', errorMessage);
      await this.cleanup();
      return false;
    }
  }

  public async send(text: string): Promise<boolean> {
    if (!this.port || !this.port.writable) {
      const err = 'Cannot send: Serial port is not connected or not writable.';
      this.notifyError(err);
      this.notifyConsole('ERR', err);
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const writer = this.port.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();

      const displayTxt = text.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
      this.notifyConsole('TX', displayTxt);
      return true;
    } catch (err: any) {
      const errorMsg = `Send failed: ${err.message || 'Unknown write error'}`;
      this.notifyError(errorMsg);
      this.notifyConsole('ERR', errorMsg);
      return false;
    }
  }

  // High-level Bluetooth commands over Serial
  public async scanBluetooth(): Promise<boolean> {
    // Send both JSON command and raw token for maximum firmware compatibility
    return this.send('BT_SCAN\n');
  }

  public async connectBluetooth(address: string, name: string): Promise<boolean> {
    const payload = JSON.stringify({
      command: 'BT_CONNECT',
      address,
      name
    });
    return this.send(payload + '\n');
  }

  public async disconnectBluetooth(): Promise<boolean> {
    const payload = JSON.stringify({ command: 'BT_DISCONNECT' });
    return this.send(payload + '\n');
  }

  public async getAudioStatus(): Promise<boolean> {
    return this.send('GET_AUDIO_STATUS\n');
  }

  public async disconnect(): Promise<void> {
    this.notifyConsole('SYS', 'Closing USB Serial Port connection...');
    await this.cleanup();
    this.notifyStatus('DISCONNECTED', 'Serial port closed.');
    this.notifyConsole('SYS', 'Port closed cleanly.');
  }

  private async startReadingLoop(): Promise<void> {
    const decoder = new TextDecoder();

    while (this.port && this.port.readable && this.isReading) {
      try {
        this.reader = this.port.readable.getReader();
        while (this.isReading) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            this.handleIncomingChunk(chunk);
          }
        }
      } catch (err: any) {
        if (this.isReading) {
          this.handleUnexpectedDisconnect(`Serial read error: ${err.message || 'Device disconnected or reset'}`);
        }
        break;
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch {
            // ignore
          }
          this.reader = null;
        }
      }
    }
  }

  private handleIncomingChunk(chunk: string) {
    this.readBuffer += chunk;
    const lines = this.readBuffer.split(/\r?\n/);
    this.readBuffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.length > 0) {
        this.notifyConsole('RX', line);

        // Notify raw line subscribers
        if (this.onLineReceived) this.onLineReceived(line);
        this.lineListeners.forEach(listener => {
          try { listener(line); } catch (e) { console.error(e); }
        });

        // Parse structured protocol packets
        this.parseIncomingLine(line);
      }
    }
  }

  private parseIncomingLine(line: string) {
    // 1. Check for JSON payload
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const data = JSON.parse(line);

        // BLUETOOTH_SCAN_RESULT
        if (data.type === 'BLUETOOTH_SCAN_RESULT' && Array.isArray(data.devices)) {
          const devices: DiscoveredBluetoothDevice[] = data.devices.map((d: any) => ({
            name: d.name || 'Bluetooth device',
            address: d.address || '00:00:00:00:00:00',
            type: d.type === 'AUDIO_DEVICE' ? 'AUDIO_DEVICE' : 'BLUETOOTH_DEVICE',
            rssi: d.rssi,
            lastSeen: new Date().toLocaleTimeString()
          }));
          this.btScanListeners.forEach(l => l(devices));
        }

        // Bluetooth status / Telemetry
        if (data.bluetooth !== undefined || data.audioOutput !== undefined) {
          const bt = data.bluetooth || {};
          const status = {
            connected: Boolean(bt.connected),
            deviceName: bt.deviceName,
            address: bt.address,
            audioOutput: (data.audioOutput || (bt.connected ? 'BLUETOOTH' : 'LOCAL')) as 'BLUETOOTH' | 'LOCAL'
          };
          this.btStatusListeners.forEach(l => l(status));
        }

        // Dedicated event packets
        if (data.type === 'BLUETOOTH_DISCONNECTED') {
          this.btStatusListeners.forEach(l => l({
            connected: false,
            audioOutput: 'LOCAL'
          }));
        }

        if (data.type === 'BLUETOOTH_CONNECTED') {
          this.btStatusListeners.forEach(l => l({
            connected: true,
            deviceName: data.name || data.deviceName,
            address: data.address,
            audioOutput: 'BLUETOOTH'
          }));
        }
      } catch {
        // Not valid JSON, continue to plaintext check
      }
    }

    // 2. Plaintext protocol tokens
    if (line.includes('BLUETOOTH_DISCONNECTED') || line.includes('BT_DISCONNECTED')) {
      this.btStatusListeners.forEach(l => l({
        connected: false,
        audioOutput: 'LOCAL'
      }));
    }

    if (line.startsWith('BT_CONNECTED:')) {
      const parts = line.split(':');
      const name = parts[1] || 'College PA Receiver';
      const address = parts.slice(2).join(':') || '24:6F:28:9A:C3:84';
      this.btStatusListeners.forEach(l => l({
        connected: true,
        deviceName: name,
        address,
        audioOutput: 'BLUETOOTH'
      }));
    }

    if (line.startsWith('OUTPUT:')) {
      const mode = line.split(':')[1]?.trim() === 'BLUETOOTH' ? 'BLUETOOTH' : 'LOCAL';
      this.btStatusListeners.forEach(l => l({
        connected: mode === 'BLUETOOTH',
        audioOutput: mode
      }));
    }
  }

  private async handleUnexpectedDisconnect(reason: string) {
    this.notifyConsole('ERR', `[DISCONNECT] ${reason}`);
    this.notifyError(reason);
    await this.cleanup();
    this.notifyStatus('ERROR', reason);
  }

  private async cleanup() {
    this.isReading = false;

    if (this.disconnectListener && typeof navigator !== 'undefined' && 'serial' in navigator) {
      try {
        (navigator as any).serial.removeEventListener('disconnect', this.disconnectListener);
      } catch {
        // ignore
      }
      this.disconnectListener = null;
    }

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // ignore
      }
      try {
        this.reader.releaseLock();
      } catch {
        // ignore
      }
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // ignore
      }
      this.port = null;
    }

    this.readBuffer = '';
  }

  private notifyStatus(status: ConnectionStatus, info?: string) {
    this.currentStatus = status;
    if (info) this.currentInfo = info;
    if (this.onStatusChange) {
      this.onStatusChange(status, info);
    }
    this.statusListeners.forEach(l => {
      try { l(status, info); } catch (e) { console.error(e); }
    });
  }

  private notifyConsole(type: ConsoleMessage['type'], text: string) {
    const msg: ConsoleMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      text
    };
    if (this.onMessage) {
      this.onMessage(msg);
    }
    this.messageListeners.forEach(l => {
      try { l(msg); } catch (e) { console.error(e); }
    });
  }

  private notifyError(err: string) {
    if (this.onError) {
      this.onError(err);
    }
  }
}

// Global shared singleton instance for zero-conflict USB Serial access across tabs
let sharedSerialService: WebSerialService | null = null;

export function getSharedWebSerialService(): WebSerialService {
  if (!sharedSerialService) {
    sharedSerialService = new WebSerialService();
  }
  return sharedSerialService;
}

