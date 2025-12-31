// For virtualization we use a dedicated viewport and virtual list
const viewport = document.createElement('div');
viewport.id = 'viewport';
const gridEl = document.getElementById('grid');
gridEl.parentNode.replaceChild(viewport, gridEl);
viewport.appendChild(gridEl);
gridEl.id = 'virtual-list';
const grid = gridEl;
const filter = document.getElementById('filter');
let countries = [];
let placeholdersObserver = null;
let oneByOneMode = false;
let oneByOneTimer = null;
let currentOneIndex = 0;
// lighting overlay element
const lightingEl = document.createElement('div');
lightingEl.className = 'lighting';
document.body.appendChild(lightingEl);
// Canvas for physics-based confetti/fireworks
const canvas = document.getElementById('celebrate-canvas');
const ctx = canvas.getContext ? canvas.getContext('2d') : null;
let particles = [];
function resizeCanvas() { if (!canvas) return; canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();

function spawnParticles(x, y, opts = {}) {
  const count = opts.count || 80;
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * (opts.spread || 8),
      vy: -Math.random() * (opts.power || 6) - 2,
      size: Math.random() * 6 + 4,
      color: opts.colors ? opts.colors[Math.floor(Math.random() * opts.colors.length)] : `hsl(${Math.random()*360}|60%|60%)`,
      life: 60 + Math.random() * 60,
      type: opts.type || 'confetti'
    });
  }
}

function updateAndRenderParticles() {
  if (!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.vy += 0.12; // gravity
    p.x += p.vx; p.y += p.vy;
    p.life -= 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / 120);
    if (p.type === 'confetti') {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size*0.6);
    } else {
      ctx.beginPath(); ctx.fillStyle = p.color; ctx.arc(p.x, p.y, p.size*0.6, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    if (p.life <= 0 || p.y > canvas.height + 200) particles.splice(i,1);
  }
  if (particles.length > 0) requestAnimationFrame(updateAndRenderParticles);
}

function triggerCanvasCelebration(country) {
  // spawn at center-top for skyline fireworks, and random bottom positions for confetti
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.25;
  // fireworks bursts
  for (let i=0;i<6;i++) spawnParticles(cx + (Math.random()-0.5)*400, cy + (Math.random()-0.5)*80, {count:40, power:8 + Math.random()*6, spread:12, colors: ['#ffd166','#ff6b6b','#6ee7b7','#8b5cf6'], type:'burst'});
  // confetti
  spawnParticles(window.innerWidth/2, window.innerHeight*0.8, {count:140, power:3, spread:6, colors:['#ffb855','#ff6b6b','#6ee7b7','#8b5cf6'], type:'confetti'});
  requestAnimationFrame(updateAndRenderParticles);
}

function codeToFlag(code) {
  if (!code) return '';
  const OFFSET = 0x1F1E6 - 'A'.charCodeAt(0);
  return code.toUpperCase().replace(/[^A-Z]/g, '').split('').map(c => String.fromCodePoint(c.charCodeAt(0) + OFFSET)).join('');
}

