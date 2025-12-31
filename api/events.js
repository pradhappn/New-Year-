const { getAllCountries, DateTime } = require('./_lib');

module.exports = (req, res) => {
  try {
    const countries = getAllCountries().filter(c => c.timezone);
    const nowUtc = DateTime.utc();
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
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ utc: nowUtc.toISO(), countries: computed });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
