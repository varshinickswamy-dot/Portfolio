import * as React from 'react';
import * as ReactDOMClient from 'react-dom/client';
window.React = React;
window.ReactDOM = ReactDOMClient;

/* ---------- Minimal motion library (the subset the portfolio uses) ---------- */
const { createElement, forwardRef, useRef, useEffect, useLayoutEffect, useState, useContext, createContext, Fragment } = React;
const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const ReducedCtx = createContext(false);
const PresenceCtx = createContext(null);

const EASE = { easeOut: 'cubic-bezier(0.22, 0.61, 0.36, 1)', easeIn: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)', easeInOut: 'ease-in-out', linear: 'linear' };
const TRANSFORM_KEYS = ['x', 'y', 'scale', 'rotate', 'rotateX', 'rotateY'];
const UNITLESS = { opacity: 1, scale: 1, strokeDashoffset: 1 };

function px(k, v) {
  if (typeof v === 'number' && !UNITLESS[k] && TRANSFORM_KEYS.indexOf(k) < 0) return v + 'px';
  return v;
}
function buildTransform(t) {
  let s = '';
  if (t.perspective) s += 'perspective(' + t.perspective + 'px) ';
  if (t.x != null || t.y != null) s += 'translate(' + (t.x || 0) + 'px,' + (t.y || 0) + 'px) ';
  if (t.rotateX != null) s += 'rotateX(' + t.rotateX + 'deg) ';
  if (t.rotateY != null) s += 'rotateY(' + t.rotateY + 'deg) ';
  if (t.rotate != null) s += 'rotate(' + t.rotate + 'deg) ';
  if (t.scale != null) s += 'scale(' + t.scale + ') ';
  return s.trim();
}
/* Turn a { opacity, x, y, scale, width ... } target into plain CSS properties. */
function toCss(target) {
  const css = {}; const tf = {}; let hasTf = false;
  for (const k in target) {
    if (TRANSFORM_KEYS.indexOf(k) >= 0) { tf[k] = target[k]; hasTf = true; } else css[k] = px(k, target[k]);
  }
  if (hasTf) css.transform = buildTransform(tf);
  return css;
}
function duration(tr) {
  if (!tr) return 0.4;
  if (tr.type === 'spring') return Math.max(0.35, Math.min(0.9, 6 / Math.sqrt(tr.stiffness || 100) * 0.5 + 0.2));
  return tr.duration != null ? tr.duration : 0.4;
}
function applyStyles(el, css) { for (const k in css) { try { el.style[k] = css[k]; } catch (e) {} } }

/* Animate an element from its current look to `target` using CSS transitions. */
function run(el, target, tr, done, svgAttr) {
  const css = toCss(target);
  const d = duration(tr);
  const delay = (tr && tr.delay) || 0;
  const ease = tr && tr.type === 'spring' ? 'cubic-bezier(0.34, 1.3, 0.5, 1)' : (EASE[tr && tr.ease] || EASE.easeOut);
  const props = Object.keys(css).map(function (k) { return k.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }); });
  el.style.transition = props.map(function (p) { return p + ' ' + d + 's ' + ease + ' ' + delay + 's'; }).join(',');
  // height: 'auto' cannot transition, so measure it
  let finalHeight = null;
  if (css.height === 'auto') { el.style.height = 'auto'; css.height = el.scrollHeight + 'px'; finalHeight = 'auto'; el.style.height = el.__from || '0px'; void el.offsetHeight; }
  applyStyles(el, css);
  let finished = false;
  const end = function () {
    if (finished) return; finished = true;
    if (finalHeight) { el.style.transition = 'none'; el.style.height = 'auto'; }
    if (done) done();
  };
  const t = window.setTimeout(end, (d + delay) * 1000 + 60);
  return function cancel() { finished = true; window.clearTimeout(t); };
}

/* ---------- motion values ---------- */
function MV(v) { this.v = v; this.subs = []; }
MV.prototype.get = function () { return this.v; };
MV.prototype.set = function (x) { if (x === this.v) return; this.v = x; this.subs.forEach(function (f) { f(x); }); };
MV.prototype.on = function (f) { this.subs.push(f); const s = this.subs; return function () { const i = s.indexOf(f); if (i >= 0) s.splice(i, 1); }; };
function isMV(x) { return x instanceof MV; }
function useMotionValue(v) { const r = useRef(null); if (!r.current) r.current = new MV(v); return r.current; }
function useTransform(src, inp, out) {
  const r = useRef(null);
  if (!r.current) {
    const mv = new MV(0);
    const map = function (x) {
      const t = Math.max(0, Math.min(1, (x - inp[0]) / (inp[1] - inp[0])));
      return out[0] + (out[1] - out[0]) * t;
    };
    mv.set(map(src.get()));
    src.on(function (x) { mv.set(map(x)); });
    r.current = mv;
  }
  return r.current;
}
/* Critically-tuned spring follower driven by requestAnimationFrame. */
function useSpring(src, cfg) {
  const r = useRef(null);
  if (!r.current) {
    const mv = new MV(src.get());
    let vel = 0, raf = 0, last = 0;
    const k = (cfg && cfg.stiffness) || 170, c = (cfg && cfg.damping) || 26;
    const step = function (now) {
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016); last = now;
      const target = src.get();
      vel += (k * (target - mv.v) - c * vel) * dt;
      const nv = mv.v + vel * dt;
      if (Math.abs(vel) < 0.01 && Math.abs(target - nv) < 0.01) { mv.set(target); raf = 0; return; }
      mv.set(nv); raf = requestAnimationFrame(step);
    };
    src.on(function () { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } });
    r.current = mv;
  }
  return r.current;
}
function animate(from, to, opts) {
  let raf = 0, stopped = false;
  const d = ((opts && opts.duration) || 0.5) * 1000;
  const t0 = performance.now();
  const f = function (now) {
    if (stopped) return;
    const p = Math.min(1, (now - t0) / d);
    const e = 1 - Math.pow(1 - p, 3);
    if (opts && opts.onUpdate) opts.onUpdate(from + (to - from) * e);
    if (p < 1) raf = requestAnimationFrame(f);
  };
  raf = requestAnimationFrame(f);
  return { stop: function () { stopped = true; cancelAnimationFrame(raf); } };
}

