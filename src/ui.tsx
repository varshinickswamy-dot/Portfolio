/* ============================================================
   UI: React components (Framer Motion for motion, Tailwind for style)
   ============================================================ */

const { useState, useEffect, useRef, useSyncExternalStore } = React;
const { motion, AnimatePresence, MotionConfig, useMotionValue, useSpring, useTransform, animate } = Motion;

function useHost(): HostState {
  return useSyncExternalStore(voice.subscribe, voice.getState, voice.getState);
}

function useSeen(ref: any): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return seen;
}

function wait(ms: number): Promise<void> {
  return new Promise<void>((r) => { window.setTimeout(r, ms); });
}

/* ---------------- tour director ---------------- */

const director = {
  run: 0,
  focus(target: string, block: 'start' | 'center') {
    const el = document.getElementById(target);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: block });
  },
  async intro() {
    this.run++;
    voice.update({ touring: false, tourIndex: -1, target: 'hero' });
    await voice.say(INTRO);
    if (!voice.getState().touring) voice.update({ target: '' });
  },
  async ask(a: Ask) {
    this.run++;
    voice.update({ touring: false, tourIndex: -1, target: a.target });
    if (a.target !== 'hero') this.focus(a.target, 'start');
    await voice.say(a.lines);
    voice.update({ target: '' });
  },
  async hear(p: Project) {
    this.run++;
    voice.update({ touring: false, tourIndex: -1, target: 'proj-' + p.id });
    await voice.say(p.pitch);
    voice.update({ target: '' });
  },
  async tour(from: number) {
    const run = ++this.run;
    voice.update({ touring: true });
    for (let i = from; i < TOUR.length; i++) {
      if (run !== this.run) return;
      const step = TOUR[i];
      voice.update({ tourIndex: i, target: step.target });
      await wait(140);
      if (run !== this.run) return;
      this.focus(step.target, step.block);
      await wait(650);
      if (run !== this.run) return;
      const ok = await voice.say(step.lines);
      if (!ok || run !== this.run) return;
      await wait(350);
    }
    if (run === this.run) voice.update({ touring: false, tourIndex: -1, target: '' });
  },
  next() {
    const to = voice.getState().tourIndex + 1;
    if (to >= TOUR.length) { this.stop(); return; }
    voice.cancel();
    this.tour(to);
  },
  prev() {
    const to = Math.max(0, voice.getState().tourIndex - 1);
    voice.cancel();
    this.tour(to);
  },
  stop() {
    this.run++;
    voice.cancel();
    voice.update({ touring: false, tourIndex: -1, target: '' });
  }
};

/* ---------------- icons ---------------- */

function Svg(props: { children: any; size?: number }) {
  const s = props.size || 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {props.children}
    </svg>
  );
}
const IconPlay = () => (<Svg><polygon points="6 3 20 12 6 21 6 3" /></Svg>);
const IconStop = () => (<Svg><rect x="5" y="5" width="14" height="14" rx="2" /></Svg>);
const IconVolume = () => (<Svg><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></Svg>);
const IconMute = () => (<Svg><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></Svg>);
const IconTour = () => (<Svg><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></Svg>);
const IconDown = () => (<Svg><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></Svg>);
const IconUpRight = () => (<Svg size={16}><path d="M7 7h10v10" /><path d="M7 17 17 7" /></Svg>);
const IconGithub = () => (<Svg><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></Svg>);
const IconLinkedin = () => (<Svg><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></Svg>);
const IconMail = () => (<Svg><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Svg>);
const IconPhone = () => (<Svg><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></Svg>);
const IconCopy = () => (<Svg size={16}><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></Svg>);
const IconNext = () => (<Svg size={16}><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" x2="19" y1="5" y2="19" /></Svg>);
const IconPrev = () => (<Svg size={16}><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" x2="5" y1="19" y2="5" /></Svg>);
const IconSpark = () => (<Svg size={16}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" /></Svg>);
const IconChevron = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-slate-500"><path d="m9 18 6-6-6-6" /></svg>);

/* ---------------- shared pieces ---------------- */

function ExtLink(props: { href: string; className?: string; children: any; label?: string }) {
  return (
    <a href={props.href} target="_blank" rel="noopener noreferrer" aria-label={props.label} className={props.className}>
      {props.children}
    </a>
  );
}

function TiltCard(props: { id?: string; className?: string; children: any; max?: number; active?: boolean }) {
  const max = props.max || 7;
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [max, -max]), { stiffness: 180, damping: 16 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-max, max]), { stiffness: 180, damping: 16 });
  const onMove = (e: any) => {
    if (e.pointerType === 'touch') return;
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    mx.set(px - 0.5); my.set(py - 0.5);
    el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
    el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
  };
  const onLeave = () => { mx.set(0); my.set(0); };
  return (
    <motion.div
      ref={ref}
      id={props.id}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      initial={{ opacity: 0.35, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={'glass glow ' + (props.active ? 'tour-active ' : '') + (props.className || '')}
    >
      {props.children}
    </motion.div>
  );
}

function CountUp(props: { to: number; decimals: number; suffix: string }) {
  const ref = useRef(null);
  const seen = useSeen(ref);
  const [v, setV] = useState(props.to);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setV(0);
    const c = animate(0, props.to, { duration: 1.4, ease: 'easeOut', onUpdate: (x: number) => setV(x) });
    return () => c.stop();
  }, [seen]);
  return <span ref={ref}>{v.toFixed(props.decimals)}{props.suffix}</span>;
}

