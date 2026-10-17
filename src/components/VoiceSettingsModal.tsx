import React, { useState, useEffect } from 'react';
import { X, Volume2, Sliders, CheckCircle2, Loader2 } from 'lucide-react';
import { getEnglishVoices } from '../services/ttsService';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccent: 'us' | 'uk';
  alexVoice: string;
  emmaVoice: string;
  keywordBrowserVoice: string;
  onSaveVoices: (alex: string, emma: string, accent: 'us' | 'uk', keywordBrowserVoice: string) => void;
}

interface NeuralVoiceOption {
  id: string;
  name: string;
  tag: string;
  description: string;
  gender: 'female' | 'male';
  accent: 'us' | 'uk';
  sampleText: string;
}

const US_FEMALE_VOICES: NeuralVoiceOption[] = [
  {
    id: 'en-US-AvaNeural',
    name: 'Ava (微軟現代清脆女聲・首選推薦)',
    tag: '清亮悅耳',
    description: '現代明亮嗓音，清晰度高，發音乾淨俐落，適合課堂聽辨與跟讀練習。',
    gender: 'female',
    accent: 'us',
    sampleText: 'Technology makes reading so convenient and accessible for everyone.',
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (微軟美式名師・首選推薦)',
    tag: '教學首選',
    description: '咬字極為標準清亮，溫暖親切，發音節奏最適合 A2 英語學習者。',
    gender: 'female',
    accent: 'us',
    sampleText: 'I am reading a science fiction story. An e-reader is very light and easy to hold.',
  },
  {
    id: 'af_heart',
    name: 'Heart (Kokoro-83M 頂級女聲)',
    tag: '💎 開源極致擬真',
    description: '全球開源評分第一！極度逼真的真人氣息與情緒起伏，聽感溫暖動人。',
    gender: 'female',
    accent: 'us',
    sampleText: 'I can carry hundreds of books in my small bag. It is great for traveling!',
  },
  {
    id: 'en-US-AriaNeural',
    name: 'Aria (微軟生動對話音)',
    tag: '生動自然',
    description: '語調富有表現力，像身邊朋友在與你輕鬆聊天，語音起伏極為真人化。',
    gender: 'female',
    accent: 'us',
    sampleText: 'I can carry hundreds of books in my small bag. It is great for traveling!',
  },
  {
    id: 'en-US-EmmaNeural',
    name: 'Emma (微軟同名角色女聲)',
    tag: '柔和氣質',
    description: '音質沉穩柔和，帶有知性平靜感，非常契合喜歡深度閱讀的氣質。',
    gender: 'female',
    accent: 'us',
    sampleText: 'Digital books help me read more every day. I love exploring new stories!',
  },
];

const US_MALE_VOICES: NeuralVoiceOption[] = [
  {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher (微軟知性說書人文雅男聲・推薦)',
    tag: '較自然沉穩',
    description: '醇厚有深度，適合 Alex 紙本書愛好者的文雅說書質感。',
    gender: 'male',
    accent: 'us',
    sampleText: 'Turning real pages and looking at a beautiful cover is an important part of reading for me.',
  },
  {
    id: 'en-US-AndrewNeural',
    name: 'Andrew (微軟輕鬆日常美式男聲)',
    tag: '生活自然',
    description: '自然生活化的美語男聲，適合一般對話與跟讀練習。',
    gender: 'male',
    accent: 'us',
    sampleText: 'My favorite genre is mystery. I love finding clues on the paper pages.',
  },
  {
    id: 'en-US-BrianNeural',
    name: 'Brian (微軟溫和美式男聲)',
    tag: '溫和清楚',
    description: '音色較柔和，適合短句、跟讀與課堂練習。',
    gender: 'male',
    accent: 'us',
    sampleText: 'I enjoy listening to stories and learning new words every day.',
  },
  {
    id: 'am_puck',
    name: 'Puck (Kokoro-83M 自然男聲)',
    tag: '💎 開源男聲',
    description: '自然男子嗓音，具備明顯的呼吸感與停頓。',
    gender: 'male',
    accent: 'us',
    sampleText: 'I love physical books because they give me a calm reading experience. I love the smell of paper.',
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (微軟標準美式男聲)',
    tag: '備選',
    description: '標準美式男聲；如果覺得音色生硬，可以改用其他選項。',
    gender: 'male',
    accent: 'us',
    sampleText: 'I love physical books because they give me a calm reading experience. I love the smell of paper.',
  },
];

