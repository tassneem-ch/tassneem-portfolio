/* =========================================================
   Tasnim Cherif — portfolio interactions
   ========================================================= */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------------------------------------------------
     0. GLOBAL POINTER STATE
     --------------------------------------------------------- */
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, tx: 0, ty: 0, moved: false };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = true;
  }, { passive: true });

  /* ---------------------------------------------------------
     1. LOADER
     --------------------------------------------------------- */
  (function loader() {
    const el = $('#loader'), bar = $('#loaderBar'), pct = $('#loaderPct');
    if (!el) return;
    document.body.classList.add('is-locked');
    let p = 0, done = false;
    const tick = setInterval(() => {
      p = Math.min(p + Math.random() * 12 + 4, done ? 100 : 92);
      bar.style.width = p + '%';
      pct.textContent = Math.floor(p);
      if (p >= 100) { clearInterval(tick); finish(); }
    }, 110);

    function finish() {
      el.classList.add('is-done');
      document.body.classList.remove('is-locked');
      document.body.classList.add('is-ready');
      setTimeout(() => el.remove(), 1000);
      // kick the hero reveal
      $$('.hero [data-reveal]').forEach((n) => n.classList.add('is-in'));
    }
    window.addEventListener('load', () => { done = true; }, { once: true });
    setTimeout(() => { done = true; }, 2600); // never hang
  })();

  /* ---------------------------------------------------------
     2. STARFIELD CANVAS
     --------------------------------------------------------- */
  (function starfield() {
    const cvs = $('#starfield');
    if (!cvs || reduced) return;
    const ctx = cvs.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [];
    const COLORS = ['124,92,255', '255,77,151', '255,179,92', '57,216,255'];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cvs.clientWidth; h = cvs.clientHeight;
      cvs.width = Math.floor(w * dpr); cvs.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = clamp(Math.round((w * h) / 20000), 26, 110);
      parts = new Array(target).fill(0).map(() => spawn());
    }
    function spawn() {
      return {
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        a: Math.random() * 0.5 + 0.25
      };
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;

        // gentle repulsion from the cursor
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 26000 && d2 > 0.01) {
          const f = (1 - d2 / 26000) * 0.6;
          const d = Math.sqrt(d2);
          p.x += (dx / d) * f; p.y += (dy / d) * f;
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();

        // connections
        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j];
          const ax = p.x - q.x, ay = p.y - q.y;
          const dd = ax * ax + ay * ay;
          if (dd < 12000) {
            ctx.strokeStyle = 'rgba(' + p.c + ',' + (0.14 * (1 - dd / 12000)).toFixed(3) + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  })();

  /* ---------------------------------------------------------
     3. CUSTOM CURSOR
     --------------------------------------------------------- */
  (function cursor() {
    const dot = $('#cursor'), ring = $('#cursorRing');
    if (!dot || !ring || !finePointer || reduced) return;
    let x = pointer.x, y = pointer.y, rx = x, ry = y;

    (function loop() {
      x = lerp(x, pointer.x, 0.35); y = lerp(y, pointer.y, 0.35);
      rx = lerp(rx, pointer.x, 0.14); ry = lerp(ry, pointer.y, 0.14);
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();

    const HOVER = 'a,button,.magnetic,[data-cursor]';
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest(HOVER);
      ring.classList.remove('is-link', 'is-text', 'is-card');
      if (!t) return;
      const kind = t.getAttribute && t.getAttribute('data-cursor');
      if (kind === 'card') ring.classList.add('is-card');
      else if (kind === 'text') ring.classList.add('is-text');
      else ring.classList.add('is-link');
    });
    document.addEventListener('pointerdown', () => { ring.style.scale = '0.8'; });
    document.addEventListener('pointerup', () => { ring.style.scale = '1'; });
  })();

  /* ---------------------------------------------------------
     4. SCROLL PROGRESS + NAV
     --------------------------------------------------------- */
  (function scrollUI() {
    const bar = $('#progressBar'), nav = $('#nav');
    let raf = null;
    function update() {
      const st = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (max > 0 ? (st / max) * 100 : 0) + '%';
      if (nav) nav.classList.toggle('is-stuck', st > 40);
      raf = null;
    }
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  })();

  /* ---------------------------------------------------------
     5. REVEAL ON SCROLL (with stagger)
     --------------------------------------------------------- */
  (function reveal() {
    const nodes = $$('[data-reveal]');
    // stagger siblings
    const groups = new Map();
    nodes.forEach((n) => {
      const key = n.parentElement;
      const i = groups.get(key) || 0;
      groups.set(key, i + 1);
      n.style.transitionDelay = Math.min(i * 90, 540) + 'ms';
    });
    if (!('IntersectionObserver' in window)) { nodes.forEach((n) => n.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach((n) => io.observe(n));
  })();

  /* ---------------------------------------------------------
     6. COUNTERS
     --------------------------------------------------------- */
  (function counters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        io.unobserve(el);
        const end = parseFloat(el.dataset.count) || 0;
        const dur = 1400, t0 = performance.now();
        (function step(t) {
          const k = clamp((t - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(end * eased).toLocaleString();
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.5 });
    nums.forEach((n) => io.observe(n));
  })();

  /* ---------------------------------------------------------
     7. TYPEWRITER
     --------------------------------------------------------- */
  (function typewriter() {
    const el = $('#typed');
    if (!el) return;
    const roles = [
      'an AI & Machine Learning engineer',
      'a Python developer',
      'a Flutter app builder',
      'a data storyteller',
      'a problem solver'
    ];
    if (reduced) { el.textContent = roles[0]; return; }
    let ri = 0, ci = 0, del = false;
    (function tick() {
      const word = roles[ri];
      el.textContent = word.slice(0, ci);
      if (!del) {
        ci++;
        if (ci > word.length) { del = true; return setTimeout(tick, 1500); }
        setTimeout(tick, 58 + Math.random() * 40);
      } else {
        ci--;
        if (ci < 0) { del = false; ci = 0; ri = (ri + 1) % roles.length; return setTimeout(tick, 320); }
        setTimeout(tick, 30);
      }
    })();
  })();

  /* ---------------------------------------------------------
     8. PORTRAIT PARALLAX / TILT
     --------------------------------------------------------- */
  (function parallax() {
    const wrap = $('#portraitWrap');
    const scene = $('#portraitScene');
    if (!wrap || !scene || reduced || !finePointer) return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', () => {
      const r = scene.getBoundingClientRect();
      const nx = clamp((pointer.x - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
      const ny = clamp((pointer.y - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
      tx = nx * 16; ty = ny * 13;
    }, { passive: true });
    (function loop() {
      cx = lerp(cx, tx, 0.07); cy = lerp(cy, ty, 0.07);
      wrap.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------------------------------------------------------
     9. MAGNETIC ELEMENTS
     --------------------------------------------------------- */
  (function magnetic() {
    if (!finePointer || reduced) return;
    $$('.magnetic').forEach((el) => {
      let tx = 0, ty = 0, cx = 0, cy = 0, active = false;
      el.addEventListener('pointerenter', () => { active = true; });
      el.addEventListener('pointerleave', () => { active = false; tx = 0; ty = 0; });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        tx = clamp((e.clientX - (r.left + r.width / 2)) * 0.22, -14, 14);
        ty = clamp((e.clientY - (r.top + r.height / 2)) * 0.3, -12, 12);
      });
      (function loop() {
        cx = lerp(cx, tx, 0.16); cy = lerp(cy, ty, 0.16);
        if (active || Math.abs(cx) > 0.05 || Math.abs(cy) > 0.05) {
          el.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
        }
        requestAnimationFrame(loop);
      })();
    });
  })();

  /* ---------------------------------------------------------
     10. 3D TILT CARDS + GLOW
     --------------------------------------------------------- */
  (function tilt() {
    if (reduced) return;
    $$('[data-tilt]').forEach((el) => {
      const strength = 7;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        if (!finePointer) return;
        el.style.transform = 'perspective(900px) rotateY(' + ((px - 0.5) * strength * 2).toFixed(2) +
          'deg) rotateX(' + ((0.5 - py) * strength * 2).toFixed(2) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = '';
        el.style.transition = 'transform .7s cubic-bezier(.2,.7,.2,1)';
        setTimeout(() => { el.style.transition = ''; }, 700);
      });
    });
  })();

  /* ---------------------------------------------------------
     11. SCROLL VELOCITY, NAV STATE, BACK TO TOP, ORB PARALLAX
     --------------------------------------------------------- */
  (function ambient() {
    const scene = $('.portrait-scene');
    const bands = [$('.marquee'), $('.ticker')].filter(Boolean);
    const orbs = $('.orbs');
    const ring = $('.totop__ring');
    const toTop = $('.totop');
    const links = $$('.nav__links a');
    const sections = $$('main section[id]');
    const RING_LEN = 2 * Math.PI * 21;
    let lastY = window.scrollY, vel = 0;

    // whole blocks lag a beat behind the scroll, then settle
    (function loop() {
      vel = lerp(vel, 0, 0.12);
      if (!reduced) {
        const s = clamp(vel * 0.045, -1, 1);
        if (scene) scene.style.transform = 'skewY(' + (s * 1.5).toFixed(2) + 'deg)';
        for (let i = 0; i < bands.length; i++) {
          bands[i].style.transform = 'skewY(' + (s * (i ? -1 : 1) * 1.1).toFixed(2) + 'deg)';
        }
      }
      requestAnimationFrame(loop);
    })();

    function onScroll() {
      const y = window.scrollY;
      vel = y - lastY; lastY = y;

      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (ring) ring.style.strokeDashoffset = String(RING_LEN * (1 - (max > 0 ? y / max : 0)));
      if (toTop) toTop.classList.toggle('is-on', y > window.innerHeight * 0.9);

      let cur = '';
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top < window.innerHeight * 0.42) cur = sec.id;
      }
      for (const a of links) a.classList.toggle('is-active', a.getAttribute('href') === '#' + cur);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // the background leans toward the pointer for depth
    if (orbs && finePointer && !reduced) {
      window.addEventListener('pointermove', (e) => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        orbs.style.transform = 'translate3d(' + (nx * 20).toFixed(1) + 'px,' + (ny * 15).toFixed(1) + 'px,0)';
      }, { passive: true });
    }
  })();

  /* ---------------------------------------------------------
     12. MISC
     --------------------------------------------------------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