function VoiceBars(props: { className?: string }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = window.requestAnimationFrame(loop);
      const el = ref.current as HTMLElement | null;
      if (!el) return;
      const kids = el.children;
      for (let i = 0; i < kids.length; i++) {
        (kids[i] as HTMLElement).style.transform = 'scaleY(' + (0.1 + Math.min(1, voice.bus.bars[i] * 1.6)).toFixed(3) + ')';
      }
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, []);
  const bars: any[] = [];
  for (let i = 0; i < 24; i++) bars.push(<span key={i} className="vbar" />);
  return <div ref={ref} aria-hidden="true" className={'flex items-end gap-[3px] ' + (props.className || '')}>{bars}</div>;
}

function HostCanvas(props: { active: boolean; label: string }) {
  const ref = useRef(null);
  const activeRef = useRef(props.active);
  activeRef.current = props.active;
  useEffect(() => {
    const canvas = ref.current as HTMLCanvasElement | null;
    if (!canvas) return;
    const rend = createRenderer(canvas, null as any);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let alive = true;
    let raf = 0;
    let nextBlink = performance.now() + 1800;
    let blinkStart = -1;
    let yaw = 0;
    let pitch = 0;
    const frame = (now: number) => {
      if (!alive) return;
      raf = window.requestAnimationFrame(frame);
      if (!activeRef.current) return;
      if (now > nextBlink && blinkStart < 0) { blinkStart = now; nextBlink = now + 2200 + Math.random() * 3200; }
      let blink = 0;
      if (blinkStart >= 0) {
        const p = (now - blinkStart) / 170;
        if (p >= 1) blinkStart = -1; else blink = 1 - Math.abs(p * 2 - 1);
      }
      const sway = reduce ? 0 : Math.sin(now * 0.0004) * 0.12;
      const ty = reduce ? 0 : pointer.x * 0.42 + sway;
      const tp = reduce ? 0 : pointer.y * 0.18;
      yaw += (ty - yaw) * 0.06;
      pitch += (tp - pitch) * 0.06;
      rend.render(now, voice.bus, { yaw: yaw, pitch: pitch, blink: 0 });
    };
    rend.resize();
    raf = window.requestAnimationFrame(frame);
    let ro: any = null;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => rend.resize()); ro.observe(canvas); }
    return () => {
      alive = false;
      window.cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      rend.dispose();
    };
  }, []);
  return <canvas ref={ref} role="img" aria-label={props.label} className="block h-full w-full" />;
}

function statusLabel(h: HostState): string {
  if (h.muted) return h.speaking ? 'Muted, captions on' : 'Muted';
  return h.speaking ? 'Speaking' : 'Ready';
}

