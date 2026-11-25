/* Nut N But Prius — motion: WebGL fire, embers + lightning, frost, GSAP scroll, ride selector, battery check */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 900px)').matches;
  const canHover = matchMedia('(hover: hover)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function onVisible(el, on, off) {
    if (!el) return;
    new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? on() : off())), { rootMargin: '120px' }).observe(el);
  }

  /* ================= FIRE (WebGL, procedural) ================= */
  const FS = `
precision mediump float;
uniform vec2 R; uniform float T; uniform float P; uniform float I;
float hash(vec2 p){ p=fract(p*vec2(234.34,435.345)); p+=dot(p,p+34.23); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / R;
  vec2 p = vec2(uv.x * R.x / R.y, uv.y);
  float t = T;
  vec2 q = vec2(fbm(p*1.6 + vec2(0.0, -t*0.8)), fbm(p*1.6 + vec2(4.7, -t*1.0)));
  float n  = fbm(p*vec2(2.2,1.6) + q*1.6 - vec2(0.0, t*1.7));
  float n2 = fbm(p*vec2(5.0,3.0) - vec2(0.0, t*3.4));
  float tongue = fbm(vec2(p.x*1.1 + 3.0, t*0.18));
  float reach = 0.40 + 0.72*tongue;
  float v = (n*1.15 + n2*0.25 - (uv.y/reach)*0.95) * P;
  float f = smoothstep(0.02, 0.95, clamp(v, 0.0, 1.0));
  vec3 c = vec3(1.55*f, 1.15*pow(f,2.2), 0.85*pow(f,5.0)) * I;
  c += vec3(0.35,0.08,0.0) * pow(1.0-uv.y, 4.0) * P * I * 0.6;
  gl_FragColor = vec4(c, 1.0);
}`;
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

  function makeFire(canvas, { scale = 0.5, intensity = 1, speed = 1 } = {}) {
    if (!canvas) return null;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) { canvas.style.display = 'none'; return null; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return null; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'R'), uT = gl.getUniformLocation(prog, 'T');
    const uP = gl.getUniformLocation(prog, 'P'), uI = gl.getUniformLocation(prog, 'I');
    let power = 0, target = 0, running = false, raf = 0;
    const t0 = performance.now() - Math.random() * 20000;
    function resize() {
      const w = Math.max(2, Math.round(canvas.clientWidth * DPR * scale));
      const h = Math.max(2, Math.round(canvas.clientHeight * DPR * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }
    function draw(now) {
      power += (target - power) * 0.035;
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, ((now - t0) / 1000) * speed);
      gl.uniform1f(uP, power);
      gl.uniform1f(uI, intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function frame(now) { draw(now); if (running) raf = requestAnimationFrame(frame); }
    resize();
    addEventListener('resize', resize);
    return {
      start() { if (!running && !reduce) { running = true; raf = requestAnimationFrame(frame); } },
      stop() { running = false; cancelAnimationFrame(raf); },
      ignite(v = 1) { target = v; if (reduce) { power = v; draw(performance.now() + 4000); } },
      still() { power = target; draw(performance.now()); },
    };
  }

  /* ================= EMBERS + LIGHTNING (2D) ================= */
  function makeSparks(canvas, art, flash) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, running = false, raf = 0, nextBolt = performance.now() + 2600;
    const N = small ? 42 : 95;
    const parts = [], bolts = [];
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext('2d');
    const g = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,230,1)');
    g.addColorStop(0.18, 'rgba(255,200,90,.95)');
    g.addColorStop(0.45, 'rgba(255,110,10,.35)');
    g.addColorStop(1, 'rgba(255,60,0,0)');
    sg.fillStyle = g; sg.fillRect(0, 0, 64, 64);

    function resize() {
      W = canvas.width = Math.round(canvas.clientWidth * DPR);
      H = canvas.height = Math.round(canvas.clientHeight * DPR);
    }
    function spawn(p, initial) {
      p.x = Math.random() * W;
      p.y = initial ? H * (0.35 + Math.random() * 0.65) : H + Math.random() * 30 * DPR;
      p.vy = -(0.7 + Math.random() * 2.2) * DPR;
      p.vx = (Math.random() - 0.5) * 0.5 * DPR;
      p.s = (0.8 + Math.random() * 2.4) * DPR;
      p.life = 0; p.max = 140 + Math.random() * 260; p.ph = Math.random() * 6.28;
      return p;
    }
    for (let i = 0; i < N; i++) parts.push(spawn({}, true));

    function boltPath(x1, y1, x2, y2, depth, off) {
      let pts = [[x1, y1], [x2, y2]];
      for (let d = 0; d < depth; d++) {
        const out = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
          const mx = (ax + bx) / 2 + (Math.random() - 0.5) * off;
          const my = (ay + by) / 2 + (Math.random() - 0.5) * off * 0.35;
          out.push([mx, my], pts[i + 1]);
        }
        pts = out; off *= 0.55;
      }
      return pts;
    }
    function strike() {
      const cr = canvas.getBoundingClientRect(), ar = art.getBoundingClientRect();
      const L = (ar.left - cr.left) * DPR, T = (ar.top - cr.top) * DPR, AW = ar.width * DPR, AH = ar.height * DPR;
      const x1 = L + AW * (0.2 + Math.random() * 0.6), y1 = T + AH * (0.02 + Math.random() * 0.1);
      const x2 = x1 + (Math.random() - 0.5) * AW * 0.5, y2 = T + AH * (0.45 + Math.random() * 0.2);
      const main = boltPath(x1, y1, x2, y2, 7, AW * 0.18);
      const branches = [];
      for (let b = 0; b < 2; b++) {
        const s = main[Math.floor(main.length * (0.25 + Math.random() * 0.4))];
        branches.push(boltPath(s[0], s[1], s[0] + (Math.random() - 0.5) * AW * 0.35, s[1] + AH * (0.1 + Math.random() * 0.15), 5, AW * 0.08));
      }
      bolts.push({ paths: [main, ...branches], life: 0, max: 22 });
      if (flash) {
        flash.style.background = `radial-gradient(45% 45% at ${(x1 / W) * 100}% ${(y1 / H) * 100 + 15}%, rgba(150,215,255,.55), transparent 70%)`;
        flash.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.25, offset: 0.3 }, { opacity: 0.8, offset: 0.45 }, { opacity: 0 }], { duration: 480, easing: 'ease-out' });
      }
    }
    function drawBolt(b) {
      const fade = 1 - b.life / b.max;
      const a = b.life < 3 ? 1 : (Math.random() > 0.35 ? fade : fade * 0.2);
      const passes = [[11, `rgba(31,139,255,${0.16 * a})`], [5, `rgba(90,200,255,${0.5 * a})`], [1.8, `rgba(240,250,255,${0.95 * a})`]];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, col] of passes) {
        ctx.strokeStyle = col;
        b.paths.forEach((pts, k) => {
          ctx.lineWidth = w * DPR * (k ? 0.55 : 1);
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
        });
      }
    }
    function frame(now) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.life++;
        p.x += p.vx + Math.sin(p.life * 0.035 + p.ph) * 0.6 * DPR;
        p.y += p.vy;
        const k = 1 - p.life / p.max;
        if (k <= 0 || p.y < -20) { spawn(p, false); continue; }
        const flick = 0.65 + 0.35 * Math.sin(p.life * 0.5 + p.ph * 3);
        ctx.globalAlpha = Math.max(0, k * flick);
        const s = p.s * 5;
        ctx.drawImage(sprite, p.x - s, p.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      if (now > nextBolt && art) { strike(); nextBolt = now + 3200 + Math.random() * 4200; }
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i]; b.life++; drawBolt(b);
        if (b.life > b.max) bolts.splice(i, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
      if (running) raf = requestAnimationFrame(frame);
    }
    resize();
    addEventListener('resize', resize);
    return {
      start() { if (!running && !reduce) { running = true; raf = requestAnimationFrame(frame); } },
      stop() { running = false; cancelAnimationFrame(raf); },
      strike() { if (!reduce) { strike(); nextBolt = performance.now() + 3500; } },
    };
  }

  /* ================= FROST (A/C section) ================= */
  function makeFrost(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, running = false, raf = 0;
    const N = small ? 45 : 90, flakes = [];
    function resize() { W = canvas.width = Math.round(canvas.clientWidth * DPR); H = canvas.height = Math.round(canvas.clientHeight * DPR); }
    function spawn(f, initial) {
      f.x = Math.random() * W; f.y = initial ? Math.random() * H : -10 * DPR;
      f.r = (0.6 + Math.random() * 2.2) * DPR; f.vy = (0.25 + Math.random() * 0.8) * DPR; f.ph = Math.random() * 6.28;
      f.a = 0.25 + Math.random() * 0.6; return f;
    }
    resize();
    for (let i = 0; i < N; i++) flakes.push(spawn({}, true));
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const f of flakes) {
        f.y += f.vy; f.ph += 0.01; f.x += Math.sin(f.ph) * 0.35 * DPR;
        if (f.y > H + 10) spawn(f, false);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283);
        ctx.fillStyle = `rgba(205,240,255,${f.a})`; ctx.shadowColor = 'rgba(120,210,255,.9)'; ctx.shadowBlur = f.r * 4;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (running) raf = requestAnimationFrame(frame);
    }
    addEventListener('resize', resize);
    return { start() { if (!running && !reduce) { running = true; raf = requestAnimationFrame(frame); } }, stop() { running = false; cancelAnimationFrame(raf); } };
  }

  /* ================= wire up canvases ================= */
  const hero = $('.hero');
  // on phones the logo sits on top: the flames burn right at its base, inside the first screen
  function placeFire() {
    const c = $('#fire'), a = $('#heroArt');
    if (!c || !a) return;
    if (matchMedia('(max-width: 900px)').matches) {
      c.style.top = a.offsetTop + a.offsetHeight * 0.28 + 'px';
      c.style.bottom = 'auto';
      c.style.height = a.offsetHeight * 0.85 + 'px';
      c.classList.add('fire-mobile');
    } else {
      c.style.top = c.style.bottom = c.style.height = '';
      c.classList.remove('fire-mobile');
    }
  }
  placeFire();
  addEventListener('resize', placeFire);
  const fire = makeFire($('#fire'), { scale: small ? 0.45 : 0.5, intensity: 1, speed: 1 });
  const fire2 = makeFire($('#fire2'), { scale: 0.4, intensity: 0.9, speed: 0.9 });
  const sparks = makeSparks($('#sparks'), $('#heroArt'), $('#flash'));
  const frost = makeFrost($('#frost'));
  onVisible(hero, () => { fire && fire.start(); sparks && sparks.start(); }, () => { fire && fire.stop(); sparks && sparks.stop(); });
  onVisible($('#contact'), () => { fire2 && (fire2.start(), fire2.ignite(1)); }, () => fire2 && fire2.stop());
  onVisible($('#ac'), () => frost && frost.start(), () => frost && frost.stop());
  if (reduce) { fire && fire.ignite(1); fire2 && fire2.ignite(1); }

  /* ================= nav + progress ================= */
  const nav = $('#nav'), bar = $('#progress');
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('scrolled', y > 30);
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ================= card tilt + glow ================= */
  if (canHover && !reduce) {
    $$('.card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%');
        card.style.transform = `rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
    const art = $('#heroArt');
    hero.addEventListener('pointermove', e => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      $('#mascot').style.translate = `${x * -18}px ${y * -12}px`;
      art.style.rotate = `${x * 2}deg`;
    });
  }

  /* ================= ride selector ================= */
  const SMS = 'sms:+16028157122?&body=';
  const RIDES = {
    gen2: { name: 'Prius Gen 2', years: '2004–2009', tag: 'GEN 2', cta: 'Text about my Gen 2', body: 'Hi! I have a Prius Gen 2 and need help with ',
      items: ['Hybrid battery repair &amp; services', 'Battery install — you call, I install, 24/7', 'R134a A/C recharge, starting at $80'] },
    gen3: { name: 'Prius Gen 3', years: '2010–2015', tag: 'GEN 3', cta: 'Text about my Gen 3', body: 'Hi! I have a Prius Gen 3 and need help with ',
      items: ['Hybrid battery repair &amp; services', 'Battery install — you call, I install, 24/7', 'Buy · Sell · Fix — 2010–2015 Prius', 'R134a A/C recharge, starting at $80'] },
    ct: { name: 'Lexus CT 200h', years: '2011–2017', tag: 'CT 200H', cta: 'Text about my CT 200h', body: 'Hi! I have a Lexus CT 200h and need help with ',
      items: ['Hybrid battery repair &amp; services', 'Battery install — you call, I install, 24/7', 'R134a A/C recharge, starting at $80'] },
    any: { name: 'Any Make', years: 'All makes &amp; models', tag: 'A/C', cta: 'Book my A/C recharge', body: 'Hi! I need an A/C recharge for my ',
      items: ['R134a freon recharge for all makes &amp; models', 'Recovery · vacuum · recharge', 'Starting at just $80 — get it while it’s hot!'] },
  };
  const tabs = $$('.ride-tabs [role=tab]');
  const carBody = $('.car-body');
  let carLen = 0;
  try { carLen = carBody.getTotalLength(); } catch (_) { /* old browsers */ }
  function selectRide(key, animate = true) {
    const d = RIDES[key]; if (!d) return;
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.ride === key)));
    $('#rideName').innerHTML = d.name;
    $('#rideYears').innerHTML = d.years;
    $('#rideTag').textContent = d.tag;
    $('#rideList').innerHTML = d.items.map(i => `<li>${i}</li>`).join('');
    const cta = $('#rideCta'); cta.textContent = d.cta; cta.href = SMS + encodeURIComponent(d.body);
    $('.ride-visual').classList.toggle('ac-mode', key === 'any');
    if (animate && !reduce) {
      const info = $('.ride-info'); info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
      const car = $('#car'); car.classList.remove('zap'); void car.offsetWidth; car.classList.add('zap');
      if (carLen && carBody.animate) {
        carBody.style.strokeDasharray = carLen;
        carBody.animate([{ strokeDashoffset: carLen }, { strokeDashoffset: 0 }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectRide(t.dataset.ride));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); selectRide(n.dataset.ride);
    });
  });
  selectRide('gen3', false);

  /* ================= battery check ================= */
  const MSG = ['Sounding healthy. Keep rolling.', 'Could be nothing — or the start of it. Worth a check.', 'Your battery may be getting weak. Get it checked.',
    'Your battery is talking. Time to call.', 'Red zone. Call before it leaves you stranded.', 'Red zone. Call before it leaves you stranded.'];
  const meter = $('#meter'), fill = $('#meterFill'), pctEl = $('#meterPct'), msgEl = $('#meterMsg'), meterCta = $('#meterCta');
  let shownPct = 100;
  function updateMeter() {
    const n = $$('#symptoms input:checked').length;
    const pct = Math.max(5, 100 - n * 19);
    fill.style.height = `calc(${pct}% - ${pct === 100 ? 20 : 20 * pct / 100}px)`;
    meter.classList.toggle('warn', n >= 2 && n < 4);
    meter.classList.toggle('crit', n >= 4);
    msgEl.textContent = MSG[n];
    meterCta.classList.toggle('on', n >= 1);
    const from = shownPct, t0 = performance.now();
    shownPct = pct;
    (function tick(now) {
      const k = Math.min(1, (now - t0) / 700);
      pctEl.textContent = Math.round(from + (pct - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  $$('#symptoms input').forEach(i => i.addEventListener('change', updateMeter));

  /* ================= photos made for the page (optional) ================= */
  [['.battery-bg', 'assets/bateria.jpg'], ['.ac-bg', 'assets/aire.jpg'], ['.final-bg', 'assets/noche.jpg']].forEach(([sel, src]) => {
    const el = $(sel); if (!el) return;
    const im = new Image();
    im.onload = () => { el.style.setProperty('--img', `url("${src}")`); el.classList.add('has-img'); };
    im.src = src;
  });

  /* ================= smooth scroll (Lenis) ================= */
  let lenis = null;
  if (window.Lenis && !reduce && canHover) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    html.classList.add('lenis');
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(t => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function loop(t) { lenis.raf(t); requestAnimationFrame(loop); })(performance.now());
    }
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); const el = id.length > 1 ? $(id) : $('#top');
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: id === '#top' ? 0 : -70, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ================= GSAP choreography ================= */
  function splitWords(el) {
    const nodes = [...el.childNodes];
    el.textContent = '';
    const wrap = node => {
      const o = document.createElement('span'); o.className = 'w';
      o.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top;padding:0 .09em .06em 0;margin-bottom:-.06em';
      const i = document.createElement('span'); i.className = 'wi'; i.style.display = 'inline-block';
      i.appendChild(node); o.appendChild(i); return o;
    };
    nodes.forEach(node => {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) el.appendChild(document.createTextNode(' '));
          else el.appendChild(wrap(document.createTextNode(part)));
        });
      } else el.appendChild(wrap(node.cloneNode(true)));
    });
  }

  function shake(target, power = 10) {
    if (reduce || !window.gsap) return;
    window.gsap.fromTo(target, { x: 0, y: 0 }, { x: () => (Math.random() - 0.5) * power, y: () => (Math.random() - 0.5) * power * 0.6,
      duration: 0.045, repeat: 8, yoyo: true, repeatRefresh: true, ease: 'none', onComplete: () => window.gsap.set(target, { x: 0, y: 0 }) });
  }

  function choreograph() {
    const gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);

    // ---- hero ignition ----
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.add(() => fire && fire.ignite(1), 0)
      .fromTo('.nav', { y: -90, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.15)
      .fromTo('.hero-art', { opacity: 0, scale: 1.4, y: -60, filter: 'blur(14px)' }, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power3.in' }, 0.35)
      .add(() => { sparks && sparks.strike(); shake('.hero-art', 16); shake('.hero-copy', 10); }, 0.85)
      .to('.i-line', { y: 0, duration: 1.05, stagger: 0.085 }, 0.9)
      .to('.i-up', { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, 1.2);

    // ---- hero parallax out ----
    gsap.to('#heroArt', { yPercent: 16, scale: 0.9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // ---- stripes lean with scroll speed ----
    const lean = gsap.quickTo('.stripe', 'skewX', { duration: 0.5, ease: 'power3' });
    ST.create({ onUpdate: s => lean(Math.max(-12, Math.min(12, s.getVelocity() / -260))) });
    ST.addEventListener('scrollEnd', () => lean(0));

    // ---- headings word by word ----
    $$('.split').forEach(h => {
      splitWords(h);
      gsap.from(h.querySelectorAll('.wi'), { yPercent: 115, rotate: 5, duration: 1, stagger: 0.07, ease: 'power4.out',
        scrollTrigger: { trigger: h, start: 'top 86%' } });
    });

    // ---- reveals ----
    gsap.set('.reveal', { opacity: 0, y: 50 });
    ST.batch('.reveal', { start: 'top 90%', once: true,
      onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', overwrite: true }) });

    // ---- shop photo drift ----
    gsap.fromTo('#shopImg', { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.shop-media', start: 'top bottom', end: 'bottom top', scrub: true } });

    // ---- A/C price count ----
    const price = $('#price'), obj = { v: 0 };
    ST.create({ trigger: '.ac-card', start: 'top 80%', once: true,
      onEnter: () => gsap.fromTo(obj, { v: 0 }, { v: 80, duration: 1.8, ease: 'power3.out', onUpdate: () => { price.textContent = Math.round(obj.v); } }) });

    // ---- final slam ----
    gsap.set('.ft', { opacity: 0, scale: 2.6 });
    ST.create({ trigger: '.final', start: 'top 65%', once: true, onEnter: () => {
      gsap.to('.ft', { opacity: 1, scale: 1, duration: 0.42, stagger: 0.18, ease: 'power4.in',
        onComplete: () => shake('.final-inner', 12) });
    } });

    addEventListener('load', () => ST.refresh());
  }

  if (window.gsap && window.ScrollTrigger && !reduce) {
    choreograph();
  } else {
    html.classList.remove('anim');
    html.classList.add('io');
    fire && fire.ignite(1);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  }
})();
