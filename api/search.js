module.exports = async (req, res) => {
  const key = process.env.YOUTUBE_API_KEY;
  const q = req.query.q || req.query.query || '';
  if (!key) return res.status(501).json({ error: 'YOUTUBE_API_KEY not configured on server' });
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
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