/* ---------------- header ---------------- */

function Nav() {
  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:border-neon/50 hover:text-white';
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <nav aria-label="Primary" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 md:px-6">
        <a href="#hero" className="font-semibold tracking-tight text-white">Varshini M C</a>
        <div className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
          {NAV_ITEMS.map((it) => (
            <a key={it[1]} href={'#' + it[1]} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">{it[0]}</a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ExtLink href={LINKS.github} className={btn}><IconGithub />GitHub</ExtLink>
          <ExtLink href={LINKS.linkedin} className={btn}><IconLinkedin />LinkedIn</ExtLink>
        </div>
      </nav>
    </header>
  );
}

/* ---------------- hero with the AI host ---------------- */

function Hero(props: { slotRef: any; visible: boolean }) {
  const h = useHost();
  const talkingIntro = h.speaking && !h.touring;
  const primary = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition';
  return (
    <section id="hero" className={'relative px-4 pb-14 pt-28 md:px-6 md:pt-32 ' + (h.target === 'hero' ? 'tour-active' : '')}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
            <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />Open to internships and entry-level roles
          </p>
          <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">Varshini M C</h1>
          <p className="neon-text mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Aspiring Java Developer</p>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            I build database-driven web applications with Java, Servlets, JSP, JDBC and MySQL, and I ship machine learning models inside working apps. Meet my AI host, who will introduce me.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => (talkingIntro ? director.stop() : director.intro())}
              className={primary + ' bg-neon text-slate-950 hover:brightness-110'}>
              {talkingIntro ? <IconStop /> : <IconPlay />}{talkingIntro ? 'Stop voice' : 'Play AI Voice Intro'}
            </button>
            <button type="button" aria-pressed={h.muted} onClick={() => voice.toggleMute()}
              className={primary + ' border border-white/15 bg-white/5 text-white hover:border-neon/50 ' + (h.muted ? 'ring-1 ring-violet-400/60' : '')}>
              {h.muted ? <IconMute /> : <IconVolume />}{h.muted ? 'Unmute Host' : 'Mute Host'}
            </button>
            <button type="button" onClick={() => (h.touring ? director.stop() : director.tour(0))}
              className={primary + ' border border-violet-400/40 bg-violet-500/15 text-white hover:bg-violet-500/25'}>
              {h.touring ? <IconStop /> : <IconTour />}{h.touring ? 'Stop tour' : 'Interactive Audio Tour'}
            </button>
            <a href="#about" className={primary + ' border border-white/15 bg-white/5 text-white hover:border-neon/50'}>
              <IconDown />Explore Portfolio
            </a>
          </div>
          {!h.supported && (
            <p className="mt-4 max-w-xl text-sm text-amber-200/90">This browser has no speech synthesis, so the host will talk in captions with the same lip-sync.</p>
          )}
          <ul className="mt-7 flex flex-wrap gap-2" aria-label="Core stack">
            {['Java', 'Servlets', 'JSP', 'JDBC', 'MySQL', 'Python', 'React'].map((t) => (
              <li key={t} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-slate-300">{t}</li>
            ))}
          </ul>
        </div>

        <div className="order-1 lg:order-2">
          <div ref={props.slotRef} className="glass relative mx-auto aspect-square w-full max-w-[32rem] overflow-hidden rounded-[2rem]" style={{ background: '#050b1c' }}>
            <HostCanvas active={props.visible} label="Animated illustrated AI host, reacting to speech" />
            <div className="pointer-events-none absolute inset-0 host-vignette" />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-slate-200 backdrop-blur-md">
              <span className={'h-2 w-2 rounded-full ' + (h.speaking ? 'pulse-dot bg-neon' : h.muted ? 'bg-violet-400' : 'bg-emerald-400')} />{statusLabel(h)}
            </div>
            <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur-md">
              <VoiceBars className="mb-2 h-6" />
              <p aria-live="polite" className="min-h-[2.75rem] text-sm leading-snug text-slate-200">
                {h.caption || 'Press Play AI Voice Intro to hear the introduction. Captions appear here.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- about ---------------- */

function SectionHead(props: { title: string; lede?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{props.title}</h2>
      {props.lede && <p className="mt-3 text-slate-300">{props.lede}</p>}
    </div>
  );
}

function About() {
  const h = useHost();
  return (
    <section id="about" className={'scroll-mt-20 snap-start px-4 py-16 md:px-6 ' + (h.target === 'about' ? 'tour-active' : '')}>
      <div className="mx-auto max-w-6xl">
        <SectionHead title="About me" />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 text-lg leading-relaxed text-slate-300">
            <p>I like the part of an application where the code meets the data. My base is Core Java: object-oriented design, exception handling, multithreading and the Collections Framework. On top of it I build web apps with JDBC, Servlets, JSP, HTML5, CSS3 and MySQL.</p>
            <p>I write SQL beyond basic queries, including joins, subqueries, views, CTEs, indexes, triggers, stored procedures and window functions. Outside the Java stack I build applied AI projects in Python, from fraud detection to medical imaging.</p>
            <p>I study Information Science and Engineering at Vivekananda Institute of Engineering, Bengaluru, and I am a full stack development intern at Dhee Coding Lab. I want to build reliable, user-focused applications and keep learning modern development tools.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {STATS.map((s) => (
              <TiltCard key={s.label} max={9} className="p-5">
                <div className="text-4xl font-bold tracking-tight text-white"><CountUp to={s.to} decimals={s.decimals} suffix={s.suffix} /></div>
                <div className="mt-1 text-sm text-slate-400">{s.label}</div>
              </TiltCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- skills matrix ---------------- */

function Ring(props: { value: number; seen: boolean }) {
  const r = 26;
  const C = 2 * Math.PI * r;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={'Group average ' + props.value + ' percent'}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
      <motion.circle cx="34" cy="34" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={C} transform="rotate(-90 34 34)"
        initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: props.seen ? C * (1 - props.value / 100) : C }}
        transition={{ duration: 1.2, ease: 'easeOut' }} />
      <text x="34" y="39" textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffffff">{props.value}</text>
    </svg>
  );
}

function SkillGroupCard(props: { group: SkillGroup }) {
  const g = props.group;
  const ref = useRef(null);
  const seen = useSeen(ref);
  let sum = 0;
  for (let i = 0; i < g.skills.length; i++) sum += g.skills[i].l;
  const avg = Math.round(sum / g.skills.length);
  return (
    <TiltCard className="p-5 md:p-6">
      <div ref={ref}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">{g.name}</h3>
            <p className="text-sm text-slate-400">{g.blurb}</p>
          </div>
          <Ring value={avg} seen={seen} />
        </div>
        <ul className="mt-5 space-y-4">
          {g.skills.map((s, i) => (
            <li key={s.n}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-slate-100">{s.n}</span>
                <span className="font-mono text-xs text-neon">{s.l}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.l} aria-label={s.n}>
                <motion.div className="h-full rounded-full bar-fill" initial={{ width: '0%' }}
                  animate={{ width: seen ? s.l + '%' : '0%' }} transition={{ duration: 1, ease: 'easeOut', delay: i * 0.08 }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{s.note}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-xs">
          <span className="text-slate-400">Seen in</span>
          {g.proof.map((id) => {
            const p = PROJECTS.filter((x) => x.id === id)[0];
            if (!p) return null;
            return p.repo
              ? (<ExtLink key={id} href={p.repo} className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-slate-200 transition hover:border-neon/50">{p.name}<IconUpRight /></ExtLink>)
              : (<span key={id} className="rounded-md border border-white/10 px-2 py-1 text-slate-300">{p.name}</span>);
          })}
        </div>
      </div>
    </TiltCard>
  );
}

function Skills() {
  const h = useHost();
  return (
    <section id="skills" className={'scroll-mt-20 snap-start px-4 py-16 md:px-6 ' + (h.target === 'skills' ? 'tour-active' : '')}>
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#00f3ff" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
        </defs>
      </svg>
      <div className="mx-auto max-w-6xl">
        <SectionHead title="Skills matrix" lede="Levels are my own estimates, not test scores. Each group links to the projects where I used the skill." />
        <div className="grid gap-5 md:grid-cols-2">
          {SKILL_GROUPS.map((g) => (<SkillGroupCard key={g.id} group={g} />))}
        </div>
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Working style">
          {SOFT_SKILLS.map((t) => (<li key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">{t}</li>))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- projects ---------------- */

const FILTERS = ['Featured', 'All', 'Java', 'Python', 'JavaScript', 'AI & ML'];
function inFilter(p: Project, f: string): boolean {
  if (f === 'All') return true;
  if (f === 'Featured') return p.featured;
  return p.tags.indexOf(f) >= 0;
}

function ProjectCard(props: { p: Project }) {
  const p = props.p;
  const h = useHost();
  const open = p.status === 'Public repository';
  return (
    <TiltCard id={'proj-' + p.id} className="flex h-full flex-col p-5 md:p-6" active={h.target === 'proj-' + p.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">{p.sector}</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
          <span className={'h-2 w-2 rounded-full ' + (open ? 'pulse-dot bg-emerald-400' : 'bg-amber-300')} />{p.status}
        </span>
      </div>
      <h3 className="mt-3 text-xl font-semibold leading-snug text-white">{p.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.summary}</p>

      <div className="mt-4">
        <p className="mb-2 text-xs text-slate-400">Architecture</p>
        <ol className="flex flex-wrap items-center gap-1.5">
          {p.arch.map((a, i) => (
            <li key={a} className="flex items-center gap-1.5">
              <span className="rounded-md border border-neon/25 bg-neon/5 px-2 py-1 font-mono text-[11px] text-slate-100">{a}</span>
              {i < p.arch.length - 1 && <IconChevron />}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.archNote}</p>
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
        {p.stack.map((t) => (<li key={t} className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs text-violet-100">{t}</li>))}
      </ul>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <ExtLink href={p.repo || LINKS.repos} className="inline-flex items-center gap-2 rounded-lg bg-neon px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110">
          <IconGithub />{p.repo ? 'View GitHub Source' : 'Browse my repositories'}<IconUpRight />
        </ExtLink>
        <button type="button" onClick={() => director.hear(p)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white transition hover:border-violet-400/60">
          <IconSpark />Hear it from the AI
        </button>
      </div>
    </TiltCard>
  );
}

function Projects() {
  const h = useHost();
  const [filter, setFilter] = useState('Featured');
  const shown = PROJECTS.filter((p) => inFilter(p, filter));
  useEffect(() => {
    if (h.target.indexOf('proj-') === 0) {
      const id = h.target.slice(5);
      const inView = shown.some((p) => p.id === id);
      if (!inView) setFilter('Featured');
    }
  }, [h.target]);
  return (
    <section id="projects" className="scroll-mt-20 snap-start px-4 py-16 md:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHead title="Projects" lede="Each card links straight to the code on GitHub. Ask the AI host to explain any project out loud." />
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter projects">
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
              className={'rounded-lg border px-3 py-1.5 text-sm transition ' + (filter === f ? 'border-neon bg-neon/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30')}>
              {f} ({PROJECTS.filter((p) => inFilter(p, f)).length})
            </button>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {shown.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0.4, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                <ProjectCard p={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <p className="mt-6 text-sm text-slate-400">
          More repositories live on <ExtLink href={LINKS.repos} className="text-neon underline underline-offset-4">my GitHub profile</ExtLink>.
        </p>
      </div>
    </section>
  );
}

/* ---------------- experience, contact, footer ---------------- */

function Experience() {
  const h = useHost();
  return (
    <section id="experience" className={'scroll-mt-20 snap-start px-4 py-16 md:px-6 ' + (h.target === 'experience' ? 'tour-active' : '')}>
      <div className="mx-auto max-w-6xl">
        <SectionHead title="Experience and education" />
        <ol className="space-y-4">
          {EXPERIENCE.map((m, i) => (
            <motion.li key={m.title} initial={{ opacity: 0.4, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, delay: i * 0.05 }}
              className="glass grid gap-1 p-5 md:grid-cols-[11rem_1fr] md:gap-6">
              <time className="font-mono text-sm text-neon">{m.when}</time>
              <div>
                <h3 className="text-lg font-semibold text-white">{m.title}</h3>
                <p className="text-sm font-medium text-violet-200">{m.org}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{m.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
        <p className="mt-5 text-sm text-slate-300">Also pursuing the Java Full Stack Development certification at Dhee Coding Lab, Rajajinagar.</p>
      </div>
    </section>
  );
}

function CopyRow(props: { icon: any; label: string; value: string }) {
  const [state, setState] = useState('Copy');
  const ref = useRef(null);
  const copy = () => {
    const done = (m: string) => { setState(m); window.setTimeout(() => setState('Copy'), 1800); };
    const select = () => {
      const el = ref.current as HTMLElement | null;
      if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); if (s) { s.removeAllRanges(); s.addRange(r); } }
      done('Selected');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(props.value).then(() => done('Copied'), select);
    else select();
  };
  return (
    <div className="glass flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="text-neon">{props.icon}</span>
      <span className="w-14 text-sm text-slate-400">{props.label}</span>
      <code ref={ref} className="min-w-0 flex-1 break-all text-sm text-white">{props.value}</code>
      <button type="button" onClick={copy} className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:border-neon/60">
        <IconCopy />{state}
      </button>
    </div>
  );
}

function Contact() {
  const h = useHost();
  const card = 'glass glow flex items-center justify-between gap-3 px-5 py-4 text-white transition hover:-translate-y-0.5';
  return (
    <section id="contact" className={'scroll-mt-20 snap-start px-4 py-16 md:px-6 ' + (h.target === 'contact' ? 'tour-active' : '')}>
      <div className="mx-auto max-w-6xl">
        <SectionHead title="Let's talk" lede="I'm looking for Java full stack internships and entry-level roles in Bengaluru. Email is the quickest way to reach me." />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <CopyRow icon={<IconMail />} label="Email" value={LINKS.email} />
            <CopyRow icon={<IconPhone />} label="Phone" value={LINKS.phone} />
          </div>
          <div className="grid gap-3">
            <ExtLink href={LINKS.linkedin} className={card}><span className="inline-flex items-center gap-3"><IconLinkedin />LinkedIn profile</span><IconUpRight /></ExtLink>
            <ExtLink href={LINKS.github} className={card}><span className="inline-flex items-center gap-3"><IconGithub />GitHub profile</span><IconUpRight /></ExtLink>
            <ExtLink href={LINKS.repos} className={card}><span className="inline-flex items-center gap-3"><IconGithub />All repositories</span><IconUpRight /></ExtLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-slate-400 md:px-6">
      <p>Varshini M C, Bengaluru, Karnataka. Built with React, TypeScript, Tailwind CSS, Framer Motion and Three.js.</p>
      <p className="mt-1">The AI host reads scripted answers and uses your browser's voice. Lip-sync follows the words being spoken.</p>
    </footer>
  );
}

/* ---------------- floating AI dock ---------------- */

function AIDock(props: { show: boolean; fly: { x: number; y: number; s: number } }) {
  const h = useHost();
  const [open, setOpen] = useState(false);
  const full = Math.min(336, (typeof window !== 'undefined' ? window.innerWidth : 360) - 32);
  const round = 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-neon/60';
  const talking = h.speaking && !h.touring;
  const step = h.touring && h.tourIndex >= 0 ? TOUR[h.tourIndex] : null;
  return (
    <AnimatePresence>
      {props.show && (
        <motion.aside key="dock" aria-label="AI host"
          initial={{ opacity: 0, x: props.fly.x, y: props.fly.y, scale: props.fly.s }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6, y: 40 }}
          transition={{ type: 'spring', stiffness: 110, damping: 18 }}
          style={{ transformOrigin: 'bottom right', right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
          className="fixed z-40">
          <motion.div animate={{ width: open ? full : 156 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="glass overflow-hidden rounded-3xl shadow-2xl shadow-black/50" style={{ background: 'rgba(5,11,28,0.92)' }}>
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Collapse AI host' : 'Open AI host'}
              className="relative block h-36 w-full">
              <HostCanvas active={props.show} label="AI host visualizer" />
              <span className="pointer-events-none absolute inset-0 host-vignette" />
              <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2 py-0.5 text-[11px] text-slate-200">
                <span className={'h-1.5 w-1.5 rounded-full ' + (h.speaking ? 'pulse-dot bg-neon' : h.muted ? 'bg-violet-400' : 'bg-emerald-400')} />{statusLabel(h)}
              </span>
              {!open && <span className="absolute inset-x-0 bottom-1 text-center text-[11px] text-slate-300">Tap to talk</span>}
            </button>

            <div className="flex items-center justify-center gap-2 px-3 py-2">
              <button type="button" className={round} aria-label={talking ? 'Stop voice' : 'Play intro'} onClick={() => (talking ? director.stop() : director.intro())}>{talking ? <IconStop /> : <IconPlay />}</button>
              <button type="button" className={round} aria-pressed={h.muted} aria-label={h.muted ? 'Unmute host' : 'Mute host'} onClick={() => voice.toggleMute()}>{h.muted ? <IconMute /> : <IconVolume />}</button>
              <button type="button" className={round} aria-label={h.touring ? 'Stop tour' : 'Start audio tour'} onClick={() => (h.touring ? director.stop() : director.tour(0))}>{h.touring ? <IconStop /> : <IconTour />}</button>
            </div>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div key="panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="space-y-3 px-4 pb-4">
                    <VoiceBars className="h-5" />
                    <p aria-live="polite" className="min-h-[3rem] rounded-xl bg-white/5 p-3 text-sm leading-snug text-slate-200">
                      {h.caption || 'Ask me something below, or start the audio tour.'}
                    </p>
                    {step && (
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                        <span className="truncate">Tour {h.tourIndex + 1} of {TOUR.length}: {step.title}</span>
                        <span className="flex gap-1.5">
                          <button type="button" aria-label="Previous stop" onClick={() => director.prev()} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 hover:border-neon/60"><IconPrev /></button>
                          <button type="button" aria-label="Next stop" onClick={() => director.next()} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 hover:border-neon/60"><IconNext /></button>
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {ASKS.map((a) => (
                        <button key={a.label} type="button" onClick={() => director.ask(a)}
                          className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-100 transition hover:border-violet-400/60">{a.label}</button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ---------------- app ---------------- */

function App() {
  const slotRef = useRef(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [fly, setFly] = useState({ x: 0, y: -320, s: 2 });
  useEffect(() => {
    const el = slotRef.current as HTMLElement | null;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      const vis = e.isIntersecting && e.intersectionRatio >= 0.15;
      if (!vis) {
        const r = el.getBoundingClientRect();
        const dx = r.left + r.width / 2 - (window.innerWidth - 16 - 78);
        const dy = r.top + r.height / 2 - (window.innerHeight - 16 - 90);
        const lim = window.innerHeight * 1.1;
        setFly({ x: dx, y: Math.max(-lim, Math.min(lim, dy)), s: Math.max(1, Math.min(3, r.width / 156)) });
      }
      setHeroVisible(vis);
    }, { threshold: [0, 0.15] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const stop = () => { voice.cancel(); };
    window.addEventListener('pagehide', stop);
    return () => window.removeEventListener('pagehide', stop);
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative isolate overflow-x-clip bg-slate-950 text-slate-200">
        <div className="pointer-events-none fixed inset-0 z-0 backdrop-grid" aria-hidden="true" />
        <div className="relative z-10">
          <Nav />
          <main>
            <Hero slotRef={slotRef} visible={heroVisible} />
            <About />
            <Skills />
            <Projects />
            <Experience />
            <Contact />
          </main>
          <Footer />
        </div>
        <AIDock show={!heroVisible} fly={fly} />
      </div>
    </MotionConfig>
  );
}

const rootEl = document.getElementById('root') as HTMLElement;
rootEl.textContent = '';
ReactDOM.createRoot(rootEl).render(<App />);
