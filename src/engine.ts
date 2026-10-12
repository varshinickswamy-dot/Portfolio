declare const THREE: any;

/* ============================================================
   ENGINE: speech + viseme driver, particle head, renderers.
   No React in this block, so it can be tested on its own.
   ============================================================ */

interface Line { show: string; say: string }

const SPELL: Array<[RegExp, string]> = [
  [/\bJSP\b/g, 'J S P'], [/\bJDBC\b/g, 'J D B C'], [/\bMySQL\b/g, 'My S Q L'], [/\bSQL\b/g, 'S Q L'],
  [/\bAI\b/g, 'A I'], [/\bCNN\b/g, 'C N N'], [/\bPDF\b/g, 'P D F'], [/\bAPIs\b/g, 'A P Is'],
  [/\bAPI\b/g, 'A P I'], [/\bCGPA\b/g, 'C G P A'], [/\bHTML5?\b/g, 'H T M L'], [/\bCSS3?\b/g, 'C S S'],
  [/\bSSLC\b/g, 'S S L C'], [/\bUI\b/g, 'U I'], [/Grad-CAM/g, 'Grad cam'], [/GitHub/g, 'Git Hub'],
  [/scikit-learn/g, 'sy-kit learn'], [/\bVite\b/g, 'Veet'], [/OpenCV/g, 'Open C V'], [/\bVTU\b/g, 'V T U']
];

function L(text: string): Line {
  let say = text;
  for (let i = 0; i < SPELL.length; i++) say = say.replace(SPELL[i][0], SPELL[i][1]);
  return { show: text, say: say };
}
function lines(arr: string[]): Line[] { return arr.map(L); }

interface HostState {
  supported: boolean; speaking: boolean; muted: boolean; caption: string;
  touring: boolean; tourIndex: number; target: string; mode: string;
}
interface Bus { mouth: number; amp: number; bars: number[]; round: number; spread: number; press: number; tuck: number }
interface Word { s: number; e: number; c: number; w: string }

/* How wide the mouth opens for a letter: 0 closed, 1 fully open. */
function openness(ch: string): number {
  const c = ch.toLowerCase();
  if (c === 'a') return 1;
  if (c === 'o') return 0.8;
  if (c === 'e') return 0.62;
  if (c === 'u') return 0.55;
  if (c === 'w') return 0.5;
  if (c === 'i') return 0.42;
  if (c === 'y') return 0.35;
  if (c === 'm' || c === 'b' || c === 'p') return 0.03;
  if (c === 'f' || c === 'v') return 0.15;
  if (c === 'l' || c === 'n' || c === 't' || c === 'd' || c === 'r' || c === 'k' || c === 'g') return 0.3;
  if (c === 's' || c === 'z' || c === 'c' || c === 'j' || c === 'x' || c === 'h' || c === 'q') return 0.22;
  return 0.25;
}

/* ------------------------------------------------------------
   Viseme model. Each speech sound maps to articulator targets:
   jaw drop, lip rounding (protrusion), lip spread (smile-wide),
   bilabial press (p, b, m) and lower-lip tuck (f, v).
   Targets follow the standard viseme set (open jaw for "ah",
   rounded for "oh/oo", wide and nearly closed for "ee/s",
   full lip closure for p/b/m, lower lip to upper teeth for f/v)
   and are blended across neighbouring sounds so the mouth
   anticipates what comes next, as real coarticulation does.
   ------------------------------------------------------------ */
type Vis = [number, number, number, number, number]; // jaw, round, spread, press, tuck
const VIS: { [k: string]: Vis } = {
  a: [1.0, 0.0, 0.15, 0, 0], e: [0.55, 0.0, 0.55, 0, 0], i: [0.28, 0.0, 1.0, 0, 0],
  o: [0.62, 1.0, 0.0, 0, 0], u: [0.3, 1.0, 0.0, 0, 0], w: [0.22, 1.0, 0.0, 0, 0],
  y: [0.3, 0.0, 0.6, 0, 0], r: [0.3, 0.55, 0.0, 0, 0],
  m: [0.0, 0.0, 0.0, 1, 0], b: [0.0, 0.0, 0.0, 1, 0], p: [0.0, 0.0, 0.0, 1, 0],
  f: [0.16, 0.0, 0.1, 0, 1], v: [0.16, 0.0, 0.1, 0, 1],
  s: [0.1, 0.0, 0.8, 0, 0], z: [0.1, 0.0, 0.8, 0, 0],
  S: [0.24, 0.75, 0.0, 0, 0], // sh, ch, j
  T: [0.2, 0.0, 0.2, 0, 0],   // th
  l: [0.3, 0.0, 0.2, 0, 0], n: [0.24, 0.0, 0.25, 0, 0], t: [0.2, 0.0, 0.3, 0, 0], d: [0.24, 0.0, 0.25, 0, 0],
  k: [0.34, 0.0, 0.1, 0, 0], g: [0.34, 0.0, 0.1, 0, 0], h: [0.4, 0.0, 0.1, 0, 0], q: [0.3, 0.6, 0, 0, 0], x: [0.2, 0.0, 0.4, 0, 0],
  c: [0.22, 0.0, 0.4, 0, 0], j: [0.24, 0.75, 0, 0, 0]
};
const VOWELS = 'aeiouy';
const segCache: { [w: string]: Array<{ v: Vis; wt: number }> } = {};
function segmentsOf(word: string): Array<{ v: Vis; wt: number }> {
  const key = word.toLowerCase();
  if (segCache[key]) return segCache[key];
  const w = key.replace(/[^a-z]/g, '');
  const out: Array<{ v: Vis; wt: number }> = [];
  let i = 0;
  while (i < w.length) {
    const c = w.charAt(i); const n = w.charAt(i + 1); const two = c + n;
    let v: Vis | null = null; let step = 1; let wt = 1;
    if (two === 'sh' || two === 'ch') { v = VIS.S; step = 2; wt = 1.2; }
    else if (two === 'th') { v = VIS.T; step = 2; }
    else if (two === 'ph') { v = VIS.f; step = 2; }
    else if (two === 'ee' || two === 'ea') { v = VIS.i; step = 2; wt = 2.4; }
    else if (two === 'oo' || two === 'ou' || two === 'ow') { v = VIS.u; step = 2; wt = 2.4; }
    else if (two === 'ai' || two === 'ay') { v = VIS.e; step = 2; wt = 2.4; }
    else if (two === 'oa') { v = VIS.o; step = 2; wt = 2.4; }
    else if (c === n) { step = 2; v = VIS[c] || null; }
    else { v = VIS[c] || null; }
    if (c === 'e' && i === w.length - 1 && w.length > 2 && VOWELS.indexOf(w.charAt(i - 1)) < 0) { i += step; continue; }
    if (c === 'h' && i > 0 && 'cstw'.indexOf(w.charAt(i - 1)) >= 0) { i += step; continue; }
    if (!v) v = [0.25, 0, 0, 0, 0];
    if (VOWELS.indexOf(c) >= 0 && wt === 1) wt = 2.2;
    out.push({ v: v, wt: wt });
    i += step;
  }
  if (!out.length) out.push({ v: [0.2, 0, 0, 0, 0], wt: 1 });
  segCache[key] = out;
  return out;
}
const smooth3 = (t: number) => { const x = t < 0 ? 0 : t > 1 ? 1 : t; return x * x * (3 - 2 * x); };
/* Articulator targets for a word at progress p (0..1), with coarticulation. */
function visemeAt(word: string, p: number): Vis {
  const segs = segmentsOf(word);
  let total = 0; for (let i = 0; i < segs.length; i++) total += segs[i].wt;
  let acc = 0; const pos = p * total;
  let idx = segs.length - 1; let q = 1;
  for (let i = 0; i < segs.length; i++) {
    if (pos < acc + segs[i].wt) { idx = i; q = (pos - acc) / segs[i].wt; break; }
    acc += segs[i].wt;
  }
  const cur = segs[idx].v;
  const prev = idx > 0 ? segs[idx - 1].v : [0.08, 0, 0, 0, 0] as Vis;
  const next = idx < segs.length - 1 ? segs[idx + 1].v : [0.08, 0, 0, 0, 0] as Vis;
  const r: Vis = [0, 0, 0, 0, 0];
  for (let k = 0; k < 5; k++) {
    let val = cur[k];
    if (q < 0.25) val = prev[k] + (cur[k] - prev[k]) * smooth3((q + 0.25) / 0.5);
    else if (q > 0.75) val = cur[k] + (next[k] - cur[k]) * smooth3((q - 0.75) / 0.5);
    r[k] = val;
  }
  return r;
}