function formatRemaining(seconds) {
  if (seconds <= 0) return '00:00:00';
  let s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function createCard(c) {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.code = c.code;
  el.style.position = 'absolute';
  el.style.width = '220px';
  el.style.boxSizing = 'border-box';
  el.innerHTML = `
    <div class="card-head">
      <div class="left">
        <div class="flag">${codeToFlag(c.code)}</div>
        <div class="meta">
          <div class="country">${c.name}</div>
          <div class="tz">${c.timezone}</div>
        </div>
      </div>
      <div class="actions">
        <button class="live-btn" data-name="${encodeURIComponent(c.name)}">Search Live</button>
      </div>
    </div>
    <div class="time">--:--:--</div>
    <div class="remaining">Loading...</div>
    <div class="status"></div>
  `;
  // if item contains time info, initialize displays
  try {
    const timeEl = el.querySelector('.time');
    const remEl = el.querySelector('.remaining');
    if (c.localISO) {
      const local = new Date(c.localISO);
      timeEl.textContent = local.toLocaleTimeString();
    }
    if (typeof c.remaining !== 'undefined') {
      remEl.textContent = c.remaining > 0 ? `New Year in ${formatRemaining(c.remaining)}` : 'Happy New Year!';
    }
  } catch (err) {
    // ignore initialization errors
  }
  return el;
}

function updateCards(payload) {
  const list = payload.countries;
  list.forEach(c => {
    const el = grid.querySelector(`article[data-code="${c.code}"]`);
    if (!el) return;
    const timeEl = el.querySelector('.time');
    const remEl = el.querySelector('.remaining');
    const statusEl = el.querySelector('.status');
    const local = new Date(c.localISO);
    timeEl.textContent = local.toLocaleTimeString();
    remEl.textContent = c.remaining > 0 ? `New Year in ${formatRemaining(c.remaining)}` : 'Happy New Year!';
    statusEl.textContent = c.celebrating ? '🎉 Celebrating' : '';
    el.classList.toggle('celebrating', c.celebrating);
  });

  // (country click handled in init's viewport click handler)
  // reorder DOM to match the server-sent order (earliest New Year first)
  list.forEach(c => {
    const el = grid.querySelector(`article[data-code="${c.code}"]`);
    if (el) grid.appendChild(el);
  });
  // detect newly celebrating countries and trigger visuals
  if (!window.__lastCelebrating) window.__lastCelebrating = new Set();
  list.forEach(c => {
    if (c.celebrating && !window.__lastCelebrating.has(c.code)) {
      triggerCelebration(c);
      // also trigger canvas celebration for realism
      triggerCanvasCelebration(c);
      window.__lastCelebrating.add(c.code);
      // if one-by-one mode active and it's the focused country, add lighting
      if (oneByOneMode && countries[currentOneIndex] && countries[currentOneIndex].code === c.code) {
        lightingEl.classList.add('pulse');
        setTimeout(() => lightingEl.classList.remove('pulse'), 1200);
      }
    }
    if (!c.celebrating && window.__lastCelebrating.has(c.code)) {
      window.__lastCelebrating.delete(c.code);
    }
  });
  // If one-by-one mode, auto-advance when the focused country reaches New Year
  if (oneByOneMode) {
    const focused = countries[currentOneIndex];
    if (focused) {
      const entry = list.find(x => x.code === focused.code);
      if (entry && (entry.celebrating || entry.remaining === 0)) {
        if (currentOneIndex < countries.length - 1) {
          currentOneIndex++;
          scrollToIndex(currentOneIndex);
        }
      }
    }
  }
}

// Modal helpers
function openModal(videoId) {
  const modal = document.getElementById('video-modal');
  const iframe = document.getElementById('video-iframe');
  // show iframe player
  const fallback = document.getElementById('fallback-body');
  fallback.style.display = 'none';
  iframe.style.display = '';
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'block';
}

function closeModal() {
  const modal = document.getElementById('video-modal');
  const iframe = document.getElementById('video-iframe');
  iframe.src = '';
  modal.setAttribute('aria-hidden', 'true');
  modal.style.display = 'none';
}

function showFallback(query) {
  const modal = document.getElementById('video-modal');
  const iframe = document.getElementById('video-iframe');
  const fallback = document.getElementById('fallback-body');
  const text = document.getElementById('fallback-text');
  const open = document.getElementById('fallback-open');
  iframe.src = '';
  iframe.style.display = 'none';
  text.textContent = `No live stream found for "${query}".`;
  open.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  fallback.style.display = '';
  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'block';
}

// Modal event bindings
document.addEventListener('click', (ev) => {
  if (ev.target.id === 'modal-close' || ev.target.classList.contains('modal-backdrop')) closeModal();
  if (ev.target.id === 'country-close' || ev.target.classList.contains('modal-backdrop')) {
    const cm = document.getElementById('country-modal');
    if (cm) { cm.setAttribute('aria-hidden', 'true'); cm.style.display = 'none'; }
  }
});

// Celebration visuals: balloons and sky crackers
function triggerCelebration(country) {
  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.setAttribute('data-country', country.code);
  document.body.appendChild(overlay);

  // spawn balloons
  for (let i = 0; i < 8; i++) {
    const b = document.createElement('div');
    b.className = 'balloon';
    b.style.left = `${10 + Math.random() * 80}%`;
    b.style.animationDelay = `${Math.random() * 1}s`;
    overlay.appendChild(b);
  }

  // spawn sky crackers
  for (let i = 0; i < 12; i++) {
    const f = document.createElement('div');
    f.className = 'firework';
    f.style.left = `${5 + Math.random() * 90}%`;
    f.style.top = `${10 + Math.random() * 50}%`;
    f.style.animationDelay = `${Math.random() * 0.8}s`;
    overlay.appendChild(f);
  }

  // small toast on the card
  const card = grid.querySelector(`article[data-code="${country.code}"]`);
  if (card) {
    const toast = document.createElement('div');
    toast.className = 'celebrate-badge';
    toast.textContent = `Happy New Year — ${country.name}!`;
    card.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  // remove overlay after animation
  setTimeout(() => {
    overlay.remove();
  }, 7000);
  // play sound if enabled
  if (window.__celebrationSound) {
    // try per-country richer cheer first
    playCountryCheer(country.code).catch(() => playCelebrationSound());
  }
}

// Play or generate a per-country cheer audio and play it
const countryAudioCache = {};
async function playCountryCheer(code) {
  if (!window.__celebrationSound) return;
  if (countryAudioCache[code]) {
    const a = new Audio(countryAudioCache[code]); a.play(); return;
  }
  // synthesize a cheer blob tuned by country code
  const blob = await synthCheerBlobFor(code);
  const url = URL.createObjectURL(blob);
  countryAudioCache[code] = url;
  const a = new Audio(url); a.play();
}

// Create a cheer blob varying with country code to feel localized
async function synthCheerBlobFor(code) {
  // derive a simple numeric seed from code
  let seed = 0; for (let i=0;i<code.length;i++) seed = (seed * 31 + code.charCodeAt(i)) & 0xffff;
  const base = 600 + (seed % 600); // frequency base between 600-1200
  const freqs = [base, base * 1.33, base * 1.66];
  const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100 * 2, 44100);
  const now = 0;
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.value = 0.22 - i*0.04;
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.02);
    o.stop(now + 1.6);
  });
  // add burst noise
  const noiseSrc = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, 44100 * 1, 44100);
  const data = buf.getChannelData(0);
  for (let i=0;i<data.length;i++) data[i] = (Math.random()*2-1)*(1 - i/data.length);
  noiseSrc.buffer = buf; const ng = ctx.createGain(); ng.gain.value = 0.6; noiseSrc.connect(ng).connect(ctx.destination); noiseSrc.start(now); noiseSrc.stop(now + 0.8);
  const rendered = await ctx.startRendering();
  return audioBufferToWavBlob(rendered);
}