const UK_VOICES: NeuralVoiceOption[] = [
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia (英式標準女聲)',
    tag: '英式首選',
    description: '純正英格蘭腔調，優雅沉著，發音端正。',
    gender: 'female',
    accent: 'uk',
    sampleText: 'An e-reader is very light and easy to hold during long train journeys.',
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan (英式自然男聲)',
    tag: '英式首選',
    description: '自然英國紳士嗓音，慢速清晰。',
    gender: 'male',
    accent: 'uk',
    sampleText: 'Physical books give me a calm reading experience away from mobile devices.',
  },
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  currentAccent,
  alexVoice,
  emmaVoice,
  keywordBrowserVoice,
  onSaveVoices,
}) => {
  const [accent, setAccent] = useState<'us' | 'uk'>(currentAccent);
  const [selectedAlex, setSelectedAlex] = useState(
    alexVoice === 'en-US-GuyNeural' ? 'en-US-ChristopherNeural' : alexVoice || 'en-US-ChristopherNeural'
  );
  const [selectedEmma, setSelectedEmma] = useState(emmaVoice || 'en-US-JennyNeural');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedKeywordBrowserVoice, setSelectedKeywordBrowserVoice] = useState(keywordBrowserVoice);
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const audioPlayerRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAccent(currentAccent);
      setSelectedAlex(
        alexVoice === 'en-US-GuyNeural'
          ? 'en-US-ChristopherNeural'
          : alexVoice || (currentAccent === 'uk' ? 'en-GB-RyanNeural' : 'en-US-ChristopherNeural')
      );
      setSelectedEmma(emmaVoice || (currentAccent === 'uk' ? 'en-GB-SoniaNeural' : 'en-US-JennyNeural'));
      setBrowserVoices(getEnglishVoices());
      setSelectedKeywordBrowserVoice(keywordBrowserVoice);
    }
  }, [isOpen, currentAccent, alexVoice, emmaVoice, keywordBrowserVoice]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    const updateBrowserVoices = () => setBrowserVoices(getEnglishVoices());
    window.speechSynthesis.addEventListener('voiceschanged', updateBrowserVoices);
    updateBrowserVoices();
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateBrowserVoices);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestVoice = async (voice: NeuralVoiceOption) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setTestingVoiceId(voice.id);
    try {
      const isKokoro = voice.id.startsWith('af_') || voice.id.startsWith('am_') || voice.id.startsWith('bf_') || voice.id.startsWith('bm_');
      const endpoint = isKokoro ? '/api/kokoro-tts' : '/api/neural-tts';
      const payload = isKokoro
        ? { text: voice.sampleText, speaker: voice.gender === 'female' ? 'Emma' : 'Alex', voice: voice.id, slowPace: true }
        : { text: voice.sampleText, speaker: voice.gender === 'female' ? 'Emma' : 'Alex', accent: voice.accent, slowPace: true, specificVoice: voice.id };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:${data.mimeType || 'audio/mp3'};base64,${data.audioBase64}`);
        audioPlayerRef.current = audio;
        audio.onended = () => setTestingVoiceId(null);
        audio.onerror = () => setTestingVoiceId(null);
        await audio.play();
      } else {
        setTestingVoiceId(null);
      }
    } catch (e) {
      console.warn('Test audio failed:', e);
      setTestingVoiceId(null);
    }
  };

  const handleSave = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    onSaveVoices(selectedAlex, selectedEmma, accent, selectedKeywordBrowserVoice);
    onClose();
  };

  const selectVoice = (voice: NeuralVoiceOption, speaker: 'Alex' | 'Emma') => {
    if (speaker === 'Alex') {
      setSelectedAlex(voice.id);
    } else {
      setSelectedEmma(voice.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">美國腔真人發音庫設定</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                可選擇 AI、Kokoro 或裝置上的瀏覽器音色，提供清晰慢速發音
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (audioPlayerRef.current) audioPlayerRef.current.pause();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accent Selector Tabs */}
        <div className="flex items-center justify-between p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setAccent('us');
              setSelectedEmma('en-US-JennyNeural');
              setSelectedAlex('en-US-ChristopherNeural');
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              accent === 'us'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🇺🇸 美國腔調（American English・首選推薦）</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAccent('uk');
              setSelectedEmma('en-GB-SoniaNeural');
              setSelectedAlex('en-GB-RyanNeural');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              accent === 'uk'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🇬🇧 英格蘭腔（British）</span>
          </button>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm font-bold text-indigo-950">關鍵字發音</p>
          <p className="mt-1 text-xs text-indigo-800/80">
            使用你選擇的瀏覽器音色，速度會自動放慢，不使用 AI 額度。
          </p>
          {browserVoices.length > 0 && (
            <select
              value={selectedKeywordBrowserVoice}
              onChange={(event) => setSelectedKeywordBrowserVoice(event.target.value)}
              className="mt-3 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-700"
            >
              <option value="">自動選擇瀏覽器英文音色</option>
              {browserVoices.map((voice) => (
                <option key={`keyword-${voice.name}`} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Voice Selection Section */}
        {accent === 'us' ? (
          <div className="space-y-6">
            {/* Emma Section (US Female) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                    👩‍💼
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Emma 美式女聲
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      點擊卡片選取，點擊試聽按鈕即可聆聽真實語音
                    </p>
                  </div>
              </div>
              </div>
              {browserVoices.length > 0 && (
                  <select
                    value={selectedEmma.startsWith('browser:') ? selectedEmma : ''}
                    onChange={(event) => setSelectedEmma(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  >
                    <option value="">瀏覽器音色（選擇可改用本機語音）</option>
                    {browserVoices.map((voice) => (
                      <option key={`emma-${voice.name}`} value={`browser:${voice.name}`}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {US_FEMALE_VOICES.map((v) => {
                  const isSelected = selectedEmma === v.id;
                  const isTesting = testingVoiceId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => selectVoice(v, 'Emma')}
                      className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            {v.name}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {v.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug mb-3">
                          {v.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoice(v);
                          }}
                          disabled={isTesting}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 text-[11px] font-semibold transition-colors"
                        >
                          {isTesting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                              <span>播放中...</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>試聽發音</span>
                            </>
                          )}
                        </button>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>使用中</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alex Section (US Male) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center text-sm font-bold">
                    👨‍💼
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Alex 美式男聲
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      標準美式發音，適合咬字與跟讀練習
                    </p>
                  </div>
                </div>
                </div>
                {browserVoices.length > 0 && (
                  <select
                    value={selectedAlex.startsWith('browser:') ? selectedAlex : ''}
                    onChange={(event) => setSelectedAlex(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  >
                    <option value="">瀏覽器音色（選擇可改用本機語音）</option>
                    {browserVoices.map((voice) => (
                      <option key={`alex-${voice.name}`} value={`browser:${voice.name}`}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {US_MALE_VOICES.map((v) => {
                  const isSelected = selectedAlex === v.id;
                  const isTesting = testingVoiceId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => selectVoice(v, 'Alex')}
                      className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            {v.name}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                              isSelected
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {v.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug mb-3">
                          {v.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoice(v);
                          }}
                          disabled={isTesting}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/80 hover:bg-amber-200 text-amber-900 text-[11px] font-semibold transition-colors"
                        >
                          {isTesting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                              <span>播放中...</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                              <span>試聽發音</span>
                            </>
                          )}
                        </button>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>使用中</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* UK Accent Section */
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <span>🇬🇧 英格蘭標準真聲（Sonia & Ryan）</span>
              </h4>
              <p className="text-xs text-indigo-900/80 mt-1 leading-relaxed">
                標準英國 RP 腔調，音質同樣是由神經網路直接合成，完全無機械音。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UK_VOICES.map((v) => {
                const isTesting = testingVoiceId === v.id;
                return (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-white border border-indigo-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{v.name}</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                        {v.gender === 'female' ? 'Emma 角色' : 'Alex 角色'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{v.description}</p>
                    <button
                      type="button"
                      onClick={() => handleTestVoice(v)}
                      disabled={isTesting}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>播放試聽中...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>試聽 {v.name}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-3.5 bg-slate-50 rounded-2xl text-[11px] text-slate-600 leading-relaxed border border-slate-200">
          語音自然度會依瀏覽器、裝置與所選音色而不同；AI 語音也可能偶爾出現機器感或發音不自然的情況。
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (audioPlayerRef.current) audioPlayerRef.current.pause();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>套用美國腔發音設定</span>
          </button>
        </div>
      </div>
    </div>
  );
};