class HostVoice {
  state: HostState;
  bus: Bus = { mouth: 0, amp: 0, bars: new Array(24).fill(0), round: 0, spread: 0, press: 0, tuck: 0 };
  private listeners: Array<() => void> = [];
  private token = 0;
  private words: Word[] = [];
  private total = 0;
  private tStart = 0;
  private active = false;
  private ttsOk = false;
  private switching = false;
  private inTTS = false;
  private pending: (() => void) | null = null;
  private timers: number[] = [];
  private chosen: any = null;
  private synth: any = null;

  constructor() {
    const has = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof (window as any).SpeechSynthesisUtterance !== 'undefined';
    this.synth = has ? (window as any).speechSynthesis : null;
    this.ttsOk = !!this.synth;
    this.state = {
      supported: !!this.synth, speaking: false, muted: false, caption: '',
      touring: false, tourIndex: -1, target: '', mode: 'idle'
    };
    if (this.synth) {
      this.refreshVoice();
      if (this.synth.addEventListener) this.synth.addEventListener('voiceschanged', () => this.refreshVoice());
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((x) => x !== fn); };
  };
  getState = () => this.state;

  update(patch: Partial<HostState>) {
    this.state = Object.assign({}, this.state, patch);
    for (let i = 0; i < this.listeners.length; i++) this.listeners[i]();
  }

  private refreshVoice() {
    let vs: any[] = [];
    try { vs = this.synth.getVoices() || []; } catch (e) { vs = []; }
    const en = vs.filter((v) => /^en/i.test(v.lang || ''));
    const order = [/en[-_]IN/i, /en[-_]GB/i, /en[-_]US/i];
    let pick: any = null;
    for (let i = 0; i < order.length && !pick; i++) {
      pick = en.filter((v) => order[i].test(v.lang || ''))[0] || null;
    }
    this.chosen = pick || en[0] || null;
  }

  private clearTimers() {
    for (let i = 0; i < this.timers.length; i++) window.clearTimeout(this.timers[i]);
    this.timers = [];
  }

  private build(text: string, rate: number) {
    const re = /[A-Za-z0-9'’]+/g;
    const words: Word[] = [];
    let cur = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const len = m[0].length;
      const dur = (95 + len * 58) / rate;
      const next = text.charAt(m.index + len);
      const gap = ((next === ',' || next === ';') ? 170 : (next === '.' || next === '?' || next === '!') ? 330 : 30) / rate;
      words.push({ s: cur, e: cur + dur, c: m.index, w: m[0] });
      cur += dur + gap;
    }
    this.words = words;
    this.total = cur;
  }

  private wordAt(ci: number): Word | null {
    for (let i = 0; i < this.words.length; i++) {
      if (ci < this.words[i].c + this.words[i].w.length) return this.words[i];
    }
    return null;
  }

  private speakOne(text: string, rate: number, my: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.build(text, rate);
      this.switching = false;
      let done = false;
      let started = false;
      let abandoned = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.active = false;
        this.inTTS = false;
        this.pending = null;
        this.clearTimers();
        resolve();
      };
      this.pending = finish;
      const sim = () => {
        if (done) return;
        if (my !== this.token) { finish(); return; }
        this.inTTS = false;
        this.tStart = performance.now();
        this.active = true;
        this.timers.push(window.setTimeout(finish, this.total + 250));
      };
      const useTTS = !!this.synth && this.ttsOk && !this.state.muted;
      if (!useTTS) { sim(); return; }

      const u = new (window as any).SpeechSynthesisUtterance(text);
      if (this.chosen) { u.voice = this.chosen; u.lang = this.chosen.lang; } else { u.lang = 'en-IN'; }
      u.rate = rate; u.pitch = 1; u.volume = 1;
      this.inTTS = true;
      u.onstart = () => { started = true; this.tStart = performance.now(); this.active = true; };
      u.onboundary = (e: any) => {
        if (abandoned || done) return;
        if (e && e.name && e.name !== 'word') return;
        const w = this.wordAt((e && e.charIndex) || 0);
        if (w) { this.tStart = performance.now() - w.s; this.active = true; }
      };
      u.onend = () => {
        if (abandoned || done) return;
        if (this.switching) { this.switching = false; sim(); return; }
        finish();
      };
      u.onerror = (e: any) => {
        if (abandoned || done) return;
        if (this.switching) { this.switching = false; sim(); return; }
        if (e && (e.error === 'canceled' || e.error === 'interrupted')) { finish(); return; }
        this.ttsOk = false;
        sim();
      };
      this.timers.push(window.setTimeout(() => {
        if (started || done) return;
        abandoned = true;
        this.ttsOk = false;
        try { this.synth.cancel(); } catch (e) { /* ignore */ }
        sim();
      }, 3000));
      try { this.synth.speak(u); } catch (e) { abandoned = true; this.ttsOk = false; sim(); }
    });
  }

  /* Speak lines one after another. Resolves true when all finished, false if cancelled. */
  async say(list: Line[], rate: number = 1): Promise<boolean> {
    const my = ++this.token;
    this.clearTimers();
    this.switching = false;
    if (this.synth) { try { this.synth.cancel(); } catch (e) { /* ignore */ } }
    const prev = this.pending;
    this.pending = null;
    if (prev) prev();
    this.active = false;
    this.update({ speaking: true, mode: this.state.muted ? 'muted' : 'speaking' });
    await new Promise<void>((r) => { window.setTimeout(r, 90); });
    for (let i = 0; i < list.length; i++) {
      if (my !== this.token) return false;
      this.update({ caption: list[i].show });
      await this.speakOne(list[i].say, rate, my);
    }
    if (my !== this.token) return false;
    this.active = false;
    this.update({ speaking: false, mode: this.state.muted ? 'muted' : 'idle' });
    return true;
  }

  cancel() {
    this.token++;
    this.clearTimers();
    if (this.synth) { try { this.synth.cancel(); } catch (e) { /* ignore */ } }
    this.active = false;
    this.inTTS = false;
    this.switching = false;
    const p = this.pending;
    this.pending = null;
    if (p) p();
    this.update({ speaking: false, mode: this.state.muted ? 'muted' : 'idle' });
  }

  toggleMute() {
    const muted = !this.state.muted;
    this.update({ muted: muted, mode: muted ? 'muted' : (this.state.speaking ? 'speaking' : 'idle') });
    if (muted && this.inTTS && this.synth) {
      this.switching = true;
      try { this.synth.cancel(); } catch (e) { /* ignore */ }
    }
  }

  /* Called every animation frame. Turns the word timeline into mouth and band values. */
  tick(now: number) {
    let tv: Vis = [0, 0, 0, 0, 0];
    if (this.active) {
      const t = now - this.tStart + 45; // look slightly ahead: lips lead the sound
      for (let i = 0; i < this.words.length; i++) {
        const w = this.words[i];
        if (t >= w.s && t < w.e) {
          const p = (t - w.s) / (w.e - w.s);
          tv = visemeAt(w.w, p);
          const gain = 0.82 + 0.1 * Math.sin(i * 2.399); // natural variation word to word
          tv = [tv[0] * gain, tv[1], tv[2], tv[3], tv[4]];
          break;
        }
        if (t >= w.e && i + 1 < this.words.length && t < this.words[i + 1].s) { tv = [0.06, 0, 0, 0, 0]; break; }
      }
    }
    const b = this.bus;
    const k = 0.34;
    b.mouth += (tv[0] - b.mouth) * (tv[0] > b.mouth ? 0.42 : k);
    b.round += (tv[1] - b.round) * k;
    b.spread += (tv[2] - b.spread) * k;
    b.press += (tv[3] - b.press) * 0.5;
    b.tuck += (tv[4] - b.tuck) * 0.45;
    b.amp += (b.mouth - b.amp) * 0.2;
    for (let i = 0; i < 24; i++) {
      const falloff = 1 - Math.abs(i - 8) / 18;
      const wob = Math.abs(Math.sin(now * 0.006 * (1 + i * 0.37) + i));
      const idle = 0.035 + 0.025 * Math.sin(now * 0.0012 + i * 0.6);
      const v = Math.max(idle, b.mouth * (0.35 + 0.65 * wob) * falloff * 1.25);
      b.bars[i] += (v - b.bars[i]) * 0.5;
    }
  }
}