function startOneByOne() {
  // ensure single-column layout
  const viewportEl = document.getElementById('viewport');
  grid.dataset.cols = 1;
  grid.dataset.itemWidth = viewportEl.clientWidth;
  grid.dataset.itemHeight = 220;
  currentOneIndex = 0;
  scrollToIndex(currentOneIndex);
  oneByOneTimer = setInterval(() => {
    currentOneIndex = Math.min(countries.length - 1, currentOneIndex + 1);
    scrollToIndex(currentOneIndex);
  }, 3000);
}

function stopOneByOne() {
  clearInterval(oneByOneTimer);
  oneByOneTimer = null;
  // remove focused highlight
  document.querySelectorAll('.card.focused').forEach(n => n.classList.remove('focused'));
}

function scrollToIndex(idx) {
  const viewportEl = document.getElementById('viewport');
  const cols = parseInt(grid.dataset.cols || '1', 10);
  const itemH = parseInt(grid.dataset.itemHeight || '200', 10);
  const row = Math.floor(idx / cols);
  const y = row * itemH;
  viewportEl.scrollTo({ top: y, behavior: 'smooth' });
  // after a short delay, highlight the card
  setTimeout(() => {
    document.querySelectorAll('.card.focused').forEach(n => n.classList.remove('focused'));
    const el = document.querySelector(`.card[data-code="${countries[idx].code}"]`);
    if (el) el.classList.add('focused');
  }, 450);
}

