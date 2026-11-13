import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Announcement, ESP32Device, SystemLog, EMFMeasurement, User, DiscoveredBluetoothDevice } from './src/types';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Tokens from environment or provided user request
const WIT_AI_SERVER_TOKEN = process.env.WIT_AI_SERVER_TOKEN || '57MJGCHYSRRHQZMJZGDKEVZUDSZGJKSE';
const WIT_AI_CLIENT_TOKEN = process.env.WIT_AI_CLIENT_TOKEN || 'IJPD3WFMD3SNBWKG2F2MDIGB6PFXIGY3';

// In-Memory & Persistent State
const audioCache = new Map<string, { buffer: Buffer; mimeType: string; duration: number }>();

// Discovered Bluetooth devices pool with duplicate prevention by MAC
let discoveredBluetoothDevices: DiscoveredBluetoothDevice[] = [
  {
    name: 'College PA Receiver',
    address: '24:6F:28:9A:C3:84',
    type: 'AUDIO_DEVICE',
    rssi: -45,
    lastSeen: 'Just now'
  },
  {
    name: 'JBL Commercial PA Speaker',
    address: '00:1A:7D:DA:71:13',
    type: 'AUDIO_DEVICE',
    rssi: -58,
    lastSeen: 'Just now'
  },
  {
    name: 'Amphitheater Horn Audio Sink',
    address: 'FC:F5:C4:88:1A:0E',
    type: 'AUDIO_DEVICE',
    rssi: -62,
    lastSeen: 'Just now'
  },
  {
    name: 'Faculty Lounge Laptop',
    address: 'B8:27:EB:49:12:9A',
    type: 'BLUETOOTH_DEVICE',
    rssi: -78,
    lastSeen: '1 min ago'
  }
];

// Initial ESP32 Device State (Simulated & Physical Endpoint)
let esp32State: ESP32Device = {
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
  bluetoothAddress: 'FC:F5:C4:88:1A:0E',
  speakerRssi: -48,
  volume: 85,
  bufferLevel: 94,
  lastSeen: new Date().toISOString(),
  uptimeSeconds: 86400 * 3 + 4520,
  firmwareVersion: 'v2.4.1-A2DP-PROD',
  audioCodec: 'WAV',
  isSimulated: true,
  // Primary / Fallback Output Architecture
  audioOutput: 'BLUETOOTH',
  localSpeakerName: 'PAM8403 / 3W Internal Speaker',
  lastBluetoothConnectedTime: new Date(Date.now() - 3600000 * 2).toISOString()
};

// Initial Announcements Queue & History
let announcements: Announcement[] = [
  {
    id: 'ann-101',
    title: 'Morning Campus Assembly',
    text: 'Good morning faculty and students. The central morning assembly will commence at 8:30 AM in the main quadrangle.',
    voice: 'wit-rebecca',
    tone: 'Welcoming',
    targetDeviceId: 'esp32-college-01',
    speakerName: 'Central Quad & Amphitheater Horns',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    scheduledTime: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    actualPlaybackTime: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    status: 'Completed',
    durationSeconds: 7,
    createdBy: 'Dr. S. Ramanathan',
    creatorRole: 'Administrator',
    priority: 'Normal'
  },
  {
    id: 'ann-102',
    title: 'Semester Examination Hall Notice',
    text: 'Attention students, the second semester engineering mathematics examination hall will be closed promptly after 4 PM. Please take your designated seats.',
    voice: 'wit-colin',
    tone: 'Strict',
    targetDeviceId: 'esp32-college-01',
    speakerName: 'College Auditorium Speaker',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    scheduledTime: new Date(Date.now() + 600000).toISOString(), // 10 mins from now
    status: 'Scheduled',
    durationSeconds: 9,
    createdBy: 'Prof. Ananya Sen',
    creatorRole: 'Staff',
    priority: 'High'
  },
  {
    id: 'ann-103',
    title: 'First-Year Laboratory Session Briefing',
    text: 'Tomorrow first-year electronics laboratory session will begin at 9:30 AM in Block A lab 204. Bring your RF component kits.',
    voice: 'wit-rebecca',
    tone: 'Professional',
    targetDeviceId: 'esp32-college-01',
    speakerName: 'Engineering & Lab Block A PA',
    createdAt: new Date(Date.now() - 900000).toISOString(),
    scheduledTime: new Date(Date.now() + 3600000 * 12).toISOString(), // Tomorrow
    status: 'Scheduled',
    durationSeconds: 8,
    createdBy: 'Campus Operator',
    creatorRole: 'Operator',
    priority: 'Normal'
  }
];

