const { getAllCountries } = require('../../../api/_lib');

module.exports = async (req, res) => {
  const code = (req.query.code || req.params && req.params.code || '').toUpperCase() || (req.url && req.url.split('/').slice(-2)[0] || '').toUpperCase();
  const countries = getAllCountries().filter(c => c.timezone);
  const c = countries.find(x => (x.code || '').toUpperCase() === code);
  if (!c) return res.status(404).json({ error: 'country not found' });

  const name = c.name;
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

  if (req.query && req.query.enrich === '1') {
    try {
      if (globalThis.fetch) {
        const wikiResp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
        if (wikiResp && wikiResp.ok) {
          const wj = await wikiResp.json();
          localSummary.wikiSummary = wj.extract || localSummary.wikiSummary;
          localSummary.wikiUrl = (wj.content_urls && wj.content_urls.desktop && wj.content_urls.desktop.page) || localSummary.wikiUrl;
        }
      }
    } catch (err) {
      console.warn('enrich failed', err && err.message);
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ code, name, timezone: c.timezone, summary: localSummary, leader: localLeader, images: localImages, newsSearch, youtubeSearch, wishes });
};