// Sound synthesis: simple fireworks + cheer using WebAudio
function playCelebrationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // fireworks: quick burst noise
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.9;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0, now);
    noiseGain.gain.linearRampToValueAtTime(0.8, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    noise.connect(noiseGain).connect(ctx.destination);
    noise.start(now);

    // celebratory chord
    const freqs = [660, 880, 1100];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, now + 0.03 + i * 0.03);
      g.gain.setValueAtTime(0.0, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.05 + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      o.connect(g).connect(ctx.destination);
      o.start(now + 0.03 + i * 0.03);
      o.stop(now + 1.05);
    });
  } catch (e) {
    console.warn('Audio error', e);
  }
}

async function init() {
  const res = await fetch('/api/countries');
  countries = await res.json();
  // virtualization setup
  const viewportEl = document.getElementById('viewport');
  grid.innerHTML = '';
  const itemWidth = 240; // approximate card width including gap
  const itemHeight = 200; // assumed row height
  let cols = Math.max(1, Math.floor(viewportEl.clientWidth / itemWidth));
  let rows = Math.ceil(countries.length / cols);
  const totalHeight = rows * itemHeight;
  grid.style.height = totalHeight + 'px';
  grid.style.position = 'relative';
  grid.dataset.itemWidth = itemWidth;
  grid.dataset.itemHeight = itemHeight;
  grid.dataset.cols = cols;

  // initial render
  const renderWindow = () => {
    const scrollTop = viewportEl.scrollTop;
    const vh = viewportEl.clientHeight;
    cols = Math.max(1, Math.floor(viewportEl.clientWidth / itemWidth));
    rows = Math.ceil(countries.length / cols);
    const totalH = rows * itemHeight;
    grid.style.height = totalH + 'px';

    const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const endRow = Math.min(rows - 1, Math.floor((scrollTop + vh) / itemHeight) + 2);
    const startIndex = startRow * cols;
    const endIndex = Math.min(countries.length - 1, (endRow + 1) * cols - 1);

    // clear previous children
    grid.querySelectorAll('.card').forEach(n => n.remove());

    for (let i = startIndex; i <= endIndex; i++) {
      const item = countries[i];
      if (!item) continue;
      const c = createCard(item);
      const row = Math.floor(i / cols);
      const col = i % cols;
      const gap = 12;
      const left = col * (itemWidth);
      c.style.transform = `translate(${left}px, ${row * itemHeight}px)`;
      grid.appendChild(c);
    }
  };

  // attach scroll and resize handlers
  viewportEl.addEventListener('scroll', renderWindow);
  window.addEventListener('resize', renderWindow);
  renderWindow();

  // populate test-country select
  const testSelect = document.getElementById('test-country');
  countries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = `${c.name} (${c.code})`;
    testSelect.appendChild(opt);
  });

  // (virtualization renders visible items via renderWindow)

  // Polling-based events (serverless-friendly). Fetch /api/events every second.
  let _evtTimer = null;
  async function pollEvents() {
    try {
      const r = await fetch('/api/events');
      if (!r.ok) return;
      const payload = await r.json();
      if (payload && payload.countries && payload.countries.length) {
        countries = payload.countries.map(c => ({ code: c.code, name: c.name, timezone: c.timezone, localISO: c.localISO, remaining: c.remaining, celebrating: c.celebrating }));
      }
      const viewportEl = document.getElementById('viewport');
      if (viewportEl) {
        viewportEl.dispatchEvent(new Event('scroll'));
        const lineupToggle = document.getElementById('lineup-toggle');
        if (lineupToggle && lineupToggle.checked) scrollToIndex(0);
      }
      updateCards(payload);
    } catch (err) {
      // ignore polling errors silently
    }
  }
  pollEvents();
  _evtTimer = setInterval(pollEvents, 1000);

  viewportEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.live-btn');
    if (btn) {
      const name = decodeURIComponent(btn.dataset.name || '');
      const query = `New Year live ${name}`;
      fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json()).then(data => {
        if (data && data.available && data.videoId) {
          openModal(data.videoId);
        } else {
          showFallback(query);
        }
      }).catch(() => showFallback(query));
      return;
    }

    // country name click opens details modal
    const nameEl = ev.target.closest('.country');
    if (nameEl) {
      const card = nameEl.closest('.card');
      if (!card) return;
      const code = card.dataset.code;
      if (!code) return;
      (async () => {
        try {
          const r = await fetch(`/api/country/${encodeURIComponent(code)}/details?enrich=1`);
          if (!r.ok) throw new Error('failed');
          const data = await r.json();
          openCountryModal(data);
        } catch (e) {
          alert('Failed to fetch country details');
        }
      })();
    }
  });

  filter.addEventListener('input', () => {
    const q = filter.value.toLowerCase();
    grid.querySelectorAll('article').forEach(a => {
      const text = a.textContent.toLowerCase();
      a.style.display = text.includes(q) ? '' : 'none';
    });
  });

  // Test celebration button
  const testBtn = document.getElementById('test-celebrate');
  testBtn.addEventListener('click', () => {
    const sel = document.getElementById('test-country').value;
    let target = null;
    if (sel === '__auto') target = countries[0];
    else target = countries.find(c => c.code === sel);
    if (target) triggerCelebration(target);
  });

  // Sound toggle (default checked)
  window.__celebrationSound = !!document.getElementById('sound-toggle').checked;
  document.getElementById('sound-toggle').addEventListener('change', (e) => {
    window.__celebrationSound = e.target.checked;
  });

  // Preview All: sequentially trigger celebrations for a handful of countries
  const previewBtn = document.getElementById('preview-all');
  previewBtn.addEventListener('click', async () => {
    const list = countries.slice(0, Math.min(12, countries.length));
    for (let i = 0; i < list.length; i++) {
      triggerCelebration(list[i]);
      await new Promise(r => setTimeout(r, 900));
    }
  });

  // One-by-one toggle
  const oneToggle = document.getElementById('onebyone-toggle');
  oneToggle.addEventListener('change', (e) => {
    oneByOneMode = !!e.target.checked;
    if (oneByOneMode) startOneByOne(); else stopOneByOne();
  });
  // Lineup toggle: when enabled, force single-column lineup from first to last
  const lineupToggle = document.getElementById('lineup-toggle');
  lineupToggle.addEventListener('change', (e) => {
    const on = !!e.target.checked;
    const viewportEl = document.getElementById('viewport');
    if (on) {
      // force single column layout
      grid.dataset.cols = 1;
      grid.dataset.itemHeight = 220;
      viewportEl.scrollTop = 0;
      // ensure render
      viewportEl.dispatchEvent(new Event('scroll'));
    } else {
      // restore render
      viewportEl.dispatchEvent(new Event('scroll'));
    }
  });

  // Generate downloadable audio blobs and attach links
  generateAndAttachAudio();
}

