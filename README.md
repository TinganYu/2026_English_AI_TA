<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# A2 English Dialogue Practice

This is a fixed-lesson, browser-only English speaking practice app. Reference
dialogue audio is stored in `public/audio`, so the student version does not
need a server, API key, or database.

## Run Locally

**Prerequisites:** Node.js


1. Install dependencies: `npm install`
2. Start the local development server: `npm run dev`
3. Open the URL shown in the terminal.

## Student features

- Plays the prepared WAV reference audio.
- Records the student's voice locally in the browser and keeps it available
  until the page is closed or the practice step changes.
- Runs browser speech recognition while recording when supported by the browser.
- Shows the live transcript and compares `highlightWords` with the transcript.

Use the latest Chrome or Edge over HTTPS for microphone and speech recognition.
Speech recognition is browser-dependent and is not a pronunciation assessment
service; it converts speech to text for practice feedback.

## GitHub Pages

The repository includes a GitHub Actions workflow in
`.github/workflows/deploy.yml`. Push to `main` and enable GitHub Pages with
**GitHub Actions** as the source. The site will be published at:

`https://<account>.github.io/2026_English_AI_TA/`
