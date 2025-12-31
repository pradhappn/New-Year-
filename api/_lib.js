const { DateTime } = require('luxon');
let cat = null;
try {
  cat = require('countries-and-timezones');
} catch (e) {
  // optional dependency
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

module.exports = { getAllCountries, DateTime };