// Generate audio blobs for download and create hidden audio players
async function generateAndAttachAudio() {
  // create two blobs: fireworks and cheer using WebAudio offline rendering
  try {
    const fireBlob = await synthFireworkBlob();
    const cheerBlob = await synthCheerBlob();
    const fireUrl = URL.createObjectURL(fireBlob);
    const cheerUrl = URL.createObjectURL(cheerBlob);
    const container = document.getElementById('sound-downloads');
    // create play and download for firework
    const fplay = document.createElement('button'); fplay.textContent = 'Play Firework'; fplay.className='primary';
    const fdl = document.createElement('a'); fdl.href = fireUrl; fdl.download = 'firework.wav'; fdl.textContent='Download Firework'; fdl.style.color='#cfe8ff';
    const aplay = document.createElement('button'); aplay.textContent = 'Play Cheer'; aplay.className='primary';
    const adl = document.createElement('a'); adl.href = cheerUrl; adl.download = 'cheer.wav'; adl.textContent='Download Cheer'; adl.style.color='#cfe8ff';
    container.appendChild(fplay); container.appendChild(fdl); container.appendChild(aplay); container.appendChild(adl);
    const fireAudio = new Audio(fireUrl); const cheerAudio = new Audio(cheerUrl);
    fplay.addEventListener('click', () => fireAudio.play());
    aplay.addEventListener('click', () => cheerAudio.play());
  } catch (e) {
    console.warn('Audio generation failed', e);
  }
}