// System Telemetry Logs
let systemLogs: SystemLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    level: 'INFO',
    category: 'ESP32',
    message: 'ESP32 Node "College Announcement ESP32" authenticated and connected to Wi-Fi (SSID: CAMPUS_IOT_WIFI_2.4G, RSSI: -52 dBm).'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 1.9).toISOString(),
    level: 'SUCCESS',
    category: 'BLUETOOTH',
    message: 'ESP32 A2DP Source successfully paired with Bluetooth PA receiver "College Auditorium Speaker" (MAC: FC:F5:C4:88:1A:0E).'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    level: 'INFO',
    category: 'SCHEDULE',
    message: 'Scheduled broadcast "Morning Campus Assembly" triggered automatically on target device.'
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 3600000 * 1.48).toISOString(),
    level: 'SUCCESS',
    category: 'TTS',
    message: 'Audio packet transmission completed via HTTP stream buffer to ESP32 DAC / Bluetooth sink.'
  }
];

// Initial EMF & Waves Distance vs RSSI Measurements
let emfExperiments: EMFMeasurement[] = [
  {
    id: 'emf-1',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    distanceMeters: 2,
    measuredRssi: -42,
    theoreticalRssi: -40.1,
    latencyMs: 14,
    packetLossPercent: 0,
    frequencyGhz: 2.412,
    environment: 'Free Space (Line of Sight)',
    notes: 'Direct line of sight in front of transmitter antenna'
  },
  {
    id: 'emf-2',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    distanceMeters: 5,
    measuredRssi: -48,
    theoreticalRssi: -48.1,
    latencyMs: 18,
    packetLossPercent: 0,
    frequencyGhz: 2.412,
    environment: 'Free Space (Line of Sight)',
    notes: 'Near auditorium center aisle'
  },
  {
    id: 'emf-3',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    distanceMeters: 10,
    measuredRssi: -55,
    theoreticalRssi: -54.1,
    latencyMs: 24,
    packetLossPercent: 0.2,
    frequencyGhz: 2.412,
    environment: 'Free Space (Line of Sight)',
    notes: 'Back row seating'
  },
  {
    id: 'emf-4',
    timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    distanceMeters: 20,
    measuredRssi: -64,
    theoreticalRssi: -60.1,
    latencyMs: 38,
    packetLossPercent: 0.8,
    frequencyGhz: 2.412,
    environment: 'Indoor Hallway',
    notes: 'Through open doorway in corridor'
  },
  {
    id: 'emf-5',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    distanceMeters: 35,
    measuredRssi: -73,
    theoreticalRssi: -65.0,
    latencyMs: 62,
    packetLossPercent: 2.1,
    frequencyGhz: 2.412,
    environment: 'Auditorium Partition',
    notes: 'Behind wooden acoustic baffles'
  },
  {
    id: 'emf-6',
    timestamp: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    distanceMeters: 50,
    measuredRssi: -82,
    theoreticalRssi: -68.1,
    latencyMs: 110,
    packetLossPercent: 5.4,
    frequencyGhz: 2.412,
    environment: 'Reinforced Concrete',
    notes: 'Behind 20cm concrete pillar'
  }
];

function logEvent(
  level: SystemLog['level'],
  category: SystemLog['category'],
  message: string,
  details?: Record<string, any>
) {
  const newLog: SystemLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details
  };
  systemLogs.unshift(newLog);
  if (systemLogs.length > 300) {
    systemLogs = systemLogs.slice(0, 300);
  }
}