const voice = new HostVoice();
const pointer = { x: 0, y: 0 };
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  const hostLoop = (t: number) => { voice.tick(t); window.requestAnimationFrame(hostLoop); };
  window.requestAnimationFrame(hostLoop);
}

/* ---------------- particle head geometry ---------------- */

interface Head { pos: Float32Array; region: Float32Array; seed: Float32Array; count: number }

function rng(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HX = 0.78;
const HY = 1.0;
const HZ = 0.86;

function faceZ(x: number, y: number): number {
  const yn = y / HY;
  const k = yn < 0 ? 1 + yn * 0.34 : 1;
  const kz = yn < 0 ? 1 + yn * 0.18 : 1;
  const xs = HX * k;
  const zs = HZ * kz;
  const q = 1 - (x / xs) * (x / xs) - yn * yn;
  return zs * Math.sqrt(Math.max(0, q));
}

/* region ids: 0 body, 1 upper lip, 2 lower lip, 3 eye, 4 jaw, 6 ring, 7 dust */
let headCache: Head | null = null;
function getHead(): Head {
  if (headCache) return headCache;
  const rnd = rng(20260711);
  const pos: number[] = [];
  const region: number[] = [];
  const seed: number[] = [];
  const push = (x: number, y: number, z: number, r: number, s?: number) => {
    pos.push(x, y, z); region.push(r); seed.push(s === undefined ? rnd() : s);
  };

  const N = 3200;
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const Y = 1 - (i / (N - 1)) * 2;
    const rr = Math.sqrt(1 - Y * Y);
    const th = ga * i;
    let X = Math.cos(th) * rr;
    let Z = Math.sin(th) * rr;
    if (Y < 0) { X *= 1 + Y * 0.34; Z *= 1 + Y * 0.18; }
    const x = X * HX; const y = Y * HY; const z = Z * HZ;
    const jaw = (y < -0.55 && z > 0.1) ? 4 : 0;
    push(x, y, z, jaw);
  }

  // eyes: ring plus pupil, brows
  const eyes = [-0.3, 0.3];
  for (let e = 0; e < 2; e++) {
    const cx = eyes[e];
    for (let j = 0; j < 30; j++) {
      const a = (j / 30) * Math.PI * 2;
      const x = cx + Math.cos(a) * 0.1; const y = 0.2 + Math.sin(a) * 0.05;
      push(x, y, faceZ(x, y) + 0.012, 3);
    }
    for (let j = 0; j < 9; j++) {
      const a = (j / 9) * Math.PI * 2;
      const x = cx + Math.cos(a) * 0.028; const y = 0.2 + Math.sin(a) * 0.028;
      push(x, y, faceZ(x, y) + 0.016, 3);
    }
    for (let j = 0; j < 18; j++) {
      const t = j / 17;
      const x = cx - 0.13 + t * 0.26; const y = 0.34 + 0.03 * Math.sin(t * Math.PI);
      push(x, y, faceZ(x, y) + 0.012, 0);
    }
  }
  // nose ridge and nostrils
  for (let j = 0; j < 22; j++) {
    const t = j / 21;
    const y = 0.16 - t * 0.28;
    push(0, y, faceZ(0, y) + 0.05 + 0.07 * t, 0);
  }
  for (let s = -1; s <= 1; s += 2) {
    for (let j = 0; j < 5; j++) {
      const x = s * (0.05 + j * 0.008); const y = -0.15 - j * 0.004;
      push(x, y, faceZ(x, y) + 0.09, 0);
    }
  }
  // mouth lips
  for (let i = 0; i < 46; i++) {
    const t = (i / 45) * 2 - 1;
    const x = t * 0.26;
    const yu = -0.5 + 0.035 * (1 - t * t);
    const yl = -0.52 - 0.045 * (1 - t * t);
    push(x, yu, faceZ(x, yu) + 0.016, 1);
    push(x, yl, faceZ(x, yl) + 0.016, 2);
  }
  // ears
  for (let s = -1; s <= 1; s += 2) {
    for (let j = 0; j < 20; j++) {
      const a = -Math.PI / 2 + (j / 19) * Math.PI;
      push(s * (HX + 0.02 + Math.cos(a) * 0.05), 0.02 + Math.sin(a) * 0.17, -0.02, 0);
    }
  }
  // neck
  for (let i = 0; i < 280; i++) {
    const a = rnd() * Math.PI * 2; const y = -0.95 - rnd() * 0.6;
    push(Math.cos(a) * 0.31, y, Math.sin(a) * 0.28, 0);
  }
  // shoulders
  for (let i = 0; i < 900; i++) {
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(rnd());
    push(1.55 * Math.sin(ph) * Math.cos(th), -1.95 + 0.55 * Math.cos(ph), 0.62 * Math.sin(ph) * Math.sin(th), 0);
  }
  // audio ring: seed holds the angle fraction so each segment maps to a band
  const tilt = 0.55;
  for (let i = 0; i < 380; i++) {
    const f = i / 380; const th = f * Math.PI * 2; const R = 1.5;
    const z0 = R * Math.sin(th);
    push(R * Math.cos(th), -z0 * Math.sin(tilt) + 0.05, z0 * Math.cos(tilt), 6, f);
  }
  // dust
  for (let i = 0; i < 240; i++) {
    const u = rnd() * Math.PI * 2; const v = Math.acos(2 * rnd() - 1); const r = 1.9 + rnd() * 0.6;
    push(r * Math.sin(v) * Math.cos(u), r * Math.cos(v) * 0.9, r * Math.sin(v) * Math.sin(u), 7);
  }

  headCache = {
    pos: new Float32Array(pos), region: new Float32Array(region), seed: new Float32Array(seed), count: region.length
  };
  return headCache;
}

