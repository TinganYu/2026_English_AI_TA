import React from 'react';
import { Volume2, BookOpen, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { VocabularyItem } from '../types';

interface VocabularySectionProps {
  vocabulary: VocabularyItem[];
  onPlayWord: (word: string) => void;
}

export const VocabularySection: React.FC<VocabularySectionProps> = ({
  vocabulary,
  onPlayWord,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Core A2 Vocabulary & Phrases (核心字彙卡)
          </h3>
          <p className="text-sm text-slate-500">
            Key words used in the dialogue regarding book genres and reading habits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vocabulary.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {item.word}
                  </h4>
                  <span className="text-xs font-mono text-slate-500">{item.phonetic}</span>
                </div>
                <span className="inline-block mt-0.5 text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                  {item.partOfSpeech}
                </span>
              </div>

              <button
                onClick={() => onPlayWord(item.word)}
                className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                title="Pronounce word with browser speech"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Chinese Meaning */}
            <div className="mb-2 text-sm font-semibold text-indigo-900 bg-indigo-50/60 px-3 py-1.5 rounded-xl border border-indigo-100/50">
              {item.chineseMeaning}
            </div>

            {/* Simple Definition */}
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              <span className="font-semibold text-slate-700">English definition: </span>
              {item.definition}
            </p>

            {/* Example sentence */}
            <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              &quot;{item.exampleSentence}&quot;
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface VocabularyModalProps {
  item: VocabularyItem | null;
  onClose: () => void;
  onPlayWord: (word: string) => void;
}

export const VocabularyModal: React.FC<VocabularyModalProps> = ({
  item,
  onClose,
  onPlayWord,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900">{item.word}</h3>
              <span className="text-sm font-mono text-slate-500">{item.phonetic}</span>
            </div>
            <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
              {item.partOfSpeech}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPlayWord(item.word)}
              className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
              title="Pronounce word"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/60">
          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
            繁體中文釋義
          </div>
          <div className="text-base font-bold text-amber-950">{item.chineseMeaning}</div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Simple Definition (A2 Level)
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{item.definition}</p>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Example in Context
          </div>
          <p className="text-sm italic text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            &quot;{item.exampleSentence}&quot;
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors"
        >
          Got it (關閉)
        </button>
      </div>
    </div>
  );
};