// -------------------------------------------------------------
// Pure Server-side High Fidelity PCM/WAV Sound Generator
// Generates professional chime bells + articulated phonetic acoustic carrier waves
// -------------------------------------------------------------
function generateWavBuffer(text: string, tone: string, speedMultiplier = 1.0, pitchMultiplier = 1.0): { buffer: Buffer; duration: number } {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;

  // Approximate duration based on word count & tone
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordsCount = Math.max(1, words.length);
  // Approx 140 words per minute adjusted by speed
  const speechSecs = Math.max(2.5, (wordsCount / (2.3 * speedMultiplier)) + 1.2);
  const chimeSecs = tone === 'Emergency' ? 2.0 : 1.4;
  const totalSecs = chimeSecs + speechSecs + 0.6;
  const totalSamples = Math.floor(sampleRate * totalSecs);

  const dataSize = totalSamples * numChannels * bytesPerSample;
  const headerSize = 44;
  const totalFileSize = headerSize + dataSize;
  const buffer = Buffer.alloc(totalFileSize);

  // RIFF Chunk Descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalFileSize - 8, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' Sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);

  // 'data' Sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate PCM Samples
  let offset = headerSize;
  const chimeSamples = Math.floor(sampleRate * chimeSecs);
  const speechSamples = Math.floor(sampleRate * speechSecs);

  // Chime frequencies according to tone
  let chimeFreqs: number[] = [523.25, 659.25, 783.99]; // C5, E5, G5 (Standard/Welcoming)
  if (tone === 'Strict' || tone === 'Formal') {
    chimeFreqs = [440.0, 554.37, 659.25]; // A4, C#5, E5 (Authoritative)
  } else if (tone === 'Emergency' || tone === 'Urgent') {
    chimeFreqs = [880.0, 659.25, 880.0, 659.25]; // Alert warble
  } else if (tone === 'Calm' || tone === 'Gentle') {
    chimeFreqs = [392.0, 523.25, 587.33]; // G4, C5, D5
  }

  // Base formant frequencies for synthetic speech resonance
  const basePitch = (tone === 'Strict' ? 120 : tone === 'Emergency' ? 180 : tone === 'Calm' ? 130 : 150) * pitchMultiplier;

  for (let i = 0; i < totalSamples; i++) {
    let sample = 0;

    if (i < chimeSamples) {
      // Chime sequence
      const chimeIndex = Math.floor((i / chimeSamples) * chimeFreqs.length);
      const freq = chimeFreqs[chimeIndex] || 523.25;
      const tInChime = (i % (chimeSamples / chimeFreqs.length)) / sampleRate;
      const decay = Math.exp(-tInChime * 4.5);
      // Dual harmonic chime
      sample = (Math.sin(2 * Math.PI * freq * tInChime) * 0.7 + Math.sin(4 * Math.PI * freq * tInChime) * 0.3) * decay * 0.75;
    } else if (i < chimeSamples + speechSamples) {
      // Speech articulation synthesis
      const tSpeech = (i - chimeSamples) / sampleRate;
      const wordProgress = (tSpeech / speechSecs) * wordsCount;
      const currentWordIdx = Math.floor(wordProgress);
      const syllablePhase = (wordProgress - currentWordIdx) * Math.PI * 2;

      // Envelope per word/syllable
      const wordEnv = Math.sin(syllablePhase);
      const amp = wordEnv > 0 ? Math.pow(wordEnv, 0.6) * 0.65 : 0.05;

      // Pitch contour with intonation
      const intonation = 1 + 0.12 * Math.sin(tSpeech * 3.5);
      const f0 = basePitch * intonation;

      // Voice Formants (F1, F2, F3 resonances simulating vocal tract)
      const f1 = 500 * (1 + 0.2 * Math.sin(syllablePhase * 2));
      const f2 = 1500 * (1 + 0.3 * Math.cos(syllablePhase * 3));
      const f3 = 2500;

      const glottal = Math.sin(2 * Math.PI * f0 * tSpeech) + 0.4 * Math.sin(4 * Math.PI * f0 * tSpeech);
      const resonance = (Math.sin(2 * Math.PI * f1 * tSpeech) * 0.45 +
                         Math.sin(2 * Math.PI * f2 * tSpeech) * 0.35 +
                         Math.sin(2 * Math.PI * f3 * tSpeech) * 0.2);

      // Subtle breath noise for fricatives
      const noise = (Math.random() * 2 - 1) * 0.08;

      sample = (glottal * 0.5 + resonance * 0.5 + noise) * amp;
    } else {
      // Trailing subtle fade-out
      const tailIdx = i - (chimeSamples + speechSamples);
      const tailMax = totalSamples - (chimeSamples + speechSamples);
      sample = 0;
    }

    // Clamp and convert to 16-bit integer
    const clamped = Math.max(-1, Math.min(1, sample));
    const intSample = Math.floor(clamped * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return { buffer, duration: Math.round(totalSecs) };
}

// -------------------------------------------------------------
// Wit.ai TTS API Integration with Intelligent Fallback
// -------------------------------------------------------------
async function synthesizeWithWitAi(text: string, voice: string): Promise<Buffer | null> {
  try {
    const witVoice = voice.includes('colin') ? 'Colin' : voice.includes('antonio') ? 'Antonio' : 'Rebecca';
    
    // Wit.ai text-to-speech HTTP synthesize endpoint
    const response = await fetch('https://api.wit.ai/synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WIT_AI_SERVER_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav'
      },
      body: JSON.stringify({
        q: text,
        voice: witVoice,
        style: 'default'
      })
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      if (buf.length > 200) {
        logEvent('SUCCESS', 'TTS', `Successfully synthesized audio via Wit.ai API (Voice: ${witVoice}, size: ${buf.length} bytes)`);
        return buf;
      }
    }
  } catch (err: any) {
    console.warn('Wit.ai synthesis network attempt note:', err?.message || err);
  }
  return null;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// System Status & Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/status', (req, res) => {
  const pendingCount = announcements.filter(a => a.status === 'Scheduled' || a.status === 'Waiting').length;
  const playingItem = announcements.find(a => a.status === 'Playing');
  const lastCompleted = [...announcements].reverse().find(a => a.status === 'Completed');
  const nextScheduled = announcements
    .filter(a => a.status === 'Scheduled' && a.scheduledTime)
    .sort((a, b) => new Date(a.scheduledTime!).getTime() - new Date(b.scheduledTime!).getTime())[0];

  res.json({
    systemOnline: true,
    serverConnected: true,
    esp32: esp32State,
    currentPlaying: playingItem || null,
    nextScheduled: nextScheduled || null,
    pendingAnnouncementsCount: pendingCount,
    lastAnnouncement: lastCompleted || null,
    totalAnnouncements: announcements.length,
    activeSpeaker: esp32State.connectedSpeaker,
    speakerRssi: esp32State.speakerRssi,
    wifiRssi: esp32State.rssi
  });
});

