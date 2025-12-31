const { getAllCountries } = require('./_lib');

module.exports = (req, res) => {
  const countries = getAllCountries().filter(c => c.timezone);
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(countries);
};
