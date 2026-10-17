import React, { useState } from 'react';
import { Sparkles, X, Loader2, BookOpen, Wand2 } from 'lucide-react';
import { DialogueScript } from '../types';

interface DialogueGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewScriptGenerated: (script: DialogueScript) => void;
}

export const DialogueGeneratorModal: React.FC<DialogueGeneratorModalProps> = ({
  isOpen,
  onClose,
  onNewScriptGenerated,
}) => {
  const [genres, setGenres] = useState('Fantasy & Adventure vs Science Fiction');
  const [habits, setHabits] = useState('Paper books at bedtime vs Audiobooks & E-readers on transit');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const topicPresets = [
    {
      genres: 'Mystery & Detective vs Graphic Novels / Comics',
      habits: 'Collecting paper copies at home vs Quick smartphone reading',
    },
    {
      genres: 'Romance & Drama vs Historical Fiction',
      habits: 'Borrowing physical books from library vs Downloading e-books',
    },
    {
      genres: 'Fantasy & Magic vs Real-world Biographies',
      habits: 'Quiet weekend paper reading vs Fast audio listening while jogging',
    },
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/generate-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredGenres: genres,
          habits: habits,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      const newScript: DialogueScript = {
        id: `gen-${Date.now()}`,
        title: data.title || 'Reading Preferences Dialogue',
        subtitle: data.subtitle || 'Custom A2 English Conversation',
        summary: data.summary || 'A custom dialogue generated with Gemini.',
        level: 'CEFR A2 (Elementary / 初中級)',
        characters: {
          Alex: {
            name: 'Alex',
            role: 'Physical / Paper Enthusiast',
            voice: 'Puck',
            avatarColor: 'bg-amber-600',
            habitSummary: 'Enjoys traditional reading and tangible books.',
          },
          Emma: {
            name: 'Emma',
            role: 'Digital / Modern Reader',
            voice: 'Kore',
            avatarColor: 'bg-emerald-600',
            habitSummary: 'Enjoys digital readers, mobility, and modern genres.',
          },
        },
        lines: (data.lines || []).map((l: any, i: number) => ({
          id: l.id || `line-${i + 1}`,
          speaker: l.speaker === 'Emma' ? 'Emma' : 'Alex',
          voice: l.speaker === 'Emma' ? 'Kore' : 'Puck',
          avatar: l.speaker === 'Emma' ? '👩‍💼' : '👨‍💼',
          text: l.text,
          chineseText: l.chineseText,
          audioNotes: l.audioNotes || 'Slow, articulate A2 delivery.',
          highlightWords: Array.isArray(l.highlightWords) ? l.highlightWords : [],
        })),
        vocabulary: data.vocabulary || [],
        quiz: data.quiz || [],
      };

      onNewScriptGenerated(newScript);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate new script. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Generate New A2 Script</h3>
              <p className="text-xs text-slate-500">
                Powered by Gemini 3.8 Flash (Text) & Gemini 3.8 Flash TTS (Audio)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Preset quick buttons */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Quick Topic Presets (點擊快速填入)
          </label>
          <div className="flex flex-col gap-2">
            {topicPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setGenres(preset.genres);
                  setHabits(preset.habits);
                }}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-xs text-slate-700 transition-colors"
              >
                <div className="font-semibold text-indigo-900">{preset.genres}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">{preset.habits}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Book Genres (書籍類型)
            </label>
            <input
              type="text"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="e.g. Mystery, Fantasy, Romance, Comic books..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reading Habits & Context (閱讀習慣與場景)
            </label>
            <input
              type="text"
              value={habits}
              onChange={(e) => setHabits(e.target.value)}
              placeholder="e.g. Paper books in bed vs e-readers on subway..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Crafting A2 Dialogue...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate Dialogue</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