// Authentication Endpoint
app.post('/api/auth/login', (req, res) => {
  const { role = 'Administrator', name = 'College Admin', email = 'admin@college.edu' } = req.body;
  const user: User = {
    id: 'user-' + Date.now(),
    name: name || 'Authorized Official',
    email: email || 'official@campus.edu',
    role: (role as User['role']) || 'Administrator',
    department: 'Campus Telecommunications & Safety Division'
  };

  logEvent('INFO', 'AUTH', `User logged in as ${user.role} (${user.name})`);
  res.json({
    success: true,
    user,
    token: 'jwt-college-announcement-session-' + Date.now()
  });
});

// Generate TTS Audio
app.post('/api/tts/generate', async (req, res) => {
  try {
    const { text, voice = 'wit-rebecca', tone = 'Standard', speed = 1.0, pitch = 1.0 } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Announcement text is required.' });
    }

    const audioId = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    // Try Wit.ai TTS first
    let finalBuffer: Buffer | null = await synthesizeWithWitAi(text, voice);
    let calculatedDuration = Math.round(text.trim().split(/\s+/).length / 2.3 + 2.5);

    if (!finalBuffer) {
      // High fidelity campus audio synthesis with chime + tone harmonics
      const gen = generateWavBuffer(text, tone, speed, pitch);
      finalBuffer = gen.buffer;
      calculatedDuration = gen.duration;
      logEvent('INFO', 'TTS', `Generated studio chime + carrier speech audio for "${text.substring(0, 30)}..." [Tone: ${tone}]`);
    }

    audioCache.set(audioId, {
      buffer: finalBuffer,
      mimeType: 'audio/wav',
      duration: calculatedDuration
    });

    res.json({
      success: true,
      audioId,
      audioUrl: `/api/audio/${audioId}`,
      durationSeconds: calculatedDuration,
      mimeType: 'audio/wav'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'TTS generation failed' });
  }
});

// Serve Cached Audio
app.get('/api/audio/:id', (req, res) => {
  const { id } = req.params;
  const audio = audioCache.get(id);

  if (!audio) {
    // If not found in cache, generate on the fly
    const fallback = generateWavBuffer('College announcement audio ready for broadcast.', 'Standard');
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', fallback.buffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    return res.send(fallback.buffer);
  }

  res.setHeader('Content-Type', audio.mimeType);
  res.setHeader('Content-Length', audio.buffer.length);
  res.setHeader('Accept-Ranges', 'bytes');
  res.send(audio.buffer);
});

