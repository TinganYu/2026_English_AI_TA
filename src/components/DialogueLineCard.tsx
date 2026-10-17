import React from 'react';
import { Volume2, Loader2, Languages } from 'lucide-react';
import { DialogueLine } from '../types';

interface DialogueLineCardProps {
  line: DialogueLine;
  index: number;
  isActive: boolean;
  isLoading: boolean;
  showChinese: boolean;
  onPlayLine: (line: DialogueLine, index: number) => void;
  onWordClick: (word: string) => void;
}

export const DialogueLineCard: React.FC<DialogueLineCardProps> = ({
  line,
  index,
  isActive,
  isLoading,
  showChinese,
  onPlayLine,
  onWordClick,
}) => {
  const isAlex = line.speaker === 'Alex';

  // Helper to render words with highlightable chips
  const renderTextWithHighlights = () => {
    if (!line.highlightWords || line.highlightWords.length === 0) {
      return line.text;
    }

    // Split text into words so multi-word highlights can be rendered as one chip.
    const words = line.text.split(' ');
    const highlights = line.highlightWords.map((highlight) =>
      highlight.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().split(/\s+/)
    );
    const renderedWords: React.ReactNode[] = [];

    for (let wIdx = 0; wIdx < words.length; wIdx += 1) {
      const matchingHighlight = highlights.find((highlightWords) =>
        highlightWords.every((highlightWord, offset) => {
          const currentWord = words[wIdx + offset]
            ?.toLowerCase()
            .replace(/[^a-z0-9-]/g, '');
          return currentWord?.includes(highlightWord);
        })
      );
      const word = words.slice(wIdx, wIdx + (matchingHighlight?.length || 1)).join(' ');
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();

      if (matchingHighlight) {
        renderedWords.push(
          <button
            key={wIdx}
            onClick={() => onWordClick(cleanWord)}
            className="inline-block mx-0.5 px-1.5 py-0.5 font-medium rounded-md bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-colors text-inherit cursor-pointer"
            title="Click to view vocabulary definition"
          >
            {wIdx > 0 ? ' ' : ''}
            {word}
          </button>
        );
      }
      else {
        renderedWords.push(
          <span key={wIdx}>
            {wIdx > 0 ? ' ' : ''}
            {word}
          </span>
        );
      }
      wIdx += (matchingHighlight?.length || 1) - 1;
    }

    return renderedWords;
  };

  return (
    <div
      id={`line-${line.id}`}
      className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-300 border ${
        isActive
          ? isAlex
            ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
            : 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg'
          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Speaker Avatar & Icon */}
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md ${
              isAlex
                ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white'
                : 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
            }`}
          >
            {line.avatar || (isAlex ? '👨‍💼' : '👩‍💼')}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`font-bold text-sm tracking-wide ${
                  isAlex ? 'text-amber-900' : 'text-emerald-900'
                }`}
              >
                {line.speaker}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                #{index + 1}
              </span>
            </div>

            {/* Play Line Button */}
            <button
              onClick={() => onPlayLine(line, index)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              } disabled:opacity-50`}
              title="Play this sentence"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{isActive ? 'Speaking...' : 'Play line'}</span>
            </button>
          </div>

          {/* English line with clickable words */}
          <p className="text-slate-900 text-base sm:text-lg leading-relaxed font-normal">
            {renderTextWithHighlights()}
          </p>

          {/* Traditional Chinese translation */}
          {showChinese && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-start gap-2 text-slate-600 text-sm">
              <Languages className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{line.chineseText}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
