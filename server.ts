import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure kokoro-js voices directory is reachable in node environment
try {
  const nodeModulesVoices = path.resolve(__dirname, 'node_modules/kokoro-js/voices');
  if (fs.existsSync(nodeModulesVoices)) {
    if (!fs.existsSync('/app/voices')) {
      fs.symlinkSync(nodeModulesVoices, '/app/voices');
    }
    if (!fs.existsSync(path.resolve(__dirname, 'voices'))) {
      fs.symlinkSync(nodeModulesVoices, path.resolve(__dirname, 'voices'));
    }
  }
} catch (e: any) {
  // Symlinks may already exist or fail on permission, ignore gracefully
}

let kokoroTtsInstance: any = null;
let kokoroLoadingPromise: Promise<any> | null = null;

async function getKokoroTTS() {
  if (kokoroTtsInstance) return kokoroTtsInstance;
  if (kokoroLoadingPromise) return kokoroLoadingPromise;
  kokoroLoadingPromise = (async () => {
    const { KokoroTTS } = await import('kokoro-js');
    console.log('[Kokoro] Initializing Kokoro-82M ONNX model (q8)...');
    const instance = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8' });
    console.log('[Kokoro] Model loaded successfully.');
    kokoroTtsInstance = instance;
    return instance;
  })();
  return kokoroLoadingPromise;
}

// Helper for Kokoro-83M open-source AI TTS (ultra-realistic, free, 0 quota limit)
async function generateKokoroAudio(
  text: string,
  speaker: string,
  voice?: string,
  slowPace = true
): Promise<{ audioBase64: string; mimeType: string; voiceUsed: string }> {
  const tts = await getKokoroTTS();
  const isEmma = speaker === 'Emma';
  // Kokoro voice IDs use the am_puck identifier for its Puck voice.
  const voiceName = voice || (isEmma ? 'af_heart' : 'am_puck');
  const speed = slowPace ? 0.9 : 1.0;

  const audio = await tts.generate(text, { voice: voiceName, speed });
  const blob = await audio.toBlob();
  const arrayBuffer = await blob.arrayBuffer();

  return {
    audioBase64: Buffer.from(arrayBuffer).toString('base64'),
    mimeType: 'audio/wav',
    voiceUsed: voiceName,
  };
}