/* ---------------- renderers ---------------- */

interface Look { yaw: number; pitch: number; blink: number }
interface HostRenderer { kind: string; render: (now: number, bus: Bus, look: Look) => void; resize: () => void; dispose: () => void }

const VERT = [
  'uniform float uTime; uniform float uAmp; uniform float uMouth; uniform float uBlink; uniform float uPR; uniform float uScale; uniform float uBars[24];',
  'attribute float aRegion; attribute float aSeed;',
  'varying float vMix; varying float vGlow;',
  'void main() {',
  '  vec3 p = position; float r = aRegion; float glow = 0.0; float mixv = clamp((p.y + 1.6) / 2.8, 0.0, 1.0);',
  '  if (r > 6.5) {',
  '    p += vec3(sin(uTime * 0.2 + aSeed * 40.0), cos(uTime * 0.17 + aSeed * 31.0), sin(uTime * 0.13 + aSeed * 23.0)) * 0.06;',
  '    glow = 0.0; mixv = 0.5 + 0.5 * sin(aSeed * 20.0);',
  '  } else if (r > 5.5) {',
  '    int idx = int(floor(aSeed * 23.999)); float b = 0.0;',
  '    for (int i = 0; i < 24; i++) { if (i == idx) b = uBars[i]; }',
  '    float k = 1.0 + 0.1 * sin(uTime * 1.2 + aSeed * 12.566) + b * 0.24 + uAmp * 0.06;',
  '    p *= k; glow = b; mixv = 0.5 + 0.5 * sin(aSeed * 6.2831 + uTime * 0.6);',
  '  } else {',
  '    vec3 dir = normalize(p + vec3(0.0001));',
  '    p += dir * (sin(uTime * 0.9 + aSeed * 6.2831) * 0.01 + uAmp * 0.035 * (0.5 + 0.5 * sin(uTime * 7.0 + aSeed * 31.0)));',
  '    if (r > 0.5 && r < 1.5) { p.y += uMouth * 0.05; p.x *= 1.0 - uMouth * 0.14; glow = 0.6 + uMouth; }',
  '    else if (r > 1.5 && r < 2.5) { p.y -= uMouth * 0.19; p.x *= 1.0 - uMouth * 0.14; glow = 0.6 + uMouth; }',
  '    else if (r > 2.5 && r < 3.5) { p.y = 0.2 + (p.y - 0.2) * (1.0 - 0.92 * uBlink); glow = 0.7; }',
  '    else if (r > 3.5 && r < 4.5) { p.y -= uMouth * 0.11 * clamp((-p.y - 0.55) / 0.45, 0.0, 1.0); }',
  '  }',
  '  vMix = mixv; vGlow = glow;',
  '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
  '  gl_Position = projectionMatrix * mv;',
  '  float sz = 1.5 + fract(aSeed * 37.31) * 1.7 + glow * 1.6;',
  '  gl_PointSize = sz * uPR * uScale * (5.0 / -mv.z);',
  '}'
].join('\n');

const FRAG = [
  'precision mediump float;',
  'varying float vMix; varying float vGlow;',
  'void main() {',
  '  float d = length(gl_PointCoord - vec2(0.5));',
  '  if (d > 0.5) discard;',
  '  float a = smoothstep(0.5, 0.05, d);',
  '  vec3 cyan = vec3(0.0, 0.953, 1.0); vec3 vio = vec3(0.545, 0.361, 0.965);',
  '  vec3 c = mix(cyan, vio, vMix);',
  '  float g = clamp(vGlow, 0.0, 1.0);',
  '  c = mix(c, vec3(1.0), g * 0.45);',
  '  gl_FragColor = vec4(c, a * (0.55 + 0.45 * g));',
  '}'
].join('\n');

