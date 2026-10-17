import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Volume2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Tablet,
  Loader2,
  AlertCircle,
  ExternalLink,
  Timer,
} from 'lucide-react';
import { DialogueLine } from '../types';
import { speakWithBrowserSynthesis } from '../services/ttsService';

interface SpeechRecognitionEventLike extends Event {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface RoleplayPracticeProps {
  lines: DialogueLine[];
  onPlayLineAudio: (line: DialogueLine) => Promise<void>;
  isGeneratingAudio: boolean;
}

export const RoleplayPractice: React.FC<RoleplayPracticeProps> = ({
  lines,
  onPlayLineAudio,
  isGeneratingAudio,
}) => {
  const [selectedRole, setSelectedRole] = useState<'Alex' | 'Emma'>('Emma');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const [completedScores, setCompletedScores] = useState<Record<number, number>>({});
  const [selfPracticeActive, setSelfPracticeActive] = useState<boolean>(false);
  const [selfPracticeSeconds, setSelfPracticeSeconds] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const isRecordingRef = useRef(false);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  const currentLine = lines[currentStepIndex];
  const isStudentTurn = currentLine?.speaker === selectedRole;
  const partnerRole = selectedRole === 'Alex' ? 'Emma' : 'Alex';
  const normalizeToken = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9']/g, '');
    const contraction = {
      "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is',
      "it's": 'it is', "we're": 'we are', "they're": 'they are', "that's": 'that is',
      "can't": 'cannot', "don't": 'do not', "doesn't": 'does not', "isn't": 'is not',
      "aren't": 'are not',
    }[normalized];
    return contraction || normalized;
  };
  const expandTokens = (text: string) =>
    text.split(/\s+/).flatMap((word) => normalizeToken(word).split(/\s+/)).filter(Boolean);
  const targetTokens = expandTokens(currentLine?.text || '');
  const recognizedTokens = expandTokens(transcript);
  const matchedTargetIndexes = targetTokens.reduce<number[]>((matches, token, targetIndex) => {
    const previousMatch = matches.length ? matches[matches.length - 1] : -1;
    const matchIndex = recognizedTokens.findIndex(
      (recognized, index) =>
        index > previousMatch &&
        (recognized === token || recognized.startsWith(token) || token.startsWith(recognized))
    );
    if (matchIndex >= 0) matches.push(targetIndex);
    return matches;
  }, []);
  const matchingTokenCount = matchedTargetIndexes.length;
  const practiceScore = targetTokens.length
    ? Math.round((matchingTokenCount / targetTokens.length) * 100)
    : 0;
  const practicePassed = Boolean(transcript.trim()) && practiceScore >= 50;
  const studentLineIndexes = lines
    .map((line, index) => (line.speaker === selectedRole ? index : -1))
    .filter((index) => index >= 0);
  const completedStudentScores = studentLineIndexes
    .map((index) => completedScores[index])
    .filter((score): score is number => typeof score === 'number');
  const overallScores = studentLineIndexes
    .map((index) => (index === currentStepIndex ? practiceScore : completedScores[index]))
    .filter((score): score is number => typeof score === 'number');
  const studentScoreRows = studentLineIndexes
    .map((index) => ({
      index,
      line: lines[index],
      score: index === currentStepIndex ? practiceScore : completedScores[index],
    }))
    .filter((row): row is { index: number; line: DialogueLine; score: number } =>
      typeof row.score === 'number'
    );
  const isPracticeComplete =
    currentStepIndex === lines.length - 1 &&
    completedStudentScores.length === studentLineIndexes.length;

  useEffect(() => {
    if (!isRecording && isStudentTurn && transcript.trim()) {
      setCompletedScores((scores) => ({ ...scores, [currentStepIndex]: practiceScore }));
    }
  }, [currentStepIndex, isRecording, isStudentTurn, practiceScore, transcript]);