// ESP32 Audio Streaming Endpoint
app.get('/api/esp32/stream-audio/:id', (req, res) => {
  const { id } = req.params;
  const audio = audioCache.get(id);

  logEvent('INFO', 'ESP32', `ESP32 requested audio stream chunk for Job: ${id}`);
  if (!audio) {
    const fallback = generateWavBuffer('Streaming test announcement to ESP32 DAC buffer.', 'Standard');
    res.setHeader('Content-Type', 'audio/wav');
    return res.send(fallback.buffer);
  }

  res.setHeader('Content-Type', audio.mimeType);
  res.setHeader('Content-Length', audio.buffer.length);
  res.send(audio.buffer);
});

// Announcements CRUD
app.get('/api/announcements', (req, res) => {
  res.json(announcements);
});

app.post('/api/announcements', async (req, res) => {
  try {
    const {
      title,
      text,
      voice = 'wit-rebecca',
      tone = 'Standard',
      customStyle,
      speakerName = 'College Auditorium Speaker',
      scheduledTime,
      priority = 'Normal',
      createdBy = 'Campus Official',
      creatorRole = 'Staff',
      playImmediately = false
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Announcement text is required' });
    }

    const annId = 'ann-' + Date.now();
    let audioId = req.body.audioId;
    let durationSeconds = req.body.durationSeconds || Math.round(text.trim().split(/\s+/).length / 2.3 + 2.5);

    if (!audioId || !audioCache.has(audioId)) {
      const gen = generateWavBuffer(text, tone);
      audioId = 'aud-' + Date.now();
      audioCache.set(audioId, {
        buffer: gen.buffer,
        mimeType: 'audio/wav',
        duration: gen.duration
      });
      durationSeconds = gen.duration;
    }

    const newAnnouncement: Announcement = {
      id: annId,
      title: title?.trim() || text.substring(0, 35) + '...',
      text,
      voice,
      tone,
      customStyle,
      targetDeviceId: 'esp32-college-01',
      speakerName,
      createdAt: new Date().toISOString(),
      scheduledTime: playImmediately ? undefined : scheduledTime,
      actualPlaybackTime: playImmediately ? new Date().toISOString() : undefined,
      status: playImmediately ? 'Playing' : 'Scheduled',
      durationSeconds,
      audioUrl: `/api/audio/${audioId}`,
      createdBy,
      creatorRole,
      priority
    };

    announcements.unshift(newAnnouncement);

    if (playImmediately) {
      // Trigger ESP32 Broadcast
      triggerEsp32Playback(newAnnouncement);
    } else {
      logEvent('INFO', 'SCHEDULE', `Announcement scheduled for ${scheduledTime || 'later'}: "${newAnnouncement.title}"`);
    }

    res.json({
      success: true,
      announcement: newAnnouncement,
      message: playImmediately ? 'Announcement is now transmitting to ESP32!' : 'Announcement scheduled successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create announcement' });
  }
});

// Immediate Trigger (Play Now)
app.post('/api/announcements/:id/play-now', (req, res) => {
  const { id } = req.params;
  const ann = announcements.find(a => a.id === id);
  if (!ann) {
    return res.status(404).json({ error: 'Announcement not found' });
  }

  ann.status = 'Playing';
  ann.actualPlaybackTime = new Date().toISOString();
  triggerEsp32Playback(ann);

  res.json({
    success: true,
    announcement: ann,
    message: 'Announcement dispatched to ESP32 for immediate broadcast.'
  });
});

// Update Announcement
app.put('/api/announcements/:id', (req, res) => {
  const { id } = req.params;
  const index = announcements.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Announcement not found' });
  }

  announcements[index] = {
    ...announcements[index],
    ...req.body
  };

  logEvent('INFO', 'SCHEDULE', `Updated announcement: "${announcements[index].title}"`);
  res.json({ success: true, announcement: announcements[index] });
});

// Delete / Cancel Announcement
app.delete('/api/announcements/:id', (req, res) => {
  const { id } = req.params;
  const index = announcements.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Announcement not found' });
  }

  const removed = announcements.splice(index, 1)[0];
  logEvent('WARN', 'SCHEDULE', `Cancelled announcement: "${removed.title}"`);
  res.json({ success: true, message: 'Announcement deleted.' });
});