function createWebGL(canvas: HTMLCanvasElement, head: Head): HostRenderer | null {
  if (typeof THREE === 'undefined') return null;
  let renderer: any = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  if (!renderer) return null;
  renderer.setClearColor(0x050b1c, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, -0.45, 5.2);
  camera.lookAt(0, -0.45, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(head.pos, 3));
  geo.setAttribute('aRegion', new THREE.BufferAttribute(head.region, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(head.seed, 1));
  const uniforms: any = {
    uTime: { value: 0 }, uAmp: { value: 0 }, uMouth: { value: 0 }, uBlink: { value: 0 },
    uPR: { value: 1 }, uScale: { value: 1 }, uBars: { value: new Float32Array(24) }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const resize = () => {
    const w = canvas.clientWidth || 300; const h = canvas.clientHeight || 300;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPR.value = pr;
    uniforms.uScale.value = h / 560;
  };
  const render = (now: number, bus: Bus, look: Look) => {
    points.rotation.y = look.yaw * 0.8;
    points.rotation.x = look.pitch;
    uniforms.uTime.value = now * 0.001;
    uniforms.uAmp.value = bus.amp;
    uniforms.uMouth.value = bus.mouth;
    uniforms.uBlink.value = look.blink;
    const arr = uniforms.uBars.value;
    for (let i = 0; i < 24; i++) arr[i] = bus.bars[i];
    renderer.render(scene, camera);
  };
  const dispose = () => {
    geo.dispose(); mat.dispose(); renderer.dispose();
    try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
  };
  return { kind: 'WebGL', render: render, resize: resize, dispose: dispose };
}

function create2D(canvas: HTMLCanvasElement, head: Head): HostRenderer {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let W = 300; let H = 300; let pr = 1;
  const n = head.count; const bx = head.pos; const reg = head.region; const sd = head.seed;
  const cols: string[] = [];
  for (let b = 0; b < 16; b++) {
    const bright = b >= 8; const m = (b % 8) / 7;
    let r = Math.round(0 + (139 - 0) * m); let g = Math.round(243 + (92 - 243) * m); let bl = Math.round(255 + (246 - 255) * m);
    if (bright) { r = Math.round(r + (255 - r) * 0.45); g = Math.round(g + (255 - g) * 0.45); bl = Math.round(bl + (255 - bl) * 0.45); }
    cols.push('rgba(' + r + ',' + g + ',' + bl + ',' + (bright ? 0.95 : 0.6) + ')');
  }
  const resize = () => {
    pr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || 300; H = canvas.clientHeight || 300;
    canvas.width = Math.round(W * pr); canvas.height = Math.round(H * pr);
  };
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const render = (now: number, bus: Bus, look: Look) => {
    const t = now * 0.001;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050b1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    const cy = Math.cos(look.yaw * 0.8); const sy = Math.sin(look.yaw * 0.8);
    const cp = Math.cos(look.pitch); const sp = Math.sin(look.pitch);
    const f = (H * 0.5) / Math.tan((19 * Math.PI) / 180);
    for (let i = 0; i < n; i++) {
      let x = bx[3 * i]; let y = bx[3 * i + 1]; let z = bx[3 * i + 2];
      const r = reg[i]; const s = sd[i];
      let glow = 0; let mixv = clamp01((y + 1.6) / 2.8);
      if (r > 6.5) {
        x += Math.sin(t * 0.2 + s * 40) * 0.06; y += Math.cos(t * 0.17 + s * 31) * 0.06; z += Math.sin(t * 0.13 + s * 23) * 0.06;
        mixv = 0.5 + 0.5 * Math.sin(s * 20);
      } else if (r > 5.5) {
        const b = bus.bars[Math.min(23, Math.floor(s * 23.999))];
        const k = 1 + 0.1 * Math.sin(t * 1.2 + s * 12.566) + b * 0.24 + bus.amp * 0.06;
        x *= k; y *= k; z *= k; glow = b; mixv = 0.5 + 0.5 * Math.sin(s * 6.2831 + t * 0.6);
      } else {
        const len = Math.sqrt(x * x + y * y + z * z) + 0.0001;
        const d = Math.sin(t * 0.9 + s * 6.2831) * 0.01 + bus.amp * 0.035 * (0.5 + 0.5 * Math.sin(t * 7 + s * 31));
        x += (x / len) * d; y += (y / len) * d; z += (z / len) * d;
        if (r > 0.5 && r < 1.5) { y += bus.mouth * 0.05; x *= 1 - bus.mouth * 0.14; glow = 0.6 + bus.mouth; }
        else if (r > 1.5 && r < 2.5) { y -= bus.mouth * 0.19; x *= 1 - bus.mouth * 0.14; glow = 0.6 + bus.mouth; }
        else if (r > 2.5 && r < 3.5) { y = 0.2 + (y - 0.2) * (1 - 0.92 * look.blink); glow = 0.7; }
        else if (r > 3.5 && r < 4.5) { y -= bus.mouth * 0.11 * clamp01((-y - 0.55) / 0.45); }
      }
      const x1 = x * cy + z * sy; const z1 = -x * sy + z * cy;
      const y2 = y * cp - z1 * sp; const z2 = y * sp + z1 * cp;
      const dz = 5.2 - z2;
      if (dz < 0.5) continue;
      const k2 = f / dz;
      const px = (W / 2 + x1 * k2) * pr; const py = (H * 0.5 - (y2 + 0.45) * k2) * pr;
      const sz = (1.5 + ((s * 37.31) % 1) * 1.7 + glow * 1.6) * (5 / dz) * (H / 560) * pr * 0.55;
      ctx.fillStyle = cols[Math.round(mixv * 7) + (glow > 0.5 ? 8 : 0)];
      ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
  };
  return { kind: 'Canvas 2D', render: render, resize: resize, dispose: function () { /* nothing to free */ } };
}

function createRenderer(canvas: HTMLCanvasElement, head: Head): HostRenderer {
  const av = createAvatar(canvas);
  const photo = typeof window !== 'undefined' ? (window as any).HOST_PHOTO : null;
  return photo ? createPhotoHost(canvas, photo, av) : av;
}

/* ============================================================
   ILLUSTRATED HOST. An original cartoon avatar drawn with canvas
   paths: blonde hair with a side braid, white collared top.
   Mouth, blink, brows and gaze are driven by the shared bus.
   ============================================================ */
function createAvatar(canvas: HTMLCanvasElement): HostRenderer {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let W = 300; let H = 300; let pr = 1;
  const resize = () => {
    pr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || 300; H = canvas.clientHeight || 300;
    canvas.width = Math.round(W * pr); canvas.height = Math.round(H * pr);
  };
  const SKIN = '#f1c9a5'; const SKIN_SHADE = '#e2ad86';
  const HAIR = '#e9d48c'; const HAIR_DARK = '#c9ad5c'; const HAIR_LIGHT = '#f7e9b4';
  const ell = (x: number, y: number, rx: number, ry: number) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };

  const render = (now: number, bus: Bus, look: Look) => {
    const t = now * 0.001;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    // backdrop
    const bg = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.42, 0, canvas.width * 0.5, canvas.height * 0.42, canvas.height * 0.75);
    bg.addColorStop(0, '#34425c'); bg.addColorStop(0.55, '#16203a'); bg.addColorStop(1, '#050b1c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const u = (Math.min(W, H) / 100) * pr;
    ctx.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height * 0.4);

    // audio ring: neon bars radiating behind the head
    const amp = bus.amp;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
      const v = bus.bars[i] || 0;
      const r0 = 34 * u; const r1 = (34 + 2.5 + v * 9 + amp * 3) * u;
      ctx.strokeStyle = i % 2 ? 'rgba(139,92,246,0.75)' : 'rgba(0,243,255,0.8)';
      ctx.lineWidth = 1.6 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 1.04); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 1.04); ctx.stroke();
    }
    ctx.save();

    // breathing and gaze sway
    const bob = Math.sin(t * 1.3) * 0.5 + bus.amp * 0.6;
    ctx.translate(look.yaw * 3 * u, bob * u);
    ctx.rotate(look.yaw * 0.05);
    ctx.translate(0, 2 * u);
    ctx.scale(u * 0.7, u * 0.7);
    const fx = look.yaw * 3.2; const fy = look.pitch * 5;

    // hair back
    const hairBack = ctx.createLinearGradient(0, -34, 0, 30);
    hairBack.addColorStop(0, HAIR_LIGHT); hairBack.addColorStop(0.5, HAIR); hairBack.addColorStop(1, HAIR_DARK);
    ctx.fillStyle = hairBack;
    ctx.beginPath();
    ctx.moveTo(-26, -4); ctx.bezierCurveTo(-30, -38, 30, -38, 26, -4);
    ctx.bezierCurveTo(28, 14, 27, 26, 22, 34); ctx.lineTo(-22, 34);
    ctx.bezierCurveTo(-27, 26, -28, 14, -26, -4); ctx.closePath(); ctx.fill();

    // shoulders and top
    ctx.fillStyle = SKIN_SHADE; ell(0, 28, 6.5, 8); ctx.fill();
    ctx.fillStyle = '#f5f7fb';
    ctx.beginPath(); ctx.moveTo(-34, 60); ctx.bezierCurveTo(-34, 40, -22, 33, -8, 31); ctx.lineTo(8, 31);
    ctx.bezierCurveTo(22, 33, 34, 40, 34, 60); ctx.closePath(); ctx.fill();
    // bare shoulders either side of the sleeveless top
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.moveTo(-34, 60); ctx.bezierCurveTo(-34, 44, -30, 40, -27, 38); ctx.lineTo(-24, 60); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(34, 60); ctx.bezierCurveTo(34, 44, 30, 40, 27, 38); ctx.lineTo(24, 60); ctx.closePath(); ctx.fill();
    // blue inner collar and V
    ctx.fillStyle = '#2f6bc0';
    ctx.beginPath(); ctx.moveTo(-8, 31); ctx.lineTo(8, 31); ctx.lineTo(0, 50); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#cfd6e4'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-9, 31); ctx.lineTo(-1, 52); ctx.lineTo(-13, 44); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, 31); ctx.lineTo(1, 52); ctx.lineTo(13, 44); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9aa8c4'; ell(0, 49.5, 0.9, 0.9); ctx.fill();
    // neck
    ctx.fillStyle = SKIN_SHADE; ctx.fillRect(-5, 20, 10, 14);

    // braid over the viewer's left shoulder
    for (let i = 0; i < 8; i++) {
      const bx = -22.5 - i * 0.55 + Math.sin(i * 1.1) * 1.3; const by = 18 + i * 5.2; const sc = 1 - i * 0.045;
      ctx.fillStyle = i % 2 ? HAIR : HAIR_LIGHT;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(i % 2 ? 0.5 : -0.5);
      ell(0, 0, 4.2 * sc, 3.3 * sc); ctx.fill();
      ctx.strokeStyle = HAIR_DARK; ctx.lineWidth = 0.35; ctx.stroke();
      ctx.restore();
    }

    // head
    const skin = ctx.createLinearGradient(0, -26, 0, 22);
    skin.addColorStop(0, '#f5d3b0'); skin.addColorStop(1, SKIN);
    ctx.fillStyle = skin; ell(0, -4, 19.5, 23.5); ctx.fill();
    ctx.fillStyle = 'rgba(226,120,110,0.28)'; ell(-11 + fx * 0.3, 6, 4.2, 2.6); ctx.fill(); ell(11 + fx * 0.3, 6, 4.2, 2.6); ctx.fill();

    // fringe: side part, swept over the forehead
    const fr = ctx.createLinearGradient(-20, -28, 20, -4);
    fr.addColorStop(0, HAIR_LIGHT); fr.addColorStop(1, HAIR);
    ctx.fillStyle = fr;
    ctx.beginPath();
    ctx.moveTo(-20, 0); ctx.bezierCurveTo(-23, -22, -12, -32, 0, -31);
    ctx.bezierCurveTo(14, -31, 22, -22, 20, 0);
    ctx.bezierCurveTo(19, -10, 14, -17, 6, -18);
    ctx.bezierCurveTo(-3, -17, -12, -12, -20, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = HAIR_DARK; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-8, -29); ctx.bezierCurveTo(-6, -22, -2, -19, 6, -18); ctx.stroke();

    // brows
    const lift = bus.amp * 1.2;
    ctx.strokeStyle = '#a5864a'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12 + fx, -9 - lift + fy); ctx.quadraticCurveTo(-8 + fx, -12 - lift + fy, -4 + fx, -9.5 - lift + fy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4 + fx, -9.5 - lift + fy); ctx.quadraticCurveTo(8 + fx, -12 - lift + fy, 12 + fx, -9 - lift + fy); ctx.stroke();

    // eyes
    const open = 1 - look.blink;
    const gx = look.yaw * 1.4; const gy = look.pitch * 2;
    [-8, 8].forEach((ex) => {
      const cx = ex + fx; const cy = -3 + fy;
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 4.6, Math.max(0.2, 4.2 * open), 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 6, cy - 6, 12, 12);
      ctx.fillStyle = '#6b4a2a'; ell(cx + gx, cy + gy, 3, 3); ctx.fill();
      ctx.fillStyle = '#1a1208'; ell(cx + gx, cy + gy, 1.6, 1.6); ctx.fill();
      ctx.fillStyle = '#ffffff'; ell(cx + gx - 1, cy + gy - 1.1, 0.8, 0.8); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.ellipse(cx, cy, 4.6, Math.max(0.2, 4.2 * open), 0, Math.PI, Math.PI * 2); ctx.stroke();
    });

    // nose
    ctx.strokeStyle = 'rgba(180,120,90,0.65)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-1.8 + fx, 5 + fy); ctx.quadraticCurveTo(0 + fx, 7 + fy, 1.8 + fx, 5 + fy); ctx.stroke();
    ctx.fillStyle = 'rgba(210,150,120,0.35)'; ell(0 + fx, 3 + fy, 1.8, 2.6); ctx.fill();

    // mouth: closed smile, opens with the voice
    const m = Math.max(0, Math.min(1, bus.mouth));
    const mx = fx; const my = 12 + fy;
    if (m < 0.06) {
      ctx.strokeStyle = '#8c4a42'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mx - 4.2, my - 0.6); ctx.quadraticCurveTo(mx, my + 2.2, mx + 4.2, my - 0.6); ctx.stroke();
    } else {
      const w = 4.2 + m * 1.6; const h = 0.8 + m * 5.2;
      ctx.fillStyle = '#5b1f24';
      ctx.beginPath(); ctx.moveTo(mx - w, my - 0.6);
      ctx.quadraticCurveTo(mx, my - 1.6 - m * 0.4, mx + w, my - 0.6);
      ctx.quadraticCurveTo(mx + w * 0.7, my + h + 0.8, mx, my + h + 1);
      ctx.quadraticCurveTo(mx - w * 0.7, my + h + 0.8, mx - w, my - 0.6); ctx.closePath(); ctx.fill();
      if (m > 0.3) { ctx.fillStyle = '#fbf4ee'; ctx.fillRect(mx - w * 0.62, my - 0.9, w * 1.24, Math.min(1.6, h * 0.35)); }
      ctx.fillStyle = '#d9716f'; ell(mx, my + h * 0.72 + 0.6, w * 0.5, Math.max(0.3, h * 0.22)); ctx.fill();
      ctx.strokeStyle = '#b25a58'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(mx - w, my - 0.6); ctx.quadraticCurveTo(mx, my - 1.6, mx + w, my - 0.6); ctx.stroke();
    }
    ctx.restore();
  };
  return { kind: 'Illustrated host', render: render, resize: resize, dispose: function () { /* nothing to free */ } };
}

