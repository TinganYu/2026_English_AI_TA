// Service to manage Text-to-Speech using Gemini 3.8 Flash TTS with persistent IndexedDB caching and quota management

const DB_NAME = 'A2BookDialogueTTS_DB';
const DB_VERSION = 3; // Upgraded to v3 for Neural High-Fidelity Audio
const STORE_NAME = 'audio_cache';

// In-memory fallback
const memoryCache = new Map<string, string>();

function getCacheVoiceId(
  speaker: string,
  voice: string | undefined,
  engine: 'neural' | 'kokoro' | 'gemini' | 'browser',
  specificVoice?: string
): string {
  const isKokoroVoice =
    specificVoice?.startsWith('af_') ||
    specificVoice?.startsWith('am_') ||
    specificVoice?.startsWith('bf_') ||
    specificVoice?.startsWith('bm_');

  if (engine === 'kokoro') {
    return isKokoroVoice ? specificVoice! : speaker === 'Emma' ? 'af_heart' : 'am_puck';
  }

  return specificVoice || voice || speaker || 'default';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedAudio(key: string): Promise<string | null> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) {
          memoryCache.set(key, req.result);
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCachedAudio(key: string, dataUrl: string): Promise<void> {
  memoryCache.set(key, dataUrl);
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(dataUrl, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save to IndexedDB:', err);
  }
}

export async function clearAllCachedAudio(): Promise<void> {
  memoryCache.clear();
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch (err) {
    console.warn('Could not clear IndexedDB:', err);
  }
}

export async function checkAudioCached(
  speaker: string,
  voice: string | undefined,
  slowPace: boolean,
  text: string,
  engine: 'neural' | 'kokoro' | 'gemini' | 'browser' = 'neural',
  accent: 'us' | 'uk' = 'us',
  specificVoice?: string
): Promise<boolean> {
  const voiceId = getCacheVoiceId(speaker, voice, engine, specificVoice);
  const key = `${engine}:${accent}:${voiceId}:${slowPace ? 'slow' : 'normal'}:${text}`;
  const cached = await getCachedAudio(key);
  return Boolean(cached);
}

export interface TTSRequestOptions {
  text: string;
  speaker: string;
  voice?: string;
  slowPace?: boolean;
  engine?: 'neural' | 'kokoro' | 'gemini' | 'browser';
  accent?: 'us' | 'uk';
  specificVoice?: string;
  staticAudioUrl?: string;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const populate = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  populate();
  window.speechSynthesis.onvoiceschanged = populate;
}

export async function requestSingleLineTTS(options: TTSRequestOptions): Promise<{
  audioUrl: string;
  isCached: boolean;
  isFallback?: boolean;
  quotaExceeded?: boolean;
}> {
  const {
    text,
    speaker,
    voice,
    slowPace = true,
    engine = 'neural',
    accent = 'us',
    specificVoice,
    staticAudioUrl,
  } = options;

  if (engine === 'browser') {
    return { audioUrl: '', isCached: false, isFallback: true };
  }

  // Packaged lesson audio is the Kokoro voice for the default script. Only use
  // it when Kokoro is selected so another engine can replace the audio.
  if (engine === 'kokoro' && staticAudioUrl) {
    try {
      const response = await fetch(staticAudioUrl, { method: 'HEAD' });
      if (response.ok) {
        return { audioUrl: staticAudioUrl, isCached: true };
      }
    } catch {
      // Fall through to the on-demand Kokoro path when no packaged file exists.
    }
  }

  const voiceId = getCacheVoiceId(speaker, voice, engine, specificVoice);
  const cacheKey = `${engine}:${accent}:${voiceId}:${slowPace ? 'slow' : 'normal'}:${text}`;

  // 1. Check persistent IndexedDB & memory cache
  const existing = await getCachedAudio(cacheKey);
  if (existing) {
    return { audioUrl: existing, isCached: true };
  }

  // 2. If Kokoro-83M Open-Source AI TTS Engine or Kokoro voice selected
  const isKokoroVoice = specificVoice?.startsWith('af_') || specificVoice?.startsWith('am_') || specificVoice?.startsWith('bf_') || specificVoice?.startsWith('bm_');
  if (engine === 'kokoro' || isKokoroVoice) {
    try {
      // Kokoro has its own voice IDs; Neural/Gemini names such as Puck or
      // en-US-GuyNeural are not valid Kokoro voices.
      const kokoroVoice =
        isKokoroVoice
          ? specificVoice
          : speaker === 'Emma'
            ? 'af_heart'
            : 'am_puck';
      const response = await fetch('/api/kokoro-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speaker,
          voice: kokoroVoice,
          slowPace,
        }),
      });

      if (!response.ok) {
        throw new Error(`Kokoro TTS error: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioBase64) {
        throw new Error('No audio returned from Kokoro TTS service.');
      }

      const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      await saveCachedAudio(cacheKey, audioUrl);
      return { audioUrl, isCached: false };
    } catch (kokoroErr) {
      console.warn('Kokoro TTS failed, trying Neural TTS fallback:', kokoroErr);
      // Fallback to neural
      try {
        const fallbackRes = await fetch('/api/neural-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, speaker, accent: 'us', slowPace }),
        });
        const fbData = await fallbackRes.json();
        if (fbData.audioBase64) {
          const audioUrl = `data:${fbData.mimeType || 'audio/mp3'};base64,${fbData.audioBase64}`;
          await saveCachedAudio(cacheKey, audioUrl);
          return { audioUrl, isCached: false };
        }
      } catch {}
      return { audioUrl: '', isCached: false, isFallback: true };
    }
  }

  // 3. If Neural AI Engine (US / UK High Fidelity Studio Voice, 0 Token Quota)
  if (engine === 'neural') {
    try {
      const response = await fetch('/api/neural-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speaker,
          accent,
          slowPace,
          specificVoice,
        }),
      });

      if (!response.ok) {
        throw new Error(`Neural TTS error: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioBase64) {
        throw new Error('No audio returned from Neural TTS service.');
      }

      const audioUrl = `data:${data.mimeType || 'audio/mp3'};base64,${data.audioBase64}`;
      await saveCachedAudio(cacheKey, audioUrl);
      return { audioUrl, isCached: false };
    } catch (neuralErr) {
      console.warn('Neural TTS failed, falling back:', neuralErr);
      return { audioUrl: '', isCached: false, isFallback: true };
    }
  }

  // 3. If Gemini 3.8 Flash TTS Engine
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        speaker,
        voice,
        slowPace,
        accent,
        specificVoice,
        multiSpeaker: false,
      }),
    });

    if (response.status === 429) {
      console.warn('Google Free Tier quota exceeded (10 calls/day limit reached).');
      return { audioUrl: '', isCached: false, isFallback: true, quotaExceeded: true };
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `TTS server error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.audioBase64) {
      throw new Error('No audio received from TTS service.');
    }

    const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
    await saveCachedAudio(cacheKey, audioUrl);
    return { audioUrl, isCached: false };
  } catch (err: any) {
    console.warn('Gemini 3.8 Flash TTS call failed:', err);
    return {
      audioUrl: '',
      isCached: false,
      isFallback: true,
      quotaExceeded: err?.message?.includes('429') || err?.message?.includes('quota'),
    };
  }
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices.filter((v) => v.lang.startsWith('en'));
}

// Fallback using HTML5 SpeechSynthesis (Free forever, zero AI quota)
export function speakWithBrowserSynthesis(
  text: string,
  speaker: string,
  rate = 0.75, // Extra slow and calm for A2 students
  onEnd?: () => void,
  customVoiceName?: string
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return () => {};
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Math.max(0.65, Math.min(1.0, rate)); // Ensure student-friendly slow pace
  utterance.pitch = speaker === 'Emma' ? 1.05 : 0.92;
  utterance.lang = 'en-US';

  // Get current voice list
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }

  const isEmma = speaker === 'Emma';
  const englishVoices = cachedVoices.filter((v) => v.lang.startsWith('en'));

  let chosenVoice: SpeechSynthesisVoice | undefined;

  if (customVoiceName) {
    const browserVoiceName = customVoiceName.startsWith('browser:')
      ? customVoiceName.slice('browser:'.length)
      : customVoiceName;
    chosenVoice = englishVoices.find((v) => v.name === browserVoiceName);
  }

  if (!chosenVoice) {
    if (isEmma) {
      // Prioritize Google US English, Natural, Samantha, Jenny, Aria (strictly avoid robotic Zira Desktop)
      chosenVoice =
        englishVoices.find((v) => /google.*us.*english|natural.*(jenny|aria|samantha)/i.test(v.name)) ||
        englishVoices.find((v) => /google.*english/i.test(v.name)) ||
        englishVoices.find((v) => /samantha|jenny|aria|victoria|karen/i.test(v.name) && !v.name.includes('Desktop')) ||
        englishVoices.find((v) => !v.name.includes('Desktop') && !v.name.includes('Zira')) ||
        englishVoices.find((v) => /female/i.test(v.name)) ||
        englishVoices[0];
    } else {
      // Prioritize natural male voices
      chosenVoice =
        englishVoices.find((v) => /natural.*(guy|david|ryan)|google.*male/i.test(v.name)) ||
        englishVoices.find((v) => /google.*us.*english/i.test(v.name)) ||
        englishVoices.find((v) => /david|guy|mark|alex|daniel/i.test(v.name)) ||
        englishVoices[0];
    }
  }

  if (chosenVoice) {
    utterance.voice = chosenVoice;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}
