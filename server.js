require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
// Prefer the built-in global `fetch` (Node 18+). If unavailable, dynamically import `node-fetch`.
let fetch = globalThis.fetch;
if (!fetch) {
  try {
    fetch = (...args) => import('node-fetch').then(m => m.default(...args));
  } catch (e) {
    console.warn('node-fetch import failed, fetch unavailable', e && e.message);
  }
}
const { DateTime } = require('luxon');
let cat = null;
try {
  cat = require('countries-and-timezones');
} catch (e) {
  console.warn('countries-and-timezones not installed; using fallback list');
}

const SAMPLE = [
  { code: 'US', name: 'United States', timezone: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'IN', name: 'India', timezone: 'Asia/Kolkata' },
  { code: 'JP', name: 'Japan', timezone: 'Asia/Tokyo' },
  { code: 'AU', name: 'Australia (Sydney)', timezone: 'Australia/Sydney' }
];

function getAllCountries() {
  if (cat && cat.getAllCountries) {
    const raw = cat.getAllCountries();
    return Object.keys(raw).map(code => ({ code, name: raw[code].name, timezone: raw[code].timezones && raw[code].timezones[0] }));
  }
  if (cat && cat.countries) {
    return cat.countries.map(c => ({ code: c.iso2, name: c.name, timezone: c.timezones && c.timezones[0] }));
  }
  return SAMPLE;
}

const countries = getAllCountries().filter(c => c.timezone);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/countries', (req, res) => {
  res.json(countries);
});

// Country details aggregation endpoint
app.get('/api/country/:code/details', async (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const c = countries.find(x => (x.code || '').toUpperCase() === code);
  if (!c) return res.status(404).json({ error: 'country not found' });

  const name = c.name;

  // Fast local payload so the client can show a details modal reliably.
  const localSummary = { wikiSummary: `Details for ${name}`, wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(name)}` };
  const localLeader = { query: null, wikiSummary: null, wikiUrl: null };
  const localImages = [];
  const newsSearch = `https://www.google.com/search?q=${encodeURIComponent('New Year ' + name + ' news')}`;
  const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent('New Year live ' + name)}`;
  const wishes = [
    `Happy New Year to the people of ${name}!`,
    `Wishing prosperity and peace to ${name} in the coming year.`,
    `Warm New Year wishes to the leaders and citizens of ${name}.`
  ];

  // If the client explicitly requests enrichment, attempt external fetches
  // but fall back to local data on any network failure.
  if (req.query.enrich === '1') {
    try {
      if (fetch) {
        const wikiResp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
        if (wikiResp && wikiResp.ok) {
          const wj = await wikiResp.json();
          localSummary.wikiSummary = wj.extract || localSummary.wikiSummary;
          localSummary.wikiUrl = (wj.content_urls && wj.content_urls.desktop && wj.content_urls.desktop.page) || localSummary.wikiUrl;
        }

        const leaderTitles = [`President of ${name}`, `Prime Minister of ${name}`, `Monarch of ${name}`];
        for (const q of leaderTitles) {
          const s = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&utf8=1`);
          if (!s || !s.ok) continue;
          const sj = await s.json();
          if (sj.query && sj.query.search && sj.query.search.length) {
            const pageTitle = sj.query.search[0].title;
            localLeader.query = pageTitle;
            const p = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`);
            if (p && p.ok) {
              const pj = await p.json();
              localLeader.wikiSummary = pj.extract || null;
              localLeader.wikiUrl = (pj.content_urls && pj.content_urls.desktop && pj.content_urls.desktop.page) || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
            }
            break;
          }
        }

        const imgQ = `New Year ${name}`;
        const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(imgQ)}&gsrlimit=8&prop=pageimages&piprop=original&origin=*`;
        const ir = await fetch(imgUrl);
        if (ir && ir.ok) {
          const ij = await ir.json();
          if (ij.query && ij.query.pages) {
            Object.values(ij.query.pages).forEach(p => {
              if (p.original && p.original.source) localImages.push(p.original.source);
            });
          }
        }
      }
    } catch (err) {
      console.warn('country details enrichment failed', err && err.message);
    }
  }

  res.json({ code, name, timezone: c.timezone, summary: localSummary, leader: localLeader, images: localImages, newsSearch, youtubeSearch, wishes });
});

app.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();

  const sendUpdate = () => {
    const nowUtc = DateTime.utc();
    // compute remaining seconds per country and sort ascending so the
    // list goes from the earliest upcoming New Year to the latest
    const computed = countries.map(c => {
      const tz = c.timezone;
      const now = nowUtc.setZone(tz);
      const nextNY = DateTime.fromObject({ year: now.year + 1, month: 1, day: 1, hour: 0, minute: 0, second: 0 }, { zone: tz });
      const remaining = Math.max(0, Math.floor(nextNY.diff(now, 'seconds').seconds));
      const celebrating = now >= nextNY && now < nextNY.plus({ hours: 1 });
      return {
        code: c.code,
        name: c.name,
        timezone: tz,
        localISO: now.toISO(),
        remaining,
        celebrating
      };
    });

    computed.sort((a, b) => a.remaining - b.remaining);

    const payload = { utc: nowUtc.toISO(), countries: computed };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const iv = setInterval(sendUpdate, 1000);
  sendUpdate();

  req.on('close', () => {
    clearInterval(iv);
  });
});

// Proxy YouTube search for live videos. Requires YOUTUBE_API_KEY in .env
app.get('/api/search', async (req, res) => {
  const key = process.env.YOUTUBE_API_KEY;
  const q = req.query.q || req.query.query || '';
  if (!key) {
    return res.status(501).json({ error: 'YOUTUBE_API_KEY not configured on server' });
  }
  if (!q) return res.status(400).json({ error: 'missing query parameter `q`' });
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('eventType', 'live');
    url.searchParams.set('maxResults', '8');
    url.searchParams.set('q', q);
    url.searchParams.set('key', key);
    const r = await fetch(url.toString());
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }
    const data = await r.json();
    const items = (data.items || []).map(it => ({ id: it.id.videoId, title: it.snippet.title, thumbnail: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url }));
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