/* ============================================================
   PHOTO HOST. Uses the supplied portrait itself. A mesh warp moves
   the real lips, chin and jaw. Driven by five speech articulators
   (jaw drop, lip rounding, lip spread, lip press, lower-lip tuck),
   so "ah", "oo", "ee", "m/b/p" and "f/v" each look different.
   The body breathes and sways gently like a speaker on stage.
   ============================================================ */
function createPhotoHost(canvas: HTMLCanvasElement, src: string, fallback: HostRenderer): HostRenderer {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const img = new Image();
  let ready = false;
  let W = 300; let H = 300; let pr = 1;
  const CX = 320; const SEAM = 223.5; // mouth centre and lip seam in the 640 x 725 portrait
  const XS: number[] = []; for (let x = 262; x <= 378; x += 6.4) XS.push(x);
  const YS = [194, 200, 206, 211, 215, 218.5, 221, SEAM, SEAM + 1.5, SEAM + 3, SEAM + 5, SEAM + 7, SEAM + 9.5, SEAM + 12.5, SEAM + 16, SEAM + 20, SEAM + 25, SEAM + 31, SEAM + 38, SEAM + 46, SEAM + 56, SEAM + 66, SEAM + 76];
  const GX0 = XS[0]; const GX1 = XS[XS.length - 1]; const GY0 = YS[0]; const GY1 = YS[YS.length - 1];
  // A copy of the portrait with the lips painted out (skin interpolated across the mouth), so the
  // warped lips are the only lips on screen while speaking and no second upper lip shows through.
  let clean: HTMLCanvasElement | null = null;
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d') as CanvasRenderingContext2D;
      x.drawImage(img, 0, 0);
      const RX0 = 276; const RX1 = 364; const TOP = 212; const BOT = 246;
      const w = RX1 - RX0; const h = BOT - TOP;
      const data = x.getImageData(RX0, TOP - 3, w, h + 6);
      const px = data.data; const stride = w * 4;
      const at = (cx: number, ry: number, k: number) => px[(ry + 3) * stride + cx * 4 + k];
      const orig = x.getImageData(RX0, TOP - 3, w, h + 6).data;
      for (let cx = 0; cx < w; cx++) {
        const xa = Math.max(0, cx - 3); const xb = Math.min(w - 1, cx + 3);
        const top = [0, 0, 0]; const bot = [0, 0, 0]; let n = 0;
        for (let xx = xa; xx <= xb; xx++) {
          for (let k = 0; k < 3; k++) { top[k] += at(xx, -2, k) + at(xx, -1, k); bot[k] += at(xx, h + 1, k) + at(xx, h + 2, k); }
          n += 2;
        }
        for (let ry = 0; ry < h; ry++) {
          const t = ry / (h - 1);
          const ax = Math.min(1, Math.min(cx, w - 1 - cx) / 10);
          const ay = Math.min(1, Math.min(ry, h - 1 - ry) / 3);
          const a = ax * ay;
          const o = (ry + 3) * stride + cx * 4;
          for (let k = 0; k < 3; k++) {
            const fill = (top[k] / n) * (1 - t) + (bot[k] / n) * t;
            px[o + k] = orig[o + k] * (1 - a) + fill * a;
          }
        }
      }
      x.putImageData(data, RX0, TOP - 3);
      clean = c;
    } catch (e) { clean = null; }
    ready = true;
  };
  img.src = src;
  const resize = () => {
    pr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || 300; H = canvas.clientHeight || 300;
    canvas.width = Math.round(W * pr); canvas.height = Math.round(H * pr);
    fallback.resize();
  };
  const sm = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const gauss = (v: number, c: number, w: number) => Math.exp(-((v - c) / w) * ((v - c) / w));
  const field = (x: number, y: number, B: Bus, jaw: number): number[] => {
    const edge = sm(GX0, GX0 + 14, x) * (1 - sm(GX1 - 14, GX1, x)) * sm(GY0, GY0 + 10, y) * (1 - sm(GY1 - 14, GY1, y));
    const wx = gauss(x, CX, 40);
    const lower = sm(SEAM, SEAM + 1.5, y) * (1 - sm(SEAM + 36, GY1, y));
    const lowerLip = sm(SEAM, SEAM + 4, y) * (1 - sm(SEAM + 10, SEAM + 16, y));
    const upperLip = sm(SEAM - 12, SEAM - 6, y) * (1 - sm(SEAM - 1, SEAM + 0.5, y));
    const band = gauss(y, SEAM + 2 + jaw * 3, 9);
    // vertical: jaw drops (lower lip and chin), upper lip lifts a little, tuck and press move the lips
    let dy = jaw * 13 * lower * wx * wx;
    dy -= jaw * 1.8 * upperLip * wx;
    dy -= B.tuck * 1.6 * lowerLip * wx;
    dy += B.press * 0.9 * upperLip * wx - B.press * 0.7 * lowerLip * wx;
    dy -= B.round * 0.8 * upperLip * wx;
    // horizontal: rounding narrows the mouth, spread widens it and lifts the corners
    const dxFac = -0.30 * B.round + 0.17 * B.spread;
    const dx = (x - CX) * dxFac * band;
    const corner = gauss(Math.abs(x - CX), 26, 9) * band;
    dy -= B.spread * 1.7 * corner;
    return [x + dx * edge, y + dy * edge];
  };
  const tri = (sx0: number, sy0: number, sx1: number, sy1: number, sx2: number, sy2: number,
               dx0: number, dy0: number, dx1: number, dy1: number, dx2: number, dy2: number) => {
    const det = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
    if (Math.abs(det) < 1e-6) return;
    const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / det;
    const b = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / det;
    const c = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / det;
    const dd = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / det;
    const e = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / det;
    const f = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / det;
    const cx = (dx0 + dx1 + dx2) / 3; const cy = (dy0 + dy1 + dy2) / 3;
    const grow = (x: number, y: number) => { const vx = x - cx; const vy = y - cy; const l = Math.sqrt(vx * vx + vy * vy) || 1; return [x + (vx / l) * 0.6, y + (vy / l) * 0.6]; };
    const p0 = grow(dx0, dy0); const p1 = grow(dx1, dy1); const p2 = grow(dx2, dy2);
    const bx = Math.floor(Math.min(sx0, sx1, sx2)) - 1; const by = Math.floor(Math.min(sy0, sy1, sy2)) - 1;
    const bw = Math.ceil(Math.max(sx0, sx1, sx2)) - bx + 1; const bh = Math.ceil(Math.max(sy0, sy1, sy2)) - by + 1;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, dd, e, f);
    ctx.drawImage(img, bx, by, bw, bh, bx, by, bw, bh);
    ctx.restore();
  };
  let nod = 0;
  let jawPrev = 0;
  const render = (now: number, bus: Bus, look: Look) => {
    if (!ready) { fallback.render(now, bus, look); return; }
    const t = now * 0.001;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a1226'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const small = W < 260;
    const zoom = small ? 2.1 : 1.08;
    const s = (W / 640) * zoom * pr;
    const faceYOut = small ? H * 0.44 : H * 0.34;
    const ox = canvas.width / 2 - CX * s;
    const oy = faceYOut * pr - 190 * s;
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.4, 0, canvas.width / 2, canvas.height * 0.4, canvas.height * 0.7);
    g.addColorStop(0, 'rgba(0,243,255,' + (0.10 + bus.amp * 0.22).toFixed(3) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);

    nod += ((bus.amp > 0.4 ? 1 : 0) - nod) * 0.12;
    const sway = Math.sin(t * 0.7) * 0.006 + look.yaw * 0.01 + Math.sin(t * 1.9) * bus.amp * 0.003;
    const breathe = 1 + Math.sin(t * 1.4) * 0.002;
    ctx.translate(canvas.width / 2, canvas.height + 40 * s);
    ctx.rotate(sway);
    ctx.scale(breathe, breathe);
    ctx.translate(-canvas.width / 2, -(canvas.height + 40 * s));
    // the head dips a touch as the jaw drops
    ctx.translate(ox, oy + nod * 1.2 * pr + bus.mouth * 1.6 * pr);
    ctx.scale(s, s);
    const jaw = Math.max(0, Math.min(1, bus.mouth));
    const active = jaw > 0.02 || bus.round > 0.05 || bus.spread > 0.05 || bus.press > 0.05 || bus.tuck > 0.05;
    jawPrev = jaw;
    ctx.drawImage(active && clean ? clean : img, 0, 0);
    if (!active) return;

    // warp the lower face: grid vertices displaced by the articulators
    const nx = XS.length; const ny = YS.length;
    const dxv: number[] = []; const dyv: number[] = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const r = field(XS[i], YS[j], bus, jaw); dxv.push(r[0]); dyv.push(r[1]);
    }
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i; const b = a + 1; const c = a + nx; const d = c + 1;
        tri(XS[i], YS[j], XS[i + 1], YS[j], XS[i], YS[j + 1], dxv[a], dyv[a], dxv[b], dyv[b], dxv[c], dyv[c]);
        tri(XS[i + 1], YS[j], XS[i + 1], YS[j + 1], XS[i], YS[j + 1], dxv[b], dyv[b], dxv[d], dyv[d], dxv[c], dyv[c]);
      }
    }

    // mouth interior: exactly the strip of the lip seam that the jaw stretched open
    // (top edge = seam row, bottom edge = first row of the lower lip), so no pink layer shows inside
    const topPts: number[][] = []; const botPts: number[][] = [];
    for (let x = CX - 23; x <= CX + 23; x += 1.2) {
      const u = (x - CX) / 23; const taper = Math.pow(Math.max(0, 1 - u * u), 0.65);
      const tp = field(x, SEAM, bus, jaw); const bt = field(x, SEAM + 1.5, bus, jaw);
      const open = Math.max(0, bt[1] - tp[1] - 1.5) * taper;
      topPts.push(tp); botPts.push([bt[0], tp[1] + open]);
    }
    let anyOpen = false; for (let i = 0; i < topPts.length; i++) if (botPts[i][1] - topPts[i][1] > 0.7) { anyOpen = true; break; }
    if (!anyOpen) { topPts.length = 0; botPts.length = 0; }
    if (topPts.length > 3) {
      let minY = 1e9; let maxY = -1e9;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(topPts[0][0], topPts[0][1]);
      for (let i = 1; i < topPts.length; i++) ctx.lineTo(topPts[i][0], topPts[i][1]);
      for (let i = botPts.length - 1; i >= 0; i--) ctx.lineTo(botPts[i][0], botPts[i][1]);
      ctx.closePath();
      for (let i = 0; i < topPts.length; i++) { if (topPts[i][1] < minY) minY = topPts[i][1]; if (botPts[i][1] > maxY) maxY = botPts[i][1]; }
      const hh = maxY - minY;
      const mg = ctx.createLinearGradient(0, minY, 0, maxY);
      mg.addColorStop(0, 'rgb(36,9,13)'); mg.addColorStop(0.6, 'rgb(52,16,20)'); mg.addColorStop(1, 'rgb(86,38,40)');
      ctx.fillStyle = mg; ctx.shadowColor = 'rgba(46,14,18,0.9)'; ctx.shadowBlur = 2.2 * pr; ctx.fill(); ctx.shadowBlur = 0;
      ctx.clip();
      const wMid = (topPts[topPts.length - 1][0] - topPts[0][0]);
      // tongue first, so teeth sit in front of it
      if (hh > 4.5) {
        ctx.fillStyle = 'rgba(170,84,84,' + Math.min(0.85, (hh - 4) * 0.25).toFixed(2) + ')';
        ctx.beginPath(); ctx.ellipse(CX, maxY - 0.3, wMid * 0.2, Math.max(0.4, hh * 0.22), 0, 0, Math.PI * 2); ctx.fill();
      }
      const rr = (x: number, y: number, w: number, h: number, rt: number, rb: number) => {
        ctx.beginPath();
        ctx.moveTo(x + rt, y); ctx.lineTo(x + w - rt, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rt);
        ctx.lineTo(x + w, y + h - rb); ctx.quadraticCurveTo(x + w, y + h, x + w - rb, y + h);
        ctx.lineTo(x + rb, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rb);
        ctx.lineTo(x, y + rt); ctx.quadraticCurveTo(x, y, x + rt, y); ctx.closePath();
      };
      const squeeze = 1 - bus.round * 0.35;
      // upper teeth: two central incisors, two laterals, two canines, each its own shape
      if (hh > 1.1 && bus.round < 0.8) {
        const th = Math.min(hh * 0.58, 5.8);
        const rows: number[][] = [[-3.0, 6.0, 1.0], [3.0, 6.0, 1.0], [-8.3, 4.6, 0.88], [8.3, 4.6, 0.88], [-12.8, 4.4, 0.76], [12.8, 4.4, 0.76]];
        for (let i = 0; i < rows.length; i++) {
          const cx = CX + rows[i][0] * squeeze; const w = rows[i][1] * squeeze - 0.45; const h = th * rows[i][2];
          const x0 = cx - w / 2; const y0 = minY - 0.6;
          const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
          g.addColorStop(0, 'rgb(196,176,150)'); g.addColorStop(0.22, 'rgb(240,232,216)'); g.addColorStop(0.75, 'rgb(248,243,232)'); g.addColorStop(1, 'rgb(228,216,196)');
          ctx.fillStyle = g; rr(x0, y0, w, h + 0.6, 0.2, Math.min(1.4, w * 0.3)); ctx.fill();
          // tooth edge shading so each reads as a rounded form
          const sg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
          sg.addColorStop(0, 'rgba(120,96,76,0.30)'); sg.addColorStop(0.28, 'rgba(120,96,76,0)'); sg.addColorStop(0.72, 'rgba(120,96,76,0)'); sg.addColorStop(1, 'rgba(120,96,76,0.30)');
          ctx.fillStyle = sg; rr(x0, y0, w, h + 0.6, 0.2, Math.min(1.4, w * 0.3)); ctx.fill();
        }
        // buccal corridor: the outer teeth fall into shadow, as in a real mouth
        const sh = ctx.createLinearGradient(CX - 17, 0, CX + 17, 0);
        sh.addColorStop(0, 'rgba(46,14,18,0.62)'); sh.addColorStop(0.32, 'rgba(46,14,18,0.08)'); sh.addColorStop(0.5, 'rgba(46,14,18,0)'); sh.addColorStop(0.68, 'rgba(46,14,18,0.08)'); sh.addColorStop(1, 'rgba(46,14,18,0.62)');
        ctx.fillStyle = sh; ctx.fillRect(CX - 17, minY - 0.6, 34, th + 1.2);
        // soft shadow cast by the upper lip onto the teeth
        const ls = ctx.createLinearGradient(0, minY - 0.6, 0, minY + 1.6);
        ls.addColorStop(0, 'rgba(60,24,24,0.45)'); ls.addColorStop(1, 'rgba(60,24,24,0)');
        ctx.fillStyle = ls; ctx.fillRect(CX - 17, minY - 0.6, 34, 2.2);
      }
      // lower teeth on wide-open sounds: smaller, a little dimmer, rising from the lower lip
      if (hh > 4.2 && bus.round < 0.5) {
        const lh = Math.min(2.6, (hh - 3.4) * 0.5);
        for (let i = -3; i <= 2; i++) {
          const w = 3.7 * squeeze; const x0 = CX + (i + 0.5) * 3.7 * squeeze - w / 2 + 0.2; const y0 = maxY - lh;
          const g = ctx.createLinearGradient(0, y0, 0, y0 + lh);
          g.addColorStop(0, 'rgb(226,214,198)'); g.addColorStop(1, 'rgb(190,174,156)');
          ctx.fillStyle = g; rr(x0, y0, w - 0.4, lh + 0.8, Math.min(1.2, w * 0.3), 0.2); ctx.fill();
        }
        const sh2 = ctx.createLinearGradient(CX - 12, 0, CX + 12, 0);
        sh2.addColorStop(0, 'rgba(46,14,18,0.55)'); sh2.addColorStop(0.4, 'rgba(46,14,18,0)'); sh2.addColorStop(0.6, 'rgba(46,14,18,0)'); sh2.addColorStop(1, 'rgba(46,14,18,0.55)');
        ctx.fillStyle = sh2; ctx.fillRect(CX - 12, maxY - lh, 24, lh + 1);
      }
      ctx.restore();
    }
    // closed lips: a faint seam so p/b/m read clearly
    if (bus.press > 0.3) {
      ctx.strokeStyle = 'rgba(120,56,58,' + (0.35 * bus.press).toFixed(2) + ')'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(CX - 19, SEAM + 0.6); ctx.quadraticCurveTo(CX, SEAM + 1.4, CX + 19, SEAM + 0.6); ctx.stroke();
    }
  };
  const B0 = (v: number) => Math.max(0, Math.min(1, v));
  return { kind: 'Photo host', render: render, resize: resize, dispose: function () { fallback.dispose(); } };
}
