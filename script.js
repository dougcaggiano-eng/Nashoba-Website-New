/* Nashoba Power Wash — scroll-scrubbed video + UI */
(() => {
  const FRAME_COUNT = 396;          // 33s @ 12fps
  const DURATION = 33;              // seconds in the source video
  const frameSrc = i => `assets/frames/f${String(i + 1).padStart(3, '0')}.webp`;

  /* ---------------- Scroll video ---------------- */
  const section = document.getElementById('hero');
  const canvas = document.getElementById('scrolly-canvas');
  const ctx = canvas.getContext('2d');
  const bar = document.getElementById('scrolly-bar');
  const loadingEl = document.getElementById('scrolly-loading');
  const intro = document.querySelector('.hero-intro');
  const end = document.querySelector('.hero-end');
  const railBtns = [...document.querySelectorAll('.stage-rail button')];

  const frames = new Array(FRAME_COUNT);
  const loaded = new Uint8Array(FRAME_COUNT);
  let loadedCount = 0;

  let target = 0;     // target frame (float)
  let current = 0;    // eased frame (float)
  let drawn = -1;

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    drawn = -1;
  }

  function nearestLoaded(i) {
    if (loaded[i]) return i;
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (i - d >= 0 && loaded[i - d]) return i - d;
      if (i + d < FRAME_COUNT && loaded[i + d]) return i + d;
    }
    return -1;
  }

  function draw(index) {
    const i = nearestLoaded(index);
    if (i < 0 || i === drawn) return;
    const img = frames[i];
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const portrait = ch > cw * 1.1;
    ctx.fillStyle = '#06080d';
    ctx.fillRect(0, 0, cw, ch);
    if (portrait) {
      // Blurred fill behind, then the frame zoomed slightly and left-aligned
      // so the baked-in captions (bottom-left of the video) stay readable.
      const bs = Math.max(cw / iw, ch / ih);
      ctx.save();
      ctx.filter = 'blur(18px) brightness(0.45)';
      ctx.drawImage(img, (cw - iw * bs) / 2, (ch - ih * bs) / 2, iw * bs, ih * bs);
      ctx.restore();
      const w = cw * 1.3, h = ih * (w / iw);
      ctx.drawImage(img, 0, (ch - h) / 2, w, h);
    } else {
      const scale = Math.max(cw / iw, ch / ih);
      const w = iw * scale, h = ih * scale;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    drawn = i;
  }

  function progress() {
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    return Math.min(1, Math.max(0, -rect.top / total));
  }

  function inRange(el, p) {
    const [a, b] = el.dataset.show.split('-').map(Number);
    return p >= a && p <= b;
  }

  const stageTimes = railBtns.map(b => Number(b.dataset.time));

  function updateUI(p) {
    bar.style.width = (p * 100).toFixed(2) + '%';
    intro.classList.toggle('is-hidden', !inRange(intro, p));
    end.classList.toggle('is-hidden', !inRange(end, p));
    const t = p * DURATION;
    let active = 0;
    stageTimes.forEach((st, i) => { if (t >= st - 1) active = i; });
    railBtns.forEach((b, i) => b.classList.toggle('active', i === active && p > 0.02));
  }

  function onScroll() {
    const p = progress();
    target = p * (FRAME_COUNT - 1);
    updateUI(p);
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tick() {
    current += (target - current) * (reduceMotion ? 1 : 0.18);
    if (Math.abs(target - current) < 0.01) current = target;
    draw(Math.round(current));
    requestAnimationFrame(tick);
  }

  // Load frames: first frame right away, then a coarse pass (every 8th),
  // then fill in the gaps, so scrubbing works quickly even on slow connections.
  function load(i) {
    return new Promise(res => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; loaded[i] = 1; loadedCount++; res(); };
      img.onerror = () => res();
      img.src = frameSrc(i);
    });
  }
  async function loadAll() {
    const order = [];
    const seen = new Set();
    for (const step of [32, 8, 4, 2, 1]) {
      for (let i = 0; i < FRAME_COUNT; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    }
    let next = 0;
    const worker = async () => {
      while (next < order.length) {
        await load(order[next++]);
        drawn = -1;
        loadingEl.querySelector('span').textContent = Math.round(loadedCount / FRAME_COUNT * 100) + '%';
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    loadingEl.classList.add('done');
  }

  // Rail buttons jump to that part of the video
  railBtns.forEach(btn => btn.addEventListener('click', () => {
    const p = Number(btn.dataset.time) / DURATION;
    const top = section.offsetTop + p * (section.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }));

  sizeCanvas();
  load(0).then(() => { drawn = -1; });
  loadAll();
  onScroll();
  tick();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { sizeCanvas(); onScroll(); });

  /* ---------------- Services dropdown ---------------- */
  const navServices = document.querySelector('.nav-services');
  const toggle = document.querySelector('.services-toggle');
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    const open = navServices.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    if (!navServices.contains(e.target)) { navServices.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  });
  document.querySelectorAll('.services-menu a').forEach(a => a.addEventListener('click', () => {
    navServices.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); a.blur();
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { navServices.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); closeMobile(); }
  });

  /* ---------------- Mobile menu ---------------- */
  const menuBtn = document.querySelector('.menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  function closeMobile() { mobileMenu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.hidden;
    mobileMenu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open);
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobile));

  /* ---------------- Patio visual: sweep tied to scroll ---------------- */
  const visual = document.querySelector('.svc-visual');
  function sweep() {
    const r = visual.getBoundingClientRect();
    const p = 1 - (r.top + r.height / 2) / window.innerHeight; // 0 at bottom, 1 at top
    const pct = Math.min(100, Math.max(0, (p - 0.15) / 0.6 * 100));
    visual.style.setProperty('--clean', pct.toFixed(1) + '%');
  }
  window.addEventListener('scroll', sweep, { passive: true });
  sweep();

  /* ---------------- Reveal on scroll ---------------- */
  const revealEls = document.querySelectorAll('.section-head, .svc, .svc-feature, .steps li, .careful, .why-copy, .why-list li, .story-card, .area-grid > *, .faq details, .quote-copy, .quote-form');
  revealEls.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach(el => io.observe(el));

  /* ---------------- Quote form ---------------- */
  // Service buttons pre-check the matching box in the form
  document.querySelectorAll('[data-service]').forEach(a => a.addEventListener('click', () => {
    const box = document.querySelector(`.quote-form input[value="${a.dataset.service}"]`);
    if (box) box.checked = true;
  }));

  const form = document.getElementById('quote-form');
  const status = form.querySelector('.form-status');
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('[required]').forEach(f => {
      const bad = !f.value.trim();
      f.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) {
      status.className = 'form-status err';
      status.textContent = 'Please fill in your name, phone, town, and what you need done.';
      return;
    }
    // TODO: connect to a form backend (Formspree, Wix Forms, Netlify Forms, etc.)
    status.className = 'form-status ok';
    status.textContent = "Thanks! I'll get back to you soon to set up your free estimate.";
    form.reset();
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
