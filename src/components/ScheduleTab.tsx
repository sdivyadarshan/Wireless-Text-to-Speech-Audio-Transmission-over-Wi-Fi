import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Play,
  Trash2,
  Edit,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Radio,
  Search,
  Filter,
  Volume2,
  X
} from 'lucide-react';
import { Announcement, AnnouncementStatus, User } from '../types';
import { AudioPlayerWave } from './AudioPlayerWave';

interface ScheduleTabProps {
  announcements: Announcement[];
  currentUser: User | null;
  onPlayNow: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (ann: Announcement) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  announcements,
  currentUser,
  onPlayNow,
  onDelete,
  onEdit,
  onShowToast
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewAudioAnn, setPreviewAudioAnn] = useState<Announcement | null>(null);

  const getStatusBadge = (status: AnnouncementStatus) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-amber-950/40 text-amber-300 border-amber-800/40';
      case 'Playing':
        return 'bg-red-950/60 text-red-300 border-red-800/60 animate-pulse';
      case 'Sending':
        return 'bg-indigo-950/60 text-indigo-300 border-indigo-800/40';
      case 'Completed':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      case 'Failed':
        return 'bg-rose-950/40 text-rose-300 border-rose-800/40';
      case 'Waiting':
        return 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const filtered = announcements.filter(a => {
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchesSearch =
      a.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.speakerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-600/20">
              <Calendar className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Announcement Schedule & Cloud Queue</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status of queued, playing, and completed PA transmissions with priority overrides.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-48 sm:w-64"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Playing">Playing</option>
            <option value="Completed">Completed</option>
            <option value="Draft">Draft</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Audio Preview Modal Drawer (if previewing) */}
      {previewAudioAnn && (
        <div className="bg-slate-900 border border-indigo-600/40 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">Audio Stream: {previewAudioAnn.title}</span>
            </div>
            <button
              onClick={() => setPreviewAudioAnn(null)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 italic">"{previewAudioAnn.text}"</p>
          <AudioPlayerWave
            audioUrl={previewAudioAnn.audioUrl}
            duration={previewAudioAnn.durationSeconds}
            label={`Tone: ${previewAudioAnn.tone} • Target: ${previewAudioAnn.speakerName}`}
            autoPlay={true}
          />
        </div>
      )}

      {/* Table / Queue Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Announcement Details</th>
                <th className="py-3.5 px-4">Tone & Voice</th>
                <th className="py-3.5 px-4">Schedule / Target</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 text-sm">
                    No announcements matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((ann) => (
                  <tr key={ann.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Announcement Title and Message */}
                    <td className="py-4 px-4 sm:px-6 max-w-sm">
                      <div className="font-bold text-white text-sm">{ann.title}</div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {ann.text}
                      </p>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                        <span>Created by: {ann.createdBy}</span>
                        <span>•</span>
                        <span>Duration: ~{ann.durationSeconds}s</span>
                      </div>
                    </td>

                    {/* Tone & Voice */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {ann.tone}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {ann.voice.replace('wit-', '').replace('openai-', '')}
                        </span>
                      </div>
                    </td>

                    {/* Schedule & Target Zone */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-slate-200">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>
                            {ann.scheduledTime
                              ? new Date(ann.scheduledTime).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Immediate (Now)'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]" title={ann.speakerName}>
                          {ann.speakerName}
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusBadge(ann.status)}`}>
                        {ann.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Audio Preview */}
                        <button
                          onClick={() => setPreviewAudioAnn(ann)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                          title="Preview Audio"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        {/* Play Now Trigger */}
                        {ann.status !== 'Playing' && (
                          <button
                            onClick={() => onPlayNow(ann.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Play Immediately on ESP32"
                          >
                            <Play className="w-3 h-3 fill-emerald-300" />
                            <span>Play Now</span>
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => onEdit(ann)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit in Composer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDelete(ann.id)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
