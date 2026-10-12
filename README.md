# AI Portfolio

Personal portfolio of **Varshini M C**, a Java full stack developer in training, with an illustrated AI host that introduces her, explains each project out loud (browser speech, with lip-sync), and runs a guided audio tour.

**Live site:** enable GitHub Pages (Settings > Pages > Deploy from branch > `main` / root) and open `https://varshinickswamy-dot.github.io/AI_Portfolio/`.

## What is inside
- `index.html` is the whole site as a single self-contained file. React, the animation helpers and the CSS are built in, so it needs no network to run. Open it in any browser.
- `src/` holds the readable source: `data.ts` (all content, edit this to update the site), `engine.ts` (voice, lip-sync, illustrated host), `ui.tsx` (the page), `vendor_entry.js` (React plus a small motion library).
- `tools/` holds the build helpers used to produce `index.html`.

## Features
- Illustrated host whose mouth, blinks and audio ring follow the voice
- Play AI Voice Intro, Mute Host, Interactive Audio Tour, and ask-me-about-a-project chips
- Floating host dock that follows you after the hero
- Animated skills matrix, project cards with direct GitHub links, experience, contact
- Dark theme, responsive, respects reduced-motion

## Notes
Voice uses the browser's speech synthesis. Where a browser has none (some in-app viewers), the host shows captions with the same lip-sync.
