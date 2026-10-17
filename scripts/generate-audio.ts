import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultScript } from '../src/data/defaultScript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(projectRoot, 'public', 'audio', defaultScript.id);
const manifestPath = path.join(outputDirectory, 'manifest.json');
const voices = {
  Alex: 'am_puck',
  Emma: 'af_heart',
} as const;
const generationSpeed = 1.0;

async function generateAudio() {
  const { KokoroTTS } = await import('kokoro-js');
  console.log('Loading Kokoro model...');
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
    dtype: 'q8',
  });

  await mkdir(outputDirectory, { recursive: true });
  const manifest: Record<string, { file: string; text: string; voice: string; speed: number }> = {};

  for (const line of defaultScript.lines) {
    const voice = voices[line.speaker === 'Emma' ? 'Emma' : 'Alex'];
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

generateAudio().catch((error) => {
  console.error('Audio generation failed:', error);
  process.exitCode = 1;
});