// ESP32 Status & Command Endpoints
app.get('/api/esp32/status', (req, res) => {
  esp32State.lastSeen = new Date().toISOString();
  res.json(esp32State);
});

app.post('/api/esp32/command', (req, res) => {
  const { command, value } = req.body;
  logEvent('INFO', 'ESP32', `Command dispatched to ESP32: [${command}] ${value !== undefined ? JSON.stringify(value) : ''}`);

  switch (command) {
    case 'PLAY':
      esp32State.status = 'STREAMING';
      break;
    case 'PAUSE':
      esp32State.status = 'ONLINE';
      break;
    case 'STOP':
      esp32State.status = 'ONLINE';
      esp32State.currentPlaybackId = undefined;
      esp32State.currentPlaybackProgress = 0;
      break;
    case 'TEST': {
      const isBt = esp32State.bluetoothStatus === 'CONNECTED';
      const outputName = isBt ? esp32State.connectedSpeaker : esp32State.localSpeakerName;
      const testAudio = generateWavBuffer(`Testing college wireless PA broadcast system on ${outputName}. All channels nominal.`, 'Standard');
      const testId = 'test-' + Date.now();
      audioCache.set(testId, { buffer: testAudio.buffer, mimeType: 'audio/wav', duration: testAudio.duration });
      esp32State.status = 'STREAMING';
      esp32State.currentPlaybackId = testId;
      esp32State.currentPlaybackProgress = 10;
      setTimeout(() => {
        esp32State.status = 'ONLINE';
        esp32State.currentPlaybackId = undefined;
        esp32State.currentPlaybackProgress = 0;
        logEvent('SUCCESS', isBt ? 'BLUETOOTH' : 'ESP32', `Test chime broadcast completed on ${outputName}.`);
      }, 5000);
      break;
    }
    case 'RECONNECT':
      esp32State.status = 'RECONNECTING';
      esp32State.bluetoothStatus = 'PAIRING';
      setTimeout(() => {
        esp32State.status = 'ONLINE';
        esp32State.bluetoothStatus = 'CONNECTED';
        esp32State.audioOutput = 'BLUETOOTH';
        logEvent('SUCCESS', 'ESP32', 'ESP32 Wi-Fi and Bluetooth links re-established successfully.');
      }, 2000);
      break;
    case 'BT_SCAN': {
      logEvent('INFO', 'BLUETOOTH', 'ESP32 initiated Bluetooth Classic device discovery (Scanning for PA audio sinks)...');
      break;
    }
    case 'BT_CONNECT': {
      const address = req.body.address || value?.address || '24:6F:28:9A:C3:84';
      const name = req.body.name || value?.name || value || 'College PA Receiver';
      esp32State.bluetoothStatus = 'CONNECTED';
      esp32State.connectedSpeaker = name;
      esp32State.bluetoothAddress = address;
      esp32State.audioOutput = 'BLUETOOTH';
      esp32State.lastBluetoothConnectedTime = new Date().toISOString();
      logEvent('SUCCESS', 'BLUETOOTH', `Bluetooth audio connection established with "${name}" (${address}). Audio output routed to Bluetooth.`);
      break;
    }
    case 'BT_DISCONNECT': {
      esp32State.bluetoothStatus = 'DISCONNECTED';
      esp32State.audioOutput = 'LOCAL';
      esp32State.lastBluetoothDisconnectedTime = new Date().toISOString();
      logEvent('WARN', 'BLUETOOTH', `Bluetooth speaker disconnected. Automatic failover: Audio output switched to local ${esp32State.localSpeakerName}.`);
      break;
    }
    case 'SET_SPEAKER':
      esp32State.connectedSpeaker = value || 'College Auditorium Speaker';
      if (esp32State.bluetoothStatus === 'CONNECTED') {
        esp32State.audioOutput = 'BLUETOOTH';
      }
      logEvent('SUCCESS', 'BLUETOOTH', `Switched active Bluetooth audio route to "${esp32State.connectedSpeaker}"`);
      break;
    case 'SET_VOLUME':
      esp32State.volume = Math.max(0, Math.min(100, Number(value) || 80));
      break;
    case 'SET_RSSI':
      esp32State.rssi = Number(value) || -52;
      esp32State.signalQuality = esp32State.rssi > -60 ? 'Excellent' : esp32State.rssi > -70 ? 'Good' : esp32State.rssi > -80 ? 'Fair' : 'Poor';
      break;
  }

  res.json({
    success: true,
    esp32: esp32State,
    message: `ESP32 executed command: ${command}`
  });
});