/* ---------- motion.<tag> ---------- */
const STRIP = { initial: 1, animate: 1, exit: 1, transition: 1, whileInView: 1, viewport: 1, layout: 1, layoutId: 1, variants: 1, whileHover: 1, whileTap: 1 };

const cache = {};
function make(tag) {
  return forwardRef(function Motion(props, fwd) {
    const own = useRef(null);
    const reduced = useContext(ReducedCtx);
    const presence = useContext(PresenceCtx);
    const ref = function (n) { own.current = n; if (typeof fwd === 'function') fwd(n); else if (fwd) fwd.current = n; };
    const clean = {}; let style = {}; const mvs = {};
    for (const k in props) {
      if (STRIP[k]) continue;
      if (k === 'style') {
        for (const s in props.style) {
          const v = props.style[s];
          if (isMV(v)) mvs[s] = v; else if (s === 'transformPerspective') mvs.__persp = v; else style[s] = v;
        }
      } else clean[k] = props[k];
    }
    const svg = tag === 'circle';
    const initialCss = props.initial && !reduced && !(presence && presence.leaving) ? toCss(props.initial) : null;
    const firstStyle = useRef(null);
    if (!firstStyle.current) firstStyle.current = Object.assign({}, style, initialCss || {});
    clean.style = firstStyle.current;
    clean.ref = ref;

    // keep non-animated style updates (e.g. transformOrigin) in sync
    useIso(function () { if (own.current) applyStyles(own.current, style); });

    // motion-value driven transforms (tilt)
    useEffect(function () {
      const keys = Object.keys(mvs).filter(function (k) { return k !== '__persp'; });
      if (!keys.length) return;
      const el = own.current;
      const draw = function () {
        const t = { perspective: mvs.__persp };
        keys.forEach(function (k) { t[k] = mvs[k].get(); });
        if (el) el.style.transform = buildTransform(t);
      };
      const offs = keys.map(function (k) { return mvs[k].on(draw); });
      draw();
      return function () { offs.forEach(function (o) { o(); }); };
    }, []);

    // animate prop changes
    const animKey = JSON.stringify(props.animate || null);
    useEffect(function () {
      const el = own.current;
      if (!el || !props.animate || props.whileInView) return;
      if (reduced) { applyStyles(el, toCss(props.animate)); return; }
      el.__from = el.getBoundingClientRect().height + 'px';
      // let the initial styles paint first
      const id = requestAnimationFrame(function () { run(el, props.animate, props.transition); });
      return function () { cancelAnimationFrame(id); };
    }, [animKey, reduced]);

    // scroll-triggered animation
    useEffect(function () {
      const el = own.current;
      if (!el || !props.whileInView) return;
      if (reduced || typeof IntersectionObserver === 'undefined') { applyStyles(el, toCss(props.whileInView)); return; }
      const vp = props.viewport || {};
      const io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { run(el, props.whileInView, props.transition); if (vp.once !== false) io.disconnect(); }
        });
      }, { threshold: Math.min(vp.amount || 0.1, 0.3) });
      io.observe(el);
      return function () { io.disconnect(); };
    }, [reduced]);

    // exit animation (driven by AnimatePresence)
    useEffect(function () {
      if (!presence || !presence.leaving) return;
      const el = own.current;
      if (!el || !props.exit || reduced) { presence.done(); return; }
      if (props.exit.height === 0) el.style.height = el.scrollHeight + 'px';
      void el.offsetHeight;
      run(el, props.exit, props.transition, presence.done);
    }, [presence && presence.leaving]);

    return createElement(tag, clean, props.children);
  });
}
const motion = new Proxy({}, { get: function (_, tag) { return cache[tag] || (cache[tag] = make(tag)); } });

/* Keeps removed children mounted until their exit animation finishes. */
function AnimatePresence(props) {
  const kids = React.Children.toArray(props.children).filter(Boolean);
  const [, force] = useState(0);
  const held = useRef({});
  const present = {};
  kids.forEach(function (c) { present[c.key] = true; held.current[c.key] = c; });
  const out = [];
  const order = Object.keys(held.current);
  order.forEach(function (k) {
    const leaving = !present[k];
    out.push(createElement(PresenceCtx.Provider, {
      key: k,
      value: { leaving: leaving, done: function () { delete held.current[k]; force(function (n) { return n + 1; }); } }
    }, held.current[k]));
  });
  return createElement(Fragment, null, out);
}
function MotionConfig(props) {
  const [reduced, setReduced] = useState(function () { return props.reducedMotion === 'user' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; });
  return createElement(ReducedCtx.Provider, { value: reduced }, props.children);
}

window.Motion = { motion, AnimatePresence, MotionConfig, useMotionValue, useSpring, useTransform, animate };