// Helper for Neural AI speech (100% human natural sound, zero API quota limit, American & British)
async function generateNeuralAudio(
  text: string,
  speaker: string,
  accent: 'us' | 'uk' = 'us',
  slowPace = true,
  specificVoice?: string
): Promise<{ audioBase64: string; mimeType: string; voiceUsed: string }> {
  const isEmma = speaker === 'Emma';
  let voiceName = specificVoice || '';

  if (!voiceName) {
    if (accent === 'uk') {
      voiceName = isEmma ? 'en-GB-SoniaNeural' : 'en-GB-RyanNeural';
    } else {
      // High-fidelity American Neural Voices: Jenny for Emma, Guy for Alex
      voiceName = isEmma ? 'en-US-JennyNeural' : 'en-US-GuyNeural';
    }
  }

  // Student-friendly comfortable slow pacing for A2
  const rate = slowPace ? '-16%' : '-5%';

  // Retry up to 3 times with progressive backoff to handle transient Edge TTS websocket rate limits
  for (let attempt = 1; attempt <= 3; attempt++) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = await tts.toStream(text, { rate });

      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        audioStream.on('data', (chunk) => chunks.push(chunk));
        audioStream.on('end', () => {
          try {
            tts.close();
          } catch {}
          resolve(Buffer.concat(chunks));
        });
        audioStream.on('error', (err) => {
          try {
            tts.close();
          } catch {}
          reject(err);
        });
      });

      return {
        audioBase64: buffer.toString('base64'),
        mimeType: 'audio/mp3',
        voiceUsed: voiceName,
      };
    } catch (err: any) {
      try {
        tts.close();
      } catch {}
      if (attempt === 3) {
        throw err;
      }
      // Wait before retrying (e.g. 300ms, 600ms)
      await new Promise((r) => setTimeout(r, attempt * 300));
    }
  }

  throw new Error('Neural TTS generation failed after retries.');
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Initialize Gemini API client with required User-Agent
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Keep track of Google TTS quota cooldown to avoid repeating 429 calls and noisy logs
  let ttsQuotaCooldownUntil = 0;

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      ttsModel: 'gemini-3.8-flash-tts',
      textModel: 'gemini-3.8-flash',
      ttsQuotaExceeded: Date.now() < ttsQuotaCooldownUntil,
      hasNeuralTts: true,
      hasKokoroTts: true,
    });
  });

  // Dedicated Kokoro-83M AI Speech endpoint (State-of-the-art open-source neural TTS)
  app.post('/api/kokoro-tts', async (req, res) => {
    const { text, speaker = 'Alex', voice, slowPace = true } = req.body || {};
    try {
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required for TTS.' });
      }

      const audio = await generateKokoroAudio(text, speaker, voice, slowPace);
      res.json(audio);
    } catch (err: any) {
      console.error('Kokoro TTS error:', err?.message || err);
      // Fallback gracefully to Neural TTS if Kokoro encounters an issue
      try {
        console.log('[Kokoro Fallback] Switching to Neural TTS...');
        const fallbackAudio = await generateNeuralAudio(text, speaker, 'us', slowPace);
        res.json(fallbackAudio);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: err?.message || 'Failed to generate Kokoro audio.' });
      }
    }
  });

  // Dedicated Neural Speech endpoint (100% human-like, zero robotic sound, zero quota limits)
  app.post('/api/neural-tts', async (req, res) => {
    try {
      const { text, speaker = 'Alex', accent = 'us', slowPace = true, specificVoice } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required for TTS.' });
      }

      const audio = await generateNeuralAudio(text, speaker, accent, slowPace, specificVoice);
      res.json(audio);
    } catch (err: any) {
      console.error('Neural TTS error:', err?.message || err);
      res.status(500).json({ error: err?.message || 'Failed to generate neural speech.' });
    }
  });

  // Text-to-Speech endpoint with primary gemini-3.8-flash-tts and fallback gemini-3.8-flash-lite-tts
  app.post('/api/tts', async (req, res) => {
    const {
      text,
      speaker = 'Alex',
      voice = 'Puck',
      multiSpeaker = false,
      dialogue = [],
      slowPace = true,
      accent = 'us',
      specificVoice,
    } = req.body || {};

    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
      }

      // If quota was already marked as exceeded recently, deliver high-quality Neural audio directly
      if (Date.now() < ttsQuotaCooldownUntil) {
        try {
          const neuralAudio = await generateNeuralAudio(text, speaker, accent, slowPace, specificVoice);
          return res.json({
            audioBase64: neuralAudio.audioBase64,
            mimeType: neuralAudio.mimeType,
            model: accent === 'uk' ? 'neural-ai-uk' : 'neural-ai-us',
            voiceUsed: neuralAudio.voiceUsed,
          });
        } catch (neuralErr) {
          console.warn('Neural fallback error during cooldown:', neuralErr);
        }
      }

      const pacingHint = slowPace
        ? 'Speak slowly, distinctly, and clearly for A2 ESL language learners. Use a warm, calm, human, and natural rhythm with gentle pauses between ideas.'
        : 'Speak clearly and naturally at an easy, moderate pace for language learners.';

      const chosenVoice = voice || (speaker === 'Emma' ? 'Kore' : 'Puck');

      // 1. Try flagship gemini-3.8-flash-tts
      try {
        if (multiSpeaker && Array.isArray(dialogue) && dialogue.length > 0) {
          const parts = dialogue.map((line: { speaker: string; text: string }) => ({
            text: `${line.speaker}: ${line.text}`,
            speechMetadata: {
              speaker: line.speaker,
              style: `${pacingHint} Speaking naturally as ${line.speaker}.`,
            },
          }));

          const speakers = Array.from(new Set(dialogue.map((l: any) => l.speaker)));
          const speaker1 = speakers[0] || 'Alex';
          const speaker2 = speakers[1] || 'Emma';

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [{ role: 'user', parts }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                multiSpeakerVoiceConfig: {
                  speakerVoiceConfigs: [
                    {
                      speaker: speaker1,
                      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
                    },
                    {
                      speaker: speaker2,
                      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                  ],
                },
              },
            },
          });

          const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
          if (part?.inlineData?.data) {
            return res.json({
              audioBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'audio/wav',
              model: 'gemini-3.8-flash-tts',
            });
          }
        } else {
          if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required for TTS.' });
          }

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: text,
                    speechMetadata: {
                      speaker: speaker,
                      style: `${pacingHint} Speaking as ${speaker}.`,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: chosenVoice },
                },
              },
            },
          });

          const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
          if (part?.inlineData?.data) {
            return res.json({
              audioBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'audio/wav',
              model: 'gemini-3.8-flash-tts',
            });
          }
        }
      } catch (flashErr: any) {
        console.warn(
          'gemini-3.8-flash-tts encountered error/quota limit, seamlessly switching to gemini-3.8-flash-lite-tts:',
          flashErr?.message || flashErr
        );
      }

      // 2. Seamless fallback to gemini-3.8-flash-lite-tts (warm, natural, high quota, zero robotic sound)
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required for TTS.' });
      }

      const liteResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text,
                speechMetadata: {
                  style: `${pacingHint} Character voice for ${speaker}.`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const litePart = liteResponse.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (!litePart?.inlineData?.data) {
        throw new Error('No audio returned by Gemini TTS service.');
      }

      return res.json({
        audioBase64: litePart.inlineData.data,
        mimeType: litePart.inlineData.mimeType || 'audio/wav',
        model: 'gemini-3.8-flash-lite-tts',
      });
    } catch (error: any) {
      const isQuota =
        error?.status === 'RESOURCE_EXHAUSTED' ||
        error?.message?.includes('429') ||
        error?.message?.includes('Quota exceeded') ||
        error?.message?.includes('limit: 10');

      if (isQuota) {
        ttsQuotaCooldownUntil = Date.now() + 30 * 60 * 1000; // 30 min cooldown
        console.log(`[TTS] Google Free Tier limit reached. Seamlessly delivering Neural AI studio voice (${accent.toUpperCase()}).`);
        try {
          const neuralAudio = await generateNeuralAudio(text, speaker, accent, slowPace, specificVoice);
          return res.json({
            audioBase64: neuralAudio.audioBase64,
            mimeType: neuralAudio.mimeType,
            model: accent === 'uk' ? 'neural-ai-uk' : 'neural-ai-us',
            voiceUsed: neuralAudio.voiceUsed,
          });
        } catch (neuralErr) {
          console.warn('Neural fallback error:', neuralErr);
        }

        return res.status(429).json({
          quotaExceeded: true,
          error: 'Google Free Tier 每日 10 次語音限額已達上限。',
        });
      }

      console.error('Error in /api/tts:', error?.message || error);
      res.status(500).json({
        error: error.message || 'Failed to generate speech with Gemini TTS.',
      });
    }
  });

  // Script generation endpoint using gemini-3.8-flash
  app.post('/api/generate-dialogue', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
      }

      const { topic, preferredGenres, habits } = req.body;

      const prompt = `
Create an A2 English dialogue between two friends, Alex and Emma.
Topic: Book genres (e.g. ${preferredGenres || 'mystery vs science fiction'}) and reading habits (digital e-reader vs physical paper books).
They should discuss how their preferences shape their reading experiences.

Level constraints:
- CEFR A2 level: Simple, clean English sentences, high-frequency vocabulary, present simple and past simple, easy conjunctions (because, so, but, also).
- Length: 6 to 8 dialogue turns in total (short and focused so students can practice without feeling overwhelmed).
- Pacing: The lines should sound natural when read slowly.
- Include Traditional Chinese (繁體中文) translation for each line.
- Extract 4 to 6 key A2 vocabulary words with Traditional Chinese translations and simple English definitions.
- Include 3 multiple-choice comprehension questions with options, correct answer index, and explanations.

Return the response strictly adhering to the schema.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert ESL/EFL curriculum developer creating A2-level English dialogues for language students.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              summary: { type: Type.STRING },
              lines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    speaker: { type: Type.STRING },
                    voice: { type: Type.STRING },
                    text: { type: Type.STRING },
                    chineseText: { type: Type.STRING },
                    audioNotes: { type: Type.STRING },
                  },
                  required: ['id', 'speaker', 'text', 'chineseText'],
                },
              },
              vocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    partOfSpeech: { type: Type.STRING },
                    definition: { type: Type.STRING },
                    chineseMeaning: { type: Type.STRING },
                    exampleSentence: { type: Type.STRING },
                  },
                  required: ['word', 'definition', 'chineseMeaning'],
                },
              },
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['question', 'options', 'correctIndex', 'explanation'],
                },
              },
            },
            required: ['title', 'summary', 'lines', 'vocabulary', 'quiz'],
          },
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsedData = JSON.parse(responseText);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating dialogue:', error);
      res.status(500).json({
        error: error.message || 'Failed to generate dialogue with Gemini.',
      });
    }
  });

  // Attach Vite middleware in development or serve static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