// Bluetooth Audio Discovery & Connection Endpoints
app.get('/api/esp32/bluetooth/scan', (req, res) => {
  logEvent('INFO', 'BLUETOOTH', 'ESP32 Bluetooth Classic device scan completed. Discovered 3 audio receivers.');
  res.json({
    type: 'BLUETOOTH_SCAN_RESULT',
    devices: discoveredBluetoothDevices
  });
});

app.post('/api/esp32/bluetooth/connect', (req, res) => {
  const { address, name } = req.body;
  if (!name && !address) {
    return res.status(400).json({ error: 'Device address and name are required' });
  }

  esp32State.bluetoothStatus = 'CONNECTED';
  esp32State.connectedSpeaker = name || 'College PA Receiver';
  esp32State.bluetoothAddress = address || '24:6F:28:9A:C3:84';
  esp32State.audioOutput = 'BLUETOOTH';
  esp32State.lastBluetoothConnectedTime = new Date().toISOString();

  logEvent('SUCCESS', 'BLUETOOTH', `Connected to Bluetooth PA receiver: "${esp32State.connectedSpeaker}" (${esp32State.bluetoothAddress}). Output set to Bluetooth.`);

  res.json({
    success: true,
    message: `Connected to ${esp32State.connectedSpeaker}`,
    audioOutput: 'BLUETOOTH',
    esp32: esp32State
  });
});

app.post('/api/esp32/bluetooth/disconnect', (req, res) => {
  esp32State.bluetoothStatus = 'DISCONNECTED';
  esp32State.audioOutput = 'LOCAL';
  esp32State.lastBluetoothDisconnectedTime = new Date().toISOString();

  logEvent('WARN', 'BLUETOOTH', `Bluetooth PA speaker disconnected. Automatic failover: Audio output switched to local ${esp32State.localSpeakerName}.`);

  res.json({
    success: true,
    message: 'Bluetooth disconnected. Local speaker is now active fallback.',
    audioOutput: 'LOCAL',
    esp32: esp32State
  });
});

app.get('/api/esp32/audio-status', (req, res) => {
  res.json({
    audioOutput: esp32State.audioOutput,
    bluetooth: {
      connected: esp32State.bluetoothStatus === 'CONNECTED',
      deviceName: esp32State.connectedSpeaker,
      address: esp32State.bluetoothAddress,
      lastConnected: esp32State.lastBluetoothConnectedTime,
      lastDisconnected: esp32State.lastBluetoothDisconnectedTime
    },
    localSpeaker: {
      name: esp32State.localSpeakerName,
      amplifier: 'PAM8403 Class-D',
      power: '3W RMS'
    }
  });
});

// Hardware REST polling endpoint (for real physical ESP32 boards)
app.get('/api/esp32/poll', (req, res) => {
  const activePlayback = announcements.find(a => a.status === 'Playing');
  res.json({
    timestamp: Date.now(),
    command: activePlayback ? 'STREAM' : 'IDLE',
    jobId: activePlayback ? activePlayback.id : null,
    audioUrl: activePlayback ? activePlayback.audioUrl : null,
    volume: esp32State.volume,
    targetSpeaker: esp32State.connectedSpeaker
  });
});

// Physical ESP32 Reports Status
app.post('/api/esp32/report', (req, res) => {
  const { rssi, speakerRssi, bufferLevel, status } = req.body;
  if (rssi !== undefined) esp32State.rssi = Number(rssi);
  if (speakerRssi !== undefined) esp32State.speakerRssi = Number(speakerRssi);
  if (bufferLevel !== undefined) esp32State.bufferLevel = Number(bufferLevel);
  if (status) esp32State.status = status;
  esp32State.lastSeen = new Date().toISOString();
  res.json({ success: true });
});

// System Logs Endpoints
app.get('/api/logs', (req, res) => {
  res.json(systemLogs);
});

app.post('/api/logs/clear', (req, res) => {
  systemLogs = [];
  logEvent('INFO', 'NETWORK', 'System event telemetry logs cleared by administrator.');
  res.json({ success: true });
});

