export type Role = 'Administrator' | 'Staff' | 'Operator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  avatarUrl?: string;
}

export type AnnouncementStatus =
  | 'Draft'
  | 'Generating'
  | 'Scheduled'
  | 'Waiting'
  | 'Sending'
  | 'Playing'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export type ToneType =
  | 'Standard'
  | 'Calm'
  | 'Strict'
  | 'Welcoming'
  | 'Formal'
  | 'Friendly'
  | 'Urgent'
  | 'Emergency'
  | 'Professional'
  | 'Gentle'
  | 'Custom';

export interface TonePreset {
  id: ToneType;
  label: string;
  description: string;
  instruction: string;
  badgeColor: string;
  speed: number;
  pitch: number;
  iconName: string;
  leadChime?: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Female' | 'Male' | 'Neutral';
  accent: string;
  provider: 'Wit.ai' | 'OpenAI' | 'Neural';
  sampleUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  text: string;
  voice: string;
  tone: ToneType;
  customStyle?: string;
  targetDeviceId: string;
  speakerName: string;
  createdAt: string;
  scheduledTime?: string;
  actualPlaybackTime?: string;
  status: AnnouncementStatus;
  durationSeconds: number;
  audioUrl?: string;
  createdBy: string;
  creatorRole: Role;
  repeatCount?: number;
  priority: 'Normal' | 'High' | 'Critical';
  failureReason?: string;
}

export interface DiscoveredBluetoothDevice {
  name: string;
  address: string;
  type: 'AUDIO_DEVICE' | 'BLUETOOTH_DEVICE';
  rssi?: number;
  lastSeen?: string;
}

export type AudioOutputMode = 'BLUETOOTH' | 'LOCAL';

export interface ESP32Device {
  id: string;
  name: string;
  ipAddress: string;
  macAddress: string;
  status: 'ONLINE' | 'OFFLINE' | 'STREAMING' | 'RECONNECTING';
  connectionType: 'Wi-Fi' | 'Ethernet';
  wifiSsid: string;
  rssi: number; // dBm, e.g. -52 dBm
  signalQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  bluetoothStatus: 'CONNECTED' | 'DISCONNECTED' | 'PAIRING';
  connectedSpeaker: string;
  bluetoothAddress?: string;
  speakerRssi: number;
  volume: number; // 0 - 100
  bufferLevel: number; // 0 - 100 %
  lastSeen: string; // ISO string
  uptimeSeconds: number;
  firmwareVersion: string;
  currentPlaybackId?: string;
  currentPlaybackProgress?: number; // 0 - 100 %
  audioCodec: 'PCM-16' | 'MP3' | 'WAV' | 'AAC';
  isSimulated: boolean;
  // Audio Output Architecture & Failover
  audioOutput: AudioOutputMode;
  localSpeakerName: string;
  lastBluetoothConnectedTime?: string;
  lastBluetoothDisconnectedTime?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  category: 'ESP32' | 'BLUETOOTH' | 'TTS' | 'SCHEDULE' | 'AUTH' | 'RF' | 'NETWORK';
  message: string;
  details?: Record<string, any>;
}

export interface EMFMeasurement {
  id: string;
  timestamp: string;
  distanceMeters: number;
  measuredRssi: number;
  theoreticalRssi: number;
  latencyMs: number;
  packetLossPercent: number;
  frequencyGhz: number;
  environment: 'Free Space (Line of Sight)' | 'Indoor Hallway' | 'Auditorium Partition' | 'Reinforced Concrete';
  notes?: string;
}

export interface SpeakerZone {
  id: string;
  name: string;
  location: string;
  bluetoothMac: string;
  auxAmplifierModel: string;
  rssi: number;
  active: boolean;
}
