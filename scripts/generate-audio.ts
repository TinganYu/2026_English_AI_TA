import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getScriptById, scripts } from '../src/data/scripts';
import { DialogueScript } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const voices = {
  Puck: 'am_puck',
  Kore: 'af_heart',
} as const;
const generationSpeed = 1.0;

function getRequestedScriptId(): string {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: npm run generate-audio -- --script <script-id>');
    console.log(`Available scripts: ${Object.keys(scripts).join(', ')}`);
    process.exit(0);
  }

  const scriptFlagIndex = process.argv.indexOf('--script');
  if (scriptFlagIndex === -1) {
    return Object.keys(scripts)[0];
  }

  const scriptId = process.argv[scriptFlagIndex + 1];
  if (!scriptId || scriptId.startsWith('--')) {
    throw new Error(
      `Missing script ID after --script. Available scripts: ${Object.keys(scripts).join(', ')}`
    );
  }

  return scriptId;
}

async function generateAudio(script: DialogueScript) {
  const outputDirectory = path.join(projectRoot, 'public', 'audio', script.id);
  const manifestPath = path.join(outputDirectory, 'manifest.json');
  const { KokoroTTS } = await import('kokoro-js');
  console.log('Loading Kokoro model...');
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
    dtype: 'q8',
  });

  await mkdir(outputDirectory, { recursive: true });
  const manifest: Record<string, { file: string; text: string; voice: string; speed: number }> = {};

  for (const line of script.lines) {
    const voice = voices[line.voice as keyof typeof voices] || 'am_puck';
    const fileName = `${line.id}.wav`;
    const outputPath = path.join(outputDirectory, fileName);
    const existingManifest = await readManifest(manifestPath);

    if (
      existingManifest?.[line.id]?.text === line.text &&
      existingManifest[line.id].voice === voice &&
      existingManifest[line.id].speed === generationSpeed
    ) {
      manifest[line.id] = existingManifest[line.id];
      console.log(`Skipped ${fileName} (unchanged)`);
      continue;
    }

    console.log(`Generating ${fileName} with ${voice}...`);
    const audio = await tts.generate(line.text, { voice, speed: generationSpeed });
    const buffer = Buffer.from(await (await audio.toBlob()).arrayBuffer());
    await writeFile(outputPath, buffer);
    manifest[line.id] = { file: fileName, text: line.text, voice, speed: generationSpeed };
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Generated audio in ${path.relative(projectRoot, outputDirectory)}`);
}

async function readManifest(filePath: string) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as Record<
      string,
      { file: string; text: string; voice: string; speed: number }
    >;
  } catch {
    return null;
  }
}

const requestedScriptId = getRequestedScriptId();
const requestedScript = getScriptById(requestedScriptId);

if (!requestedScript) {
  console.error(
    `Unknown script ID "${requestedScriptId}". Available scripts: ${Object.keys(scripts).join(', ')}`
  );
  process.exitCode = 1;
} else {
  generateAudio(requestedScript).catch((error) => {
  console.error('Audio generation failed:', error);
  process.exitCode = 1;
  });
}