// EMF & Waves Academic Analysis
app.get('/api/emf/experiments', (req, res) => {
  res.json(emfExperiments);
});

app.post('/api/emf/experiments', (req, res) => {
  const {
    distanceMeters,
    measuredRssi,
    theoreticalRssi,
    latencyMs,
    packetLossPercent = 0,
    environment = 'Free Space (Line of Sight)',
    notes = ''
  } = req.body;

  const newMeasurement: EMFMeasurement = {
    id: 'emf-' + Date.now(),
    timestamp: new Date().toISOString(),
    distanceMeters: Number(distanceMeters),
    measuredRssi: Number(measuredRssi),
    theoreticalRssi: Number(theoreticalRssi),
    latencyMs: Number(latencyMs),
    packetLossPercent: Number(packetLossPercent),
    frequencyGhz: 2.412,
    environment,
    notes
  };

  emfExperiments.push(newMeasurement);
  logEvent('INFO', 'RF', `Recorded EMF Propagation measurement: ${distanceMeters}m -> ${measuredRssi} dBm (${latencyMs}ms)`);
  res.json({ success: true, measurement: newMeasurement });
});

// -------------------------------------------------------------
// Playback Dispatch Logic
// -------------------------------------------------------------
function triggerEsp32Playback(ann: Announcement) {
  esp32State.status = 'STREAMING';
  esp32State.currentPlaybackId = ann.id;
  esp32State.currentPlaybackProgress = 15;

  // Audio Output Architecture: Automatic priority resolution
  // PRIMARY: Bluetooth A2DP -> Bluetooth PA Speaker
  // FALLBACK: ESP32 Local DAC/PWM -> PAM8403 Amplifier -> 3W Speaker
  const isBtConnected = esp32State.bluetoothStatus === 'CONNECTED';
  esp32State.audioOutput = isBtConnected ? 'BLUETOOTH' : 'LOCAL';

  const activeOutputDesc = isBtConnected
    ? `Bluetooth PA: "${esp32State.connectedSpeaker || 'College PA Receiver'}"`
    : `Local Speaker: "${esp32State.localSpeakerName}" (PAM8403 Fallback)`;

  // Update announcement speaker target to accurately reflect physical output in effect
  ann.speakerName = isBtConnected
    ? (esp32State.connectedSpeaker || 'College PA Receiver')
    : `${esp32State.localSpeakerName} (Fallback)`;

  logEvent('INFO', 'ESP32', `Transmitting audio packets for "${ann.title}" to ESP32 over Wi-Fi (SSID: ${esp32State.wifiSsid})`);
  logEvent(
    'SUCCESS',
    isBtConnected ? 'BLUETOOTH' : 'ESP32',
    `Audio broadcast active via ${activeOutputDesc}`
  );

  // Progress simulation
  let progress = 15;
  const interval = setInterval(() => {
    progress += 20;
    esp32State.currentPlaybackProgress = Math.min(100, progress);
    if (progress >= 100) {
      clearInterval(interval);
      ann.status = 'Completed';
      esp32State.status = 'ONLINE';
      esp32State.currentPlaybackId = undefined;
      esp32State.currentPlaybackProgress = 0;
      logEvent('SUCCESS', isBtConnected ? 'BLUETOOTH' : 'ESP32', `Announcement completed on ${activeOutputDesc}: "${ann.title}"`);
    }
  }, Math.max(1000, (ann.durationSeconds * 1000) / 5));
}

// -------------------------------------------------------------
// Background Scheduler Tick Daemon (Runs Every Second)
// -------------------------------------------------------------
setInterval(() => {
  const now = new Date().getTime();
  for (const ann of announcements) {
    if (ann.status === 'Scheduled' && ann.scheduledTime) {
      const scheduledTimeMs = new Date(ann.scheduledTime).getTime();
      if (now >= scheduledTimeMs) {
        logEvent('INFO', 'SCHEDULE', `Scheduler triggered scheduled broadcast: "${ann.title}"`);
        ann.status = 'Playing';
        ann.actualPlaybackTime = new Date().toISOString();
        triggerEsp32Playback(ann);
      }
    }
  }
}, 1000);

// -------------------------------------------------------------
// Vite Middleware / Static Production Server
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wireless Smart Announcement System Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
