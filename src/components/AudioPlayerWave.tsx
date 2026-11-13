import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerWaveProps {
  audioUrl?: string;
  duration?: number;
  label?: string;
  autoPlay?: boolean;
}

export const AudioPlayerWave: React.FC<AudioPlayerWaveProps> = ({
  audioUrl,
  duration = 5,
  label = 'Announcement Audio Stream',
  autoPlay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Audio play error:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setAudioDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Generate synthetic waveform bars
  const barsCount = 28;
  const progressRatio = audioDuration > 0 ? currentTime / audioDuration : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={() => {
            if (audioRef.current?.duration) {
              setAudioDuration(audioRef.current.duration);
            }
          }}
          autoPlay={autoPlay}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-500'}`} />
          <span className="text-xs font-mono font-medium text-slate-400 tracking-wide uppercase">{label}</span>
        </div>
        <span className="text-xs font-mono text-indigo-400 font-semibold">
          {formatTime(currentTime)} / {formatTime(audioDuration || duration)}
        </span>
      </div>

      {/* Waveform Visualization Bars */}
      <div className="flex items-end justify-between gap-1 h-12 py-1 px-2 bg-slate-950 rounded-lg border border-slate-800">
        {Array.from({ length: barsCount }).map((_, idx) => {
          const barRatio = idx / barsCount;
          const isPassed = barRatio <= progressRatio;
          // pseudo-random harmonic height pattern
          const h = 20 + Math.sin(idx * 0.8) * 18 + Math.cos(idx * 1.5) * 10 + (idx % 3) * 6;
          const activeHeight = isPlaying ? Math.max(15, (h * (0.6 + Math.sin(currentTime * 8 + idx) * 0.4))) : h;

          return (
            <div
              key={idx}
              className={`flex-1 rounded-t-sm transition-all duration-75 ${
                isPassed
                  ? isPlaying
                    ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]'
                    : 'bg-indigo-500/80'
                  : 'bg-slate-800'
              }`}
              style={{ height: `${Math.min(100, Math.max(15, activeHeight))}%` }}
            />
          );
        })}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-3">
        <button
          id="audio-play-btn"
          onClick={togglePlay}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
          title={isPlaying ? 'Pause Preview' : 'Play Preview'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
        </button>

        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              setCurrentTime(0);
            }
          }}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Restart Audio"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Seek Bar */}
        <input
          type="range"
          min="0"
          max={audioDuration || duration}
          step="0.05"
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />

        <button
          onClick={toggleMute}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
