import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Volume2,
  Play,
  RotateCcw,
  CheckCircle,
  Clock,
  UserCheck,
  Building,
  X
} from 'lucide-react';
import { Announcement, User } from '../types';
import { AudioPlayerWave } from './AudioPlayerWave';

interface HistoryTabProps {
  announcements: Announcement[];
  currentUser: User | null;
  onPlayNow: (id: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  announcements,
  currentUser,
  onPlayNow,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTone, setFilterTone] = useState('ALL');
  const [filterSpeaker, setFilterSpeaker] = useState('ALL');
  const [activeAudioAnn, setActiveAudioAnn] = useState<Announcement | null>(null);

  const filteredHistory = announcements.filter(a => {
    const matchesSearch =
      a.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTone = filterTone === 'ALL' || a.tone === filterTone;
    const matchesSpeaker = filterSpeaker === 'ALL' || a.speakerName === filterSpeaker;
    return matchesSearch && matchesTone && matchesSpeaker;
  });

  const handleExportCsv = () => {
    const headers = 'ID,Title,Text,Voice,Tone,Speaker,ScheduledTime,PlaybackTime,DurationSeconds,Status,CreatedBy,Role\n';
    const rows = filteredHistory
      .map(a => `"${a.id}","${a.title}","${a.text.replace(/"/g, '""')}","${a.voice}","${a.tone}","${a.speakerName}","${a.scheduledTime || ''}","${a.actualPlaybackTime || ''}",${a.durationSeconds},"${a.status}","${a.createdBy}","${a.creatorRole}"`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Campus_Announcement_History_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('info', 'Exported', 'Announcement history exported to CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-600/20">
              <History className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Announcement Broadcast History & Audit</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Complete archive of generated broadcasts with historical vocal tones, target PA zones, and timestamps.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs border border-slate-700/80 transition-colors shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export History (CSV)</span>
        </button>
      </div>

      {/* Audio Player Preview Modal */}
      {activeAudioAnn && (
        <div className="bg-slate-900 border border-indigo-600/40 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">Replaying: {activeAudioAnn.title}</span>
            </div>
            <button
              onClick={() => setActiveAudioAnn(null)}
              className="text-xs text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <AudioPlayerWave
            audioUrl={activeAudioAnn.audioUrl}
            duration={activeAudioAnn.durationSeconds}
            label={`Tone: ${activeAudioAnn.tone} • Speaker: ${activeAudioAnn.speakerName}`}
            autoPlay={true}
          />
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search past announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <select
          value={filterTone}
          onChange={(e) => setFilterTone(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          <option value="ALL">All Speaking Tones</option>
          <option value="Standard">Standard</option>
          <option value="Strict">Strict</option>
          <option value="Welcoming">Welcoming</option>
          <option value="Emergency">Emergency</option>
          <option value="Formal">Formal</option>
          <option value="Friendly">Friendly</option>
          <option value="Urgent">Urgent</option>
          <option value="Professional">Professional</option>
          <option value="Calm">Calm</option>
        </select>

        <select
          value={filterSpeaker}
          onChange={(e) => setFilterSpeaker(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          <option value="ALL">All Speaker Zones</option>
          <option value="College Auditorium Speaker">Auditorium Speaker</option>
          <option value="Central Quad & Amphitheater Horns">Central Quad Horns</option>
          <option value="Engineering & Lab Block A PA">Engineering Lab PA</option>
          <option value="Central Library Silent PA Receiver">Library PA</option>
        </select>
      </div>

      {/* History Feed Cards */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-sm">
            No past broadcast history found.
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 sm:p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white text-sm sm:text-base">{item.title}</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 font-mono">
                    {item.tone}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                    {item.voice.replace('wit-', '').replace('openai-', '')}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                  "{item.text}"
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{item.speakerName}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.createdBy} ({item.creatorRole})</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {item.actualPlaybackTime
                        ? `Broadcasted: ${new Date(item.actualPlaybackTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : `Created: ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  onClick={() => setActiveAudioAnn(item)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen</span>
                </button>

                <button
                  onClick={() => onPlayNow(item.id)}
                  className="px-3 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-Broadcast</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