async function synthFireworkBlob() {
  const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100 * 1, 44100);
  const now = 0;
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, 44100 * 1, 44100);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  noise.buffer = buffer;
  const g = ctx.createGain(); g.gain.value = 0.8;
  noise.connect(g).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.8);
  const rendered = await ctx.startRendering();
  return audioBufferToWavBlob(rendered);
}

async function synthCheerBlob() {
  const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100 * 2, 44100);
  const now = 0;
  const freqs = [660, 880, 1100];
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.value = 0.25;
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.02);
    o.stop(now + 1.2);
  });
  const rendered = await ctx.startRendering();
  return audioBufferToWavBlob(rendered);
}

function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  }
  let offset = 0;
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, buffer.sampleRate, true); offset += 4;
  view.setUint32(offset, buffer.sampleRate * numOfChan * 2, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4;
  // write interleaved
  const channels = [];
  for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
  let pos = offset;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      pos += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}

init();

// Modal UI for showing search results and playing embeds
function showModalWithResults(items, query) {
  let modal = document.getElementById('yt-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'yt-modal';
    modal.className = 'yt-modal';
    modal.innerHTML = `
      <div class="yt-modal-inner">
        <button class="yt-close">✕</button>
        <h3 class="yt-title"></h3>
        <div class="yt-list"></div>
        <div class="yt-player" style="display:none"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.yt-close').addEventListener('click', () => { modal.remove(); });
  }
  modal.querySelector('.yt-title').textContent = query;
  const list = modal.querySelector('.yt-list');
  const player = modal.querySelector('.yt-player');
  player.style.display = 'none';
  player.innerHTML = '';
  list.innerHTML = '';
  items.forEach(it => {
    const r = document.createElement('div');
    r.className = 'yt-row';
    r.innerHTML = `
      <img src="${it.thumbnail}" class="yt-thumb" />
      <div class="yt-meta"><div class="yt-title-row">${it.title}</div><button class="yt-play" data-id="${it.id}">Play</button></div>
    `;
    list.appendChild(r);
  });
  list.querySelectorAll('.yt-play').forEach(b => b.addEventListener('click', (ev) => {
    const id = ev.target.dataset.id;
    player.style.display = '';
    player.innerHTML = `<iframe width="100%" height="360" src="https://www.youtube.com/embed/${id}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    // scroll into view
    player.scrollIntoView({ behavior: 'smooth' });
  }));
}

function openCountryModal(data) {
  const cm = document.getElementById('country-modal');
  const title = document.getElementById('country-title');
  const summaryEl = document.getElementById('country-summary');
  const leaderEl = document.getElementById('country-leader');
  const imagesEl = document.getElementById('country-images');
  const wishesEl = document.getElementById('country-wishes');
  const newsLink = document.getElementById('country-news');
  const ytLink = document.getElementById('country-youtube');
  title.textContent = `${data.name} (${data.code})`;
  summaryEl.textContent = data.summary && data.summary.wikiSummary ? data.summary.wikiSummary : 'No summary available.';
  leaderEl.innerHTML = '';
  if (data.leader && data.leader.query) {
    const a = document.createElement('a'); a.href = data.leader.wikiUrl || '#'; a.target = '_blank'; a.rel='noopener'; a.textContent = data.leader.query;
    const p = document.createElement('p'); p.textContent = data.leader.wikiSummary || ''; leaderEl.appendChild(a); leaderEl.appendChild(p);
  } else leaderEl.textContent = 'No leader info found.';
  imagesEl.innerHTML = '';
  (data.images || []).forEach(src => { const i = document.createElement('img'); i.src = src; i.style.width='160px'; i.style.height='100px'; i.style.objectFit='cover'; i.style.borderRadius='6px'; imagesEl.appendChild(i); });
  wishesEl.innerHTML = '';
  (data.wishes || []).forEach(w => { const li = document.createElement('li'); li.textContent = w; wishesEl.appendChild(li); });
  newsLink.href = data.newsSearch || '#'; ytLink.href = data.youtubeSearch || '#';
  cm.setAttribute('aria-hidden', 'false'); cm.style.display = 'flex';
}