  // Cleanup on unmount or step change
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      stopAudioMonitoring();
      stopSpeechRecognition();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [recordedAudioUrl]);

  const stopAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.onend = null;
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSttError('此瀏覽器不支援即時語音辨識；仍可使用錄音與播放功能。建議使用最新版 Chrome 或 Edge。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };
    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setSttError(`語音辨識暫時無法使用：${event.error}`);
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      // Mobile browsers may ask for microphone permission again when an
      // ended recognition session is started automatically.
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setSttError('語音辨識無法啟動；仍可使用錄音與播放功能。');
    }
  };

  const handleStartRecording = async () => {
    setMicError(null);
    setSttError(null);
    setTranscript('');
    setRecordedAudioUrl(null);
    stopAudioMonitoring();
    stopSpeechRecognition();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError(
        '您的瀏覽器環境未開放 mediaDevices 錄音 API（通常發生在特定 iFrame 限制或非 HTTPS 環境中）。您可以點擊右上角在新分頁開啟，或使用右側的「免麥克風口說計時模式」。'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Setup audio level visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }
      } catch (e) {
        console.warn('Audio level visualizer not supported', e);
      }

      // Check supported mime types
      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        }
      }

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopAudioMonitoring();
        setAudioLevel(0);
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          const url = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(url);
        }
        // stop all microphone tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200); // 200ms slices
      isRecordingRef.current = true;
      setIsRecording(true);
      startSpeechRecognition();
    } catch (err: any) {
      console.error('Microphone error:', err);
      stopAudioMonitoring();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError(
          '麥克風權限被瀏覽器封鎖。請在瀏覽器網址列左側點擊「鎖頭 / 網站設定」允許麥克風權限，或直接在獨立分頁中開啟本應用程式。'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicError('未檢測到可用的麥克風裝置，請確認音訊輸入線路已插好。');
      } else {
        setMicError(`麥克風存取失敗：${err.message || '未知錯誤'}`);
      }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      stopSpeechRecognition();
      mediaRecorderRef.current.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
      setCompletedScores((scores) => ({ ...scores, [currentStepIndex]: practiceScore }));
    }
  };

  const handlePlayRecordedAudio = () => {
    if (recordedAudioUrl) {
      if (!recordedAudioPlayerRef.current) {
        recordedAudioPlayerRef.current = new Audio(recordedAudioUrl);
      } else {
        recordedAudioPlayerRef.current.src = recordedAudioUrl;
      }
      recordedAudioPlayerRef.current.play();
    }
  };

  const handlePlayPracticeWord = (word: string) => {
    speakWithBrowserSynthesis(word, selectedRole, 0.7);
  };

  // Self Practice Timer mode (for cases without mic hardware)
  const handleStartSelfPractice = () => {
    setSelfPracticeActive(true);
    setSelfPracticeSeconds(6);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setSelfPracticeSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          setSelfPracticeActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAdvanceStep = () => {
    if (isStudentTurn && practiceScore < 50) {
      setSttError('目前未達 50%，請再試一次或點擊紅色文字練習。');
      return;
    }
    if (isStudentTurn) {
      setCompletedScores((scores) => ({ ...scores, [currentStepIndex]: practiceScore }));
    }
    stopSpeechRecognition();
    setRecordedAudioUrl(null);
    setTranscript('');
    setSttError(null);
    setCompletedScores({});
    setSelfPracticeActive(false);
    if (currentStepIndex < lines.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      if (lines[nextIndex].speaker !== selectedRole) {
        onPlayLineAudio(lines[nextIndex]);
      }
    }
  };

  const handleSelectRole = (role: 'Alex' | 'Emma') => {
    setSelectedRole(role);
    setCurrentStepIndex(0);
    setRecordedAudioUrl(null);
    setTranscript('');
    setSttError(null);
    setSelfPracticeActive(false);
    if (lines[0]?.speaker !== role) {
      onPlayLineAudio(lines[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Picker Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Interactive Role-Play Practice (角色扮演開口練習)
        </h3>
        <p className="text-sm text-slate-600 mb-5">
          選擇您要扮演的角色。輪到對手時播放預先準備的示範音檔，輪到您時可同時錄音與使用 STT 練習！
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleSelectRole('Alex')}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              selectedRole === 'Alex'
                ? 'border-amber-500 bg-amber-50/70 shadow-md ring-2 ring-amber-400/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            } cursor-pointer`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg">
                👨‍💼
              </span>
              <div>
                <h4 className="font-bold text-slate-900">扮演 Alex (紙本書愛好者)</h4>
                <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Physical Book & Mystery Fan
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              練習朗讀有關喜愛紙張觸感、平靜放鬆與懸疑小說的台詞。
            </p>
          </button>

          <button
            onClick={() => handleSelectRole('Emma')}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              selectedRole === 'Emma'
                ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-400/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            } cursor-pointer`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                👩‍💼
              </span>
              <div>
                <h4 className="font-bold text-slate-900">扮演 Emma (數位閱讀愛好者)</h4>
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <Tablet className="w-3 h-3" />
                  Digital E-reader & Sci-Fi Fan
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              練習朗讀有關隨身攜帶電子書、通勤閱讀與科幻小說的台詞。
            </p>
          </button>
        </div>
      </div>

      {/* Mic permission diagnostic alert if error occurs */}
      {micError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="font-semibold text-amber-950">麥克風狀態提示：</p>
            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">{micError}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleStartRecording}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
              >
                再次嘗試啟用麥克風
              </button>
              <button
                onClick={handleStartSelfPractice}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-400 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors"
              >
                改用免麥克風「自讀計時練習」
              </button>
            </div>
          </div>
        </div>
      )}
      {isPracticeComplete && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
          <h3 className="text-xl font-bold text-emerald-900">口說練習完成！</h3>
          <p className="mt-2 text-sm text-emerald-800">
            整體成績：
            <span className="ml-2 text-2xl font-extrabold">
              {Math.round(overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length)}%
            </span>
          </p>
          <div className="mt-5 text-left rounded-2xl bg-white/70 border border-emerald-200 p-4">
            <h4 className="text-sm font-bold text-emerald-900 mb-3">每一句成績</h4>
            <div className="space-y-2">
              {studentScoreRows.map(({ index, line, score }) => (
                <div
                  key={line.id}
                  className="flex items-center gap-3 text-sm text-emerald-950"
                >
                  <span className="w-12 shrink-0 font-semibold">第 {index + 1} 句</span>
                  <span className="flex-1 truncate" title={line.text}>
                    {line.text}
                  </span>
                  <span className="font-bold">{score}%</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            這是文字辨識練習分數，不是專業發音評分。
          </p>
        </div>
      )}

      {/* Practice Stage Card */}
      {currentLine && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
          {/* Top Bar with Step */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <span className="text-xs uppercase font-semibold tracking-wider text-indigo-400">
              第 {currentStepIndex + 1} / {lines.length} 回合
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  isStudentTurn
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                }`}
              >
                {isStudentTurn ? `👉 輪到您開口朗讀 (${selectedRole})` : `🎧 請聆聽對手 (${partnerRole})`}
              </span>
            </div>
          </div>

          {/* Dialogue display */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentLine.avatar}</span>
              <div>
                <h4 className="font-bold text-lg text-slate-100">{currentLine.speaker}</h4>
                <p className="text-xs text-slate-400">
                  {isStudentTurn ? '請放慢語速，大聲朗讀下方句子：' : '夥伴示範發音（預先準備音檔）'}
                </p>
              </div>
            </div>

            <div
              className={`p-6 rounded-2xl border text-xl sm:text-2xl font-medium leading-relaxed transition-all ${
                isStudentTurn
                  ? 'bg-amber-950/25 border-amber-500/50 text-amber-100 ring-2 ring-amber-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-200'
              }`}
            >
              &quot;
              {(() => {
                let wordIndex = 0;
                return currentLine.text.split(/(\s+)/).map((part, index) => {
                if (/^\s+$/.test(part)) return part;
                const token = normalizeToken(part);
                const isCorrect = Boolean(transcript) && matchedTargetIndexes.includes(wordIndex);
                wordIndex += 1;
                const hasResult = Boolean(transcript);
                return (
                  <button
                    key={`${part}-${index}`}
                    type="button"
                    onClick={() => handlePlayPracticeWord(part)}
                    className={`transition-colors hover:underline ${
                      hasResult
                        ? isCorrect
                          ? 'text-emerald-300'
                          : 'text-rose-300 underline decoration-2'
                        : currentLine.highlightWords?.some(
                            (word) => normalizeToken(word) === token
                          )
                          ? 'text-amber-300'
                          : 'text-amber-100'
                    }`}
                    title="點擊播放這個字"
                  >
                    {part}
                  </button>
                );
                });
              })()}
              &quot;
            </div>

            <p className="text-sm text-slate-400 pl-1">
              中文對照：<span className="text-slate-300">{currentLine.chineseText}</span>
            </p>

            {isStudentTurn && (
              <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-300">STT 辨識結果</span>
                  {isListening && (
                    <span className="text-xs text-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      辨識中
                    </span>
                  )}
                  {sttError && (
                    <p className="text-xs text-amber-300">{sttError}</p>
                  )}
                </div>
                <div className="min-h-6 text-sm text-slate-100">
                  {transcript ? (
                    transcript.split(/\s+/).map((word, index) => (
                      <React.Fragment key={`${word}-${index}`}>
                        {index > 0 ? ' ' : ''}
                        <button
                          type="button"
                          onClick={() => handlePlayPracticeWord(word)}
                          className={`hover:underline ${
                            index < recognizedTokens.length && recognizedTokens[index] === targetTokens[index]
                              ? 'text-emerald-300'
                              : 'text-rose-300 underline decoration-2'
                          }`}
                          title="點擊播放這個辨識到的字"
                        >
                          {word}
                        </button>
                      </React.Fragment>
                    ))
                  ) : (
                    '開始錄音後，這裡會顯示你說的英文。'
                  )}
                </div>
                {transcript && (
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className={practicePassed ? 'text-emerald-300' : 'text-rose-300'}>
                      {practiceScore >= 50 ? `${practiceScore}% 通過，可以進入下一句` : `目前 ${practiceScore}%`}
                    </span>
                    <span className="text-slate-400">紅色文字代表需要再練習</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recording & Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
            {/* Listen to the prepared reference pronunciation */}
            <button
              onClick={() => onPlayLineAudio(currentLine)}
              disabled={isGeneratingAudio}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
              title="聆聽標準慢速英語發音"
            >
              {isGeneratingAudio ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-indigo-400" />
              )}
              <span>聽聽慢速示範發音</span>
            </button>

            {/* Practice Options for Student */}
            {isStudentTurn && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Visualizer when recording */}
                {isRecording && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span>收音中</span>
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75"
                        style={{ width: `${Math.max(10, audioLevel)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                  {sttError && (
                    <p className="basis-full text-xs text-amber-300 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {sttError}
                    </p>
                  )}

                  {!isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-red-600/30 transition-transform active:scale-95"
                  >
                    <Mic className="w-4 h-4" />
                    <span>開始錄音 (Record)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border-2 border-red-500 text-red-400 font-semibold text-xs sm:text-sm animate-pulse hover:bg-slate-700"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>完成錄音 (Stop)</span>
                  </button>
                )}

                {/* Self Practice Countdown (Backup without mic) */}
                <button
                  onClick={handleStartSelfPractice}
                  disabled={selfPracticeActive || isRecording}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selfPracticeActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="不想錄音時，可使用計時器自主開口朗讀"
                >
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selfPracticeActive ? `開口練習中 (${selfPracticeSeconds}s)` : '自讀計時'}
                  </span>
                </button>

                {/* Replay student's own recording */}
                {recordedAudioUrl && (
                  <button
                    onClick={handlePlayRecordedAudio}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold border border-amber-500/40 transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>聽我的錄音 (Play My Voice)</span>
                  </button>
                )}
              </div>
            )}

            {/* Advance Button */}
            <button
              onClick={handleAdvanceStep}
              disabled={
                currentStepIndex >= lines.length - 1 ||
                (isStudentTurn && !practicePassed)
              }
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-colors ml-auto"
            >
              <span>
                {currentStepIndex >= lines.length - 1
                  ? '練習完成！'
                  : isStudentTurn && !practicePassed
                    ? '先達到 50% 才能繼續'
                    : '下一句 (Next Turn)'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
