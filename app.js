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
  // What the owner does (his list, 25 nov): hybrid batteries 2005–2015 (reconditioned from $600 installed, new $3,500 installed);
  // inverters 2005–2015; 2010–2015 (Gen 3) "you name it, we fix it": JDM engine swaps from $2,200, factory ABS pumps installed
  // $2,200, suspension, A/C compressor, overheating, maintenance, full tune-ups; A/C $80 for any year Prius with R-134a;
  // dash displays only 2005–2009; buys 2010–2015 Prius in any condition (must be movable) and sells shop-checked cars. No 2016+.
  // `car` = which real photo (gen2 = 2005–2009, gen3 = 2010–2015); `spot` = where that part sits on that photo, in % (x, y).
  const RIDES = {
    battery: { name: 'Hybrid Battery', years: 'Prius 2005–2015', tag: 'HV BATTERY', car: 'gen3', spot: [73, 56], cta: 'Book battery service',
      items: ['Reconditioned battery: starting at $600 installed', 'Brand-new battery: $3,500 installed', 'Red triangle, “Check Hybrid System” or mileage dropping? Start here', 'Not sure? Take the battery check below'] },
    inverter: { name: 'Inverter', years: 'Prius 2005–2015', tag: 'INVERTER', car: 'gen2', spot: [14, 45], cta: 'Book inverter repair',
      items: ['Inverter diagnosis &amp; repair for 2005–2015 Prius', 'Warning lights on the dash? Text us what it says'] },
    gen3: { name: 'Gen 3 Repair', years: 'Prius 2010–2015 · you name it, we fix it', tag: 'GEN 3', car: 'gen3', spot: [19, 31], cta: 'Book Gen 3 repair',
      items: ['JDM engine swaps — starting at $2,200', 'Factory ABS pumps installed — $2,200', 'Suspension · A/C compressor · overheating issues', 'Maintenance &amp; full tune-ups'] },
    ac: { name: 'A/C', years: 'Any year Prius with R-134a', tag: 'A/C', car: 'gen2', spot: [6, 56], cta: 'Book A/C service',
      items: ['A/C service for any year Prius that runs R-134a — $80', 'Recovery · vacuum · recharge', 'Not sure which gas yours takes? It’s on the sticker under the hood', 'Get it while it’s hot!'] },
    display: { name: 'Dash Display', years: 'Prius 2005–2009', tag: 'DISPLAY', car: 'gen2', spot: [31, 34], cta: 'Book display repair',
      items: ['Dash display repair — $300', 'Dash display gone dark, dim or flickering', 'For 2005–2009 Prius'] },
  };
  // Real photos from Wikimedia Commons (CC BY-SA): background removed; the 2005–2009 one mirrored to face left.
  const CARS = {
    gen2: { ratio: '1400 / 481', credit: 'Photo: <a href="https://commons.wikimedia.org/wiki/File:Toyota_Prius_side.jpg" target="_blank" rel="noopener">Chris 73</a>, <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a> (edited)' },
    gen3: { ratio: '1400 / 569', credit: 'Photo: <a href="https://commons.wikimedia.org/wiki/File:Prius_Side_Profile_(30597326822).jpg" target="_blank" rel="noopener">formulanone</a>, <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noopener">CC BY-SA 2.0</a> (edited)' },
  };
  const tabs = $$('.ride-tabs [role=tab]');
  const carPhoto = $('#carPhoto'), hot = $('#hot');
  function selectRide(key, animate = true) {
    const d = RIDES[key]; if (!d) return;
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.ride === key)));
    $('#rideName').innerHTML = d.name;
    $('#rideYears').textContent = d.years;
    $('#rideTag').textContent = d.tag;
    $('#rideList').innerHTML = d.items.map(i => `<li>${i}</li>`).join('');
    const cta = $('#rideCta'); cta.textContent = d.cta; cta.dataset.book = key;
    // the real Prius of those years + the glowing dot on the part
    $$('.car-img', carPhoto).forEach(img => img.classList.toggle('on', img.dataset.gen === d.car));
    carPhoto.style.aspectRatio = CARS[d.car].ratio;
    $('#carCredit').innerHTML = CARS[d.car].credit;
    hot.style.left = d.spot[0] + '%';
    hot.style.top = d.spot[1] + '%';
    hot.classList.toggle('cold', key === 'ac');
    if (animate && !reduce) {
      const info = $('.ride-info'); info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
      carPhoto.classList.remove('zap'); void carPhoto.offsetWidth; carPhoto.classList.add('zap');
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
  selectRide('battery', false);

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
  // (the night-garage photo is a 2016+ Prius, which the shop doesn't work on: not used)
  [['.battery-bg', 'assets/bateria.jpg'], ['.ac-bg', 'assets/aire.jpg']].forEach(([sel, src]) => {
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
    if (a.hasAttribute('data-book') || a.id === 'bookSend') return; // booking window / its link to Messages
    const id = a.getAttribute('href');
    if (!id || id[0] !== '#') return; const el = id.length > 1 ? $(id) : $('#top');
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: id === '#top' ? 0 : -108, duration: 1.4 }); // nav + battery bar
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ================= booking: 4 steps, then the request goes to the shop by text ================= */
  // The page has no server: the booking is a text message to the shop's phone, which he answers to confirm the time.
  const SHOP = '+16028157122';
  const SERVICE_NAME = { battery: 'Hybrid battery', inverter: 'Inverter', gen3: 'Gen 3 repair', display: 'Dash display', sell: 'Sell my Prius', buy: 'Buy a Prius', ac: 'A/C service ($80)' };
  // The years offered depend on the service (the owner's own split). A/C is any Prius with R-134a: by generation.
  const span = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
  const GEN2 = span(2005, 2009), GEN3 = span(2010, 2015);
  const YEARS = {
    battery: span(2005, 2015), inverter: span(2005, 2015), display: GEN2,
    gen3: GEN3, sell: GEN3, buy: GEN3.concat('Any year'),
    ac: ['2001–2003', '2004–2009', '2010–2015'], // the R-134a years; nothing 2016 and newer
  };
  function buildYears(service) {
    const box = $('#bookYears');
    const list = YEARS[service] || GEN2;
    box.className = 'opts years n' + list.length;
    $('#yearsLegend').textContent = service === 'buy' ? 'What year are you looking for?' : 'What year is your Prius?';
    box.innerHTML = list.map(y => `<button type="button" class="opt${y.length > 4 ? ' opt-long' : ''}" data-value="${y}" aria-pressed="false"><b>${y}</b></button>`).join('');
    state.year = '';
  }
  const DONE_PHONE = 'Your messages app opened with your booking. Hit <b>send</b> and he’ll text you back to confirm your time.';
  const dlg = $('#book');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const state = { step: 1, service: '', year: '', day: '', time: '' };
  const steps = $$('.book-step', dlg);
  const nextBtn = $('#bookNext'), backBtn = $('#bookBack'), nameIn = $('#bookName'), notesIn = $('#bookNotes'), sendA = $('#bookSend');

  function buildDays() {
    const box = $('#bookDays');
    box.innerHTML = '';
    const now = new Date();
    // open Mon–Fri, Saturday by appointment, closed Sunday (owner, 25 nov): 8 open days, no Sundays
    for (let i = 0, shown = 0; shown < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (d.getDay() === 0) continue;
      shown++;
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const sub = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const value = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      box.insertAdjacentHTML('beforeend', `<button type="button" class="opt" data-value="${value}" aria-pressed="false"><b>${label}</b><small>${sub}</small></button>`);
    }
  }
  function pick(group, btn) {
    if (!group || !btn) return;
    $$('.opt', group).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    state[group.dataset.name] = btn.dataset.value;
    if (group.dataset.name === 'service') buildYears(btn.dataset.value);
    refresh();
  }
  function ready() {
    if (state.step === 1) return !!state.service;
    if (state.step === 2) return !!state.year;
    if (state.step === 3) return !!state.day && !!state.time;
    if (state.step === 4) return nameIn.value.trim().length > 0;
    return true;
  }
  function refresh() {
    nextBtn.disabled = !ready();
    nextBtn.textContent = state.step === 4 ? 'Send request' : 'Next';
    // On phones the last button is a real link to Messages that the customer taps: in-app browsers
    // (Facebook, Instagram) can block a script from opening it, but they let a tapped link through.
    const touchSend = coarse && state.step === 4;
    nextBtn.hidden = touchSend;
    sendA.hidden = !touchSend;
    if (touchSend) {
      sendA.classList.toggle('is-off', !ready());
      sendA.href = ready() ? smsLink(message()) : '#';
    }
    backBtn.style.visibility = state.step > 1 ? 'visible' : 'hidden';
  }
  function message() {
    const notes = notesIn.value.trim();
    return ['Booking request — Nut N But Prius', 'Service: ' + SERVICE_NAME[state.service], (state.service === 'buy' ? 'Looking for: ' : 'Car: ') + yearLabel(),
      'When: ' + state.day + ', ' + state.time, 'Name: ' + nameIn.value.trim()].concat(notes ? ['Notes: ' + notes] : []).join('\n');
  }
  const smsLink = body => 'sms:' + SHOP + '?&body=' + encodeURIComponent(body);
  const yearLabel = () => (state.year === 'Any year' ? 'Any 2010–2015 Prius' : state.year + ' Prius');
  function go(n) {
    state.step = n;
    steps.forEach(s => s.classList.toggle('on', Number(s.dataset.step) === n));
    $('#bookBar').style.width = Math.min(100, n * 25) + '%';
    $('#bookCount').textContent = n <= 4 ? 'Step ' + n + ' of 4' : 'Done';
    $('#bookNav').hidden = n === 5;
    if (n === 4) {
      $('#bookSum').innerHTML = [SERVICE_NAME[state.service], yearLabel(), state.day, state.time].map(t => '<li>' + t + '</li>').join('');
      if (!coarse) setTimeout(() => nameIn.focus({ preventScroll: true }), 250);
    }
    refresh();
  }
  dlg.addEventListener('click', e => {
    if (e.target === dlg) { dlg.close(); return; } // tap on the dark backdrop
    const btn = e.target.closest('.opt');
    if (!btn) return;
    pick(btn.closest('.opts'), btn);
    if (state.step <= 2) setTimeout(() => { if (ready()) go(state.step + 1); }, 280); // one tap = next step
  });
  nextBtn.addEventListener('click', () => {
    if (!ready()) return;
    if (state.step < 4) { go(state.step + 1); return; }
    const body = message();
    go(5);
    if (coarse) {
      window.location.href = smsLink(body);
    } else {
      $('#doneText').textContent = 'Your booking request is ready.';
      $('#donePre').textContent = body;
      $('#doneSms').href = smsLink(body);
      $('#doneDesk').hidden = false;
    }
  });
  backBtn.addEventListener('click', () => { if (state.step > 1) go(state.step - 1); });
  nameIn.addEventListener('input', refresh);
  notesIn.addEventListener('input', refresh);
  sendA.addEventListener('click', e => {
    if (!ready()) { e.preventDefault(); return; }
    setTimeout(() => go(5), 60); // let the tap open Messages, then show the confirmation
  });
  $('#bookForm').addEventListener('submit', e => { e.preventDefault(); nextBtn.click(); });
  $('#doneCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#donePre').textContent); $('#doneCopy').textContent = 'Copied!'; }
    catch (_) { /* clipboard blocked: the message stays on screen to copy by hand */ }
  });
  $('#bookClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { if (lenis) lenis.start(); });
  function openBook(service) {
    if (typeof dlg.showModal !== 'function') { window.location.href = 'tel:' + SHOP; return; }
    Object.assign(state, { step: 1, service: '', year: '', day: '', time: '' });
    buildDays();
    $$('.opt', dlg).forEach(b => b.setAttribute('aria-pressed', 'false'));
    nameIn.value = ''; notesIn.value = '';
    $('#doneDesk').hidden = true;
    $('#doneCopy').textContent = 'Copy message';
    $('#doneText').innerHTML = DONE_PHONE;
    dlg.showModal();
    if (lenis) lenis.stop();
    if (SERVICE_NAME[service]) { pick($('.opts[data-name="service"]', dlg), $(`.opt[data-value="${service}"]`, dlg)); go(2); }
    else go(1);
  }
  $$('[data-book]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openBook(a.dataset.book); }));
  // nutnbutprius.com/#book opens the booking window right away (for the "Book" link on his Google and Facebook pages)
  if (location.hash === '#book') setTimeout(() => openBook(''), 900);
  addEventListener('hashchange', () => { if (location.hash === '#book' && !dlg.open) openBook(''); });

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
