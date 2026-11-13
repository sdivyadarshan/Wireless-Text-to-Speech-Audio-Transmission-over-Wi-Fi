import { TonePreset, VoiceOption, SpeakerZone } from '../types';

export const TONE_PRESETS: TonePreset[] = [
  {
    id: 'Standard',
    label: 'Standard',
    description: 'Neutral, balanced announcement tone for day-to-day general notices.',
    instruction: 'Speak in a clear, balanced, and articulate standard public address voice at normal pace.',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    speed: 1.0,
    pitch: 1.0,
    iconName: 'Volume2',
    leadChime: 'chime-soft'
  },
  {
    id: 'Strict',
    label: 'Strict',
    description: 'Authoritative, firm tone for exam halls, discipline, and deadline warnings.',
    instruction: 'Speak clearly and firmly with an authoritative tone. Maintain a moderate pace and strong articulation.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    speed: 0.95,
    pitch: 0.9,
    iconName: 'ShieldAlert',
    leadChime: 'chime-firm'
  },
  {
    id: 'Calm',
    label: 'Calm',
    description: 'Relaxed, soothing pace for library zones and mindfulness advisories.',
    instruction: 'Speak calmly, clearly, and reassuringly with a relaxed pace.',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    speed: 0.9,
    pitch: 1.05,
    iconName: 'Sparkles',
    leadChime: 'chime-gentle'
  },
  {
    id: 'Welcoming',
    label: 'Welcoming',
    description: 'Warm, positive tone for orientations, guest visits, and cultural events.',
    instruction: 'Speak warmly and positively with a friendly, welcoming tone.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    speed: 1.05,
    pitch: 1.15,
    iconName: 'HeartHandshake',
    leadChime: 'chime-bright'
  },
  {
    id: 'Formal',
    label: 'Formal',
    description: 'Dignified, professional delivery for faculty meetings and convocations.',
    instruction: 'Speak with dignified eloquence, steady rhythm, and formal academic decorum.',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    speed: 0.98,
    pitch: 0.95,
    iconName: 'GraduationCap',
    leadChime: 'chime-classic'
  },
  {
    id: 'Friendly',
    label: 'Friendly',
    description: 'Approachable, upbeat delivery for club activities and sports updates.',
    instruction: 'Speak energetically and cheerily with high engagement and an upbeat tempo.',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    speed: 1.1,
    pitch: 1.1,
    iconName: 'Smile',
    leadChime: 'chime-upbeat'
  },
  {
    id: 'Urgent',
    label: 'Urgent',
    description: 'High-priority notice for last-minute room reallocations and bus departures.',
    instruction: 'Speak with brisk cadence, clear emphasis on key timing details, and elevated focus.',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    speed: 1.15,
    pitch: 1.05,
    iconName: 'ClockAlert',
    leadChime: 'chime-urgent'
  },
  {
    id: 'Emergency',
    label: 'Emergency',
    description: 'Maximum priority siren & immediate broadcast for campus safety drills or alerts.',
    instruction: 'Speak clearly, urgently, and firmly. Prioritize intelligibility and immediate attention.',
    badgeColor: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    speed: 1.0,
    pitch: 1.0,
    iconName: 'AlertTriangle',
    leadChime: 'siren-alert'
  },
  {
    id: 'Professional',
    label: 'Professional',
    description: 'Crisp corporate/institutional clarity for seminar announcements.',
    instruction: 'Maintain a crisp, articulate, and highly polished corporate broadcaster tone.',
    badgeColor: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
    speed: 1.0,
    pitch: 1.0,
    iconName: 'Briefcase',
    leadChime: 'chime-soft'
  },
  {
    id: 'Gentle',
    label: 'Gentle',
    description: 'Soft, considerate volume and pacing for hostel quiet hours and clinic areas.',
    instruction: 'Speak softly, politely, and gently with smooth transitions.',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800',
    speed: 0.92,
    pitch: 1.08,
    iconName: 'Feather',
    leadChime: 'chime-gentle'
  }
];

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'wit-rebecca',
    name: 'Rebecca (Wit.ai Natural Female)',
    gender: 'Female',
    accent: 'US English - Crisp Broadcast',
    provider: 'Wit.ai'
  },
  {
    id: 'wit-colin',
    name: 'Colin (Wit.ai Deep Male)',
    gender: 'Male',
    accent: 'US English - Authoritative',
    provider: 'Wit.ai'
  },
  {
    id: 'wit-antonio',
    name: 'Antonio (Wit.ai Warm Neutral)',
    gender: 'Neutral',
    accent: 'International Clear',
    provider: 'Wit.ai'
  },
  {
    id: 'openai-alloy',
    name: 'Alloy (OpenAI gpt-4o-mini-tts)',
    gender: 'Neutral',
    accent: 'Modern Balanced Studio',
    provider: 'OpenAI'
  },
  {
    id: 'openai-echo',
    name: 'Echo (OpenAI gpt-4o-mini-tts)',
    gender: 'Male',
    accent: 'Deep Resonant PA',
    provider: 'OpenAI'
  },
  {
    id: 'openai-shimmer',
    name: 'Shimmer (OpenAI gpt-4o-mini-tts)',
    gender: 'Female',
    accent: 'Bright Campus Voice',
    provider: 'OpenAI'
  },
  {
    id: 'neural-campus-en',
    name: 'Athena (College Campus Broadcaster)',
    gender: 'Female',
    accent: 'Academic Institutional',
    provider: 'Neural'
  }
];

export const SPEAKER_ZONES: SpeakerZone[] = [
  {
    id: 'spk-auditorium',
    name: 'College Auditorium Speaker',
    location: 'Main Auditorium Hall (Zone 1)',
    bluetoothMac: 'FC:F5:C4:88:1A:0E',
    auxAmplifierModel: 'Ahuja TZA-4000 400W PA Amplifier (AUX-1 Input)',
    rssi: -48,
    active: true
  },
  {
    id: 'spk-quad',
    name: 'Central Quad & Amphitheater Horns',
    location: 'Outdoor Quadrangle (Zone 2)',
    bluetoothMac: 'A4:C1:38:F2:99:41',
    auxAmplifierModel: 'Bogen TPU250 Wall-Mount Horn Array (Line In)',
    rssi: -62,
    active: true
  },
  {
    id: 'spk-library',
    name: 'Central Library Silent PA Receiver',
    location: 'Library 1st & 2nd Floor (Zone 3)',
    bluetoothMac: '2C:AB:33:14:8B:77',
    auxAmplifierModel: 'Crown XLi 800 Distributed Ceiling Speakers',
    rssi: -54,
    active: false
  },
  {
    id: 'spk-lab-block',
    name: 'Engineering & Lab Block A PA',
    location: 'Electronics & Computer Science Wing (Zone 4)',
    bluetoothMac: '68:C6:3A:7E:50:23',
    auxAmplifierModel: 'Yamaha MA2030a Compact Mixer Amplifier',
    rssi: -50,
    active: false
  }
];
