import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  FastForward,
  Rewind,
  Loader2,
} from 'lucide-react';

interface AudioPlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  currentLineIndex: number;
  totalLines: number;
  activeSpeaker?: string;
  onPlayAll: () => void;
  onPause: () => void;
  onReset: () => void;
  onNextLine: () => void;
  onPrevLine: () => void;
}

export const AudioPlayerControls: React.FC<AudioPlayerControlsProps> = ({
  isPlaying,
  isLoading,
  currentLineIndex,
  totalLines,
  activeSpeaker,
  onPlayAll,
  onPause,
  onReset,
  onNextLine,
  onPrevLine,
}) => {
  return (
    <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-800 space-y-4">
      {/* Main Player Row */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Active speaker indicator */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shrink-0">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : isPlaying ? (
              <div className="flex items-end gap-0.5 h-5">
                <span className="w-1 bg-white animate-[bounce_1s_infinite_100ms] h-3"></span>
                <span className="w-1 bg-white animate-[bounce_1s_infinite_300ms] h-5"></span>
                <span className="w-1 bg-white animate-[bounce_1s_infinite_200ms] h-4"></span>
              </div>
            ) : (
              <Volume2 className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              {isLoading
                ? '正在準備語音...'
                : isPlaying
                ? `Speaking: ${activeSpeaker || 'Dialogue'} (Line ${currentLineIndex + 1}/${totalLines})`
                : 'Ready to listen. Click Play or any line below!'}
            </p>
            <p className="text-xs text-slate-400">
              可點選下方句子，單獨練習每一句。
            </p>
          </div>
        </div>

        {/* Center: Playback control buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onPrevLine}
            disabled={currentLineIndex <= 0}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
            title="Previous line"
          >
            <Rewind className="w-5 h-5" />
          </button>

          <button
            onClick={isPlaying ? onPause : onPlayAll}
            disabled={isLoading}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95 disabled:opacity-50"
            title={isPlaying ? 'Pause dialogue' : 'Play full dialogue'}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNextLine}
            disabled={currentLineIndex >= totalLines - 1}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
            title="Next line"
          >
            <FastForward className="w-5 h-5" />
          </button>

          <button
            onClick={onReset}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors ml-1"
            title="Restart dialogue"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};
