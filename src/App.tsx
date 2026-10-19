import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Tablet,
  Headphones,
  Sparkles,
  Languages,
  FileText,
  Users,
  Volume2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { defaultScript } from './data/defaultScript';
import { scripts } from './data/scripts';
import { DialogueScript, DialogueLine, VocabularyItem } from './types';
import { AudioPlayerControls } from './components/AudioPlayerControls';
import { DialogueLineCard } from './components/DialogueLineCard';
import { VocabularySection, VocabularyModal } from './components/VocabularySection';
import { RoleplayPractice } from './components/RoleplayPractice';
import { WorksheetExportModal } from './components/WorksheetExportModal';
import { speakWithBrowserSynthesis } from './services/ttsService';

export default function App() {
  const [script, setScript] = useState<DialogueScript>(defaultScript);
  const [activeTab, setActiveTab] = useState<'dialogue' | 'roleplay' | 'vocabulary'>('dialogue');
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const playbackSpeed = 0.85;
  const [showChinese, setShowChinese] = useState<boolean>(true);
  const [selectedVocabWord, setSelectedVocabWord] = useState<VocabularyItem | null>(null);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleScriptChange = (scriptId: string) => {
    const nextScript = scripts[scriptId];
    if (!nextScript) return;
    stopCurrentAudio();
    setScript(nextScript);
    setCurrentLineIndex(0);
    setActiveTab('dialogue');
    setSelectedVocabWord(null);
  };

  // Audio elements & state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelSpeechSynthesisRef = useRef<(() => void) | null>(null);
  const isAutoPlayingRef = useRef<boolean>(false);
  const playLineRef = useRef<
    (line: DialogueLine, index: number, keepAutoPlaying?: boolean) => Promise<void>
  >(async () => {});

  // Setup audio player
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleEnded = () => {
      if (isAutoPlayingRef.current) {
        // Advance to next line if playing all
        setCurrentLineIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex < script.lines.length) {
            // Play next line after brief natural pause
            setTimeout(() => {
              void playLineRef.current(script.lines[nextIndex], nextIndex, true);
            }, 600);
            return nextIndex;
          } else {
            isAutoPlayingRef.current = false;
            setIsPlaying(false);
            return 0;
          }
        });
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = (e: any) => {
      console.warn('Audio playback error:', e);
      setIsPlaying(false);
      setIsLoadingAudio(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      if (cancelSpeechSynthesisRef.current) {
        cancelSpeechSynthesisRef.current();
      }
    };
  }, [script]);

  // Adjust audio speed whenever playbackSpeed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (cancelSpeechSynthesisRef.current) {
      cancelSpeechSynthesisRef.current();
      cancelSpeechSynthesisRef.current = null;
    }
    setIsPlaying(false);
  };

  const playLine = async (line: DialogueLine, index: number, keepAutoPlaying = false) => {
    stopCurrentAudio();
    setCurrentLineIndex(index);
    isAutoPlayingRef.current = keepAutoPlaying;
    try {
      setIsLoadingAudio(true);
      const audioUrl = `${import.meta.env.BASE_URL}audio/${script.id}/${line.id}.wav`;
      setIsLoadingAudio(false);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = playbackSpeed;
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Prepared audio unavailable; using browser speech:', err);
      setIsLoadingAudio(false);
      setIsPlaying(true);
      cancelSpeechSynthesisRef.current = speakWithBrowserSynthesis(
        line.text,
        line.speaker,
        playbackSpeed,
        () => setIsPlaying(false)
      );
    }
  };

  playLineRef.current = playLine;

  const handlePlayAll = () => {
    if (script.lines.length === 0) return;
    isAutoPlayingRef.current = true;
    playLine(script.lines[0], 0, true);
  };

  const handlePause = () => {
    isAutoPlayingRef.current = false;
    stopCurrentAudio();
  };

  const handleReset = () => {
    handlePause();
    setCurrentLineIndex(0);
  };

  const handleNextLine = () => {
    if (currentLineIndex < script.lines.length - 1) {
      playLine(script.lines[currentLineIndex + 1], currentLineIndex + 1, false);
    }
  };

  const handlePrevLine = () => {
    if (currentLineIndex > 0) {
      playLine(script.lines[currentLineIndex - 1], currentLineIndex - 1, false);
    }
  };

  const handlePlayWord = (word: string) => {
    stopCurrentAudio();
    const keywordPlaybackSpeed = Math.min(playbackSpeed, 0.7);
    speakWithBrowserSynthesis(
      word,
      'Emma',
      keywordPlaybackSpeed,
      undefined
    );
  };

  const handleWordClick = (wordText: string) => {
    const normalizeWord = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const clickedWord = normalizeWord(wordText);
    const matched = script.vocabulary.find(
      (v) => {
        const vocabularyWord = normalizeWord(v.word);
        const singularClickedWord = clickedWord.replace(/s$/, '');
        const singularVocabularyWord = vocabularyWord.replace(/s$/, '');
        return (
          vocabularyWord === clickedWord ||
          vocabularyWord.includes(clickedWord) ||
          clickedWord.includes(vocabularyWord) ||
          vocabularyWord.split(' ')[0] === singularClickedWord ||
          singularVocabularyWord === singularClickedWord
        );
      }
    );
    if (matched) {
      setSelectedVocabWord(matched);
    } else {
      setSelectedVocabWord({
        word: wordText,
        phonetic: '',
        partOfSpeech: '詞性未提供',
        definition: 'An important word or phrase in this lesson.',
        chineseMeaning: '本詞中文釋義未提供',
        exampleSentence: `I practiced the word "${wordText}" in a different sentence today.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                A2 English Reading & TTS
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Book Genres & Reading Habits Dialogue Practice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600">
              劇本
              <select
                value={script.id}
                onChange={(event) => handleScriptChange(event.target.value)}
                className="max-w-48 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400"
                aria-label="選擇劇本"
              >
                {Object.values(scripts).map((availableScript) => (
                  <option key={availableScript.id} value={availableScript.id}>
                    {availableScript.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">列印講義</span>
              <span className="sm:hidden">講義</span>
            </button>

            <button
              onClick={() => setShowChinese(!showChinese)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showChinese
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-800'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
              title="Toggle Chinese Translations"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{showChinese ? '中譯：開' : '中譯：關'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        {/* Hero Section: Topic & Character Overview */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold tracking-wide">
                {script.level}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                預先準備語音
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                Slow Pace for Students
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {script.title}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              {script.summary}
            </p>
          </div>

          {/* Character Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
            {Object.entries(script.characters).map(([name, character], index) => (
              <div
                key={name}
                className={`p-4 rounded-2xl flex items-start gap-3.5 ${
                  index === 0
                    ? 'bg-amber-50/70 border border-amber-200/80'
                    : 'bg-emerald-50/70 border border-emerald-200/80'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl ${
                  index === 0 ? 'bg-amber-600' : 'bg-emerald-600'
                } text-white flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                  {index === 0 ? '👨‍💼' : '👩‍💼'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{name}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {character.role} · {character.habitSummary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Global Audio Controller Bar */}
        <AudioPlayerControls
          isPlaying={isPlaying}
          isLoading={isLoadingAudio}
          currentLineIndex={currentLineIndex}
          totalLines={script.lines.length}
          activeSpeaker={script.lines[currentLineIndex]?.speaker}
          onPlayAll={handlePlayAll}
          onPause={handlePause}
          onReset={handleReset}
          onNextLine={handleNextLine}
          onPrevLine={handlePrevLine}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('dialogue')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'dialogue'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Dialogue & Audio (劇本對白)</span>
          </button>

          <button
            onClick={() => setActiveTab('roleplay')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'roleplay'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Role-Play Mode (分角口語練習)</span>
          </button>

          <button
            onClick={() => setActiveTab('vocabulary')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'vocabulary'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>3. Vocabulary (核心字彙)</span>
            <span className="text-xs px-1.5 py-0.2 bg-slate-100 rounded-full text-slate-600">
              {script.vocabulary.length}
            </span>
          </button>

        </div>

        {/* Tab Content */}
        {activeTab === 'dialogue' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>💡 點選句子中黃色高亮的單字，可即時查看 A2 單字解析與發音。</span>
              <span className="font-mono">共 {script.lines.length} 句對白</span>
            </div>

            <div className="space-y-3.5">
              {script.lines.map((line, idx) => (
                <DialogueLineCard
                  key={line.id}
                  line={line}
                  index={idx}
                  isActive={isPlaying && currentLineIndex === idx}
                  isLoading={isLoadingAudio && currentLineIndex === idx}
                  showChinese={showChinese}
                  onPlayLine={(l, i) => playLine(l, i, false)}
                  onWordClick={handleWordClick}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'roleplay' && (
          <RoleplayPractice
            lines={script.lines}
            onPlayLineAudio={(line) => playLine(line, script.lines.findIndex((l) => l.id === line.id), false)}
            isGeneratingAudio={isLoadingAudio}
            isAudioPlaying={isPlaying}
            playingLineIndex={currentLineIndex}
          />
        )}

        {activeTab === 'vocabulary' && (
          <VocabularySection
            vocabulary={script.vocabulary}
            onPlayWord={handlePlayWord}
          />
        )}

      </main>

      {/* Vocabulary Modal Popup */}
      <VocabularyModal
        item={selectedVocabWord}
        onClose={() => setSelectedVocabWord(null)}
        onPlayWord={handlePlayWord}
      />

      {/* Worksheet Modal */}
      <WorksheetExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        script={script}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <p>
          A2 English Dialogue Learner • Audio and practice run in your browser.
        </p>
      </footer>
    </div>
  );
}
