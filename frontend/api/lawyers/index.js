const { readFileSync } = require('fs');
const { join } = require('path');

function loadLawyers() {
  const filePath = join(process.cwd(), 'frontend', 'api', 'lawyers', 'data', 'lawyers.json');
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function normalize(lawyer = {}) {
  return {
    id: lawyer.id,
    name: lawyer.name,
    city: lawyer.city,
    specialization: lawyer.specialization,
    experience: Number(lawyer.experience || 0),
    rating: Number(lawyer.rating || 0),
    fee: Number(lawyer.fee || 0),
    phone: lawyer.phone || '',
    barCouncilId: lawyer.barCouncilId || '',
    verified: Boolean(lawyer.verified)
  };
}

function matchesFilters(lawyer, query) {
  const city = String(query.city || '').trim().toLowerCase();
  const specialization = String(query.specialization || '').trim().toLowerCase();
  const minRating = Number(query.minRating || 0);

  const cityMatch = !city || city === 'all' || String(lawyer.city || '').toLowerCase() === city;

  const specializationText = `${lawyer.specialization || ''}`.toLowerCase();
  const specializationMatch = !specialization || specializationText.includes(specialization);

  const ratingMatch = !Number.isFinite(minRating) || minRating <= 0 || Number(lawyer.rating || 0) >= minRating;

  return cityMatch && specializationMatch && ratingMatch;
}

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
  }

  try {
    const lawyers = loadLawyers().map(normalize).filter((item) => matchesFilters(item, req.query || {}));
    return res.status(200).json({ success: true, data: lawyers });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch lawyers', details: error.message } });
  }
};
