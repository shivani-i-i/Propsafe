/**
 * PropSafe — API Layer
 * All backend communication lives here.
 * Base URL: http://localhost:3000
 */

const API_BASE = 'http://localhost:3000';

/* ─── Generic request helper ─── */
async function apiRequest(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    let errMsg = `Server error ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
}

/* ─── Fraud Detection ─── */
/**
 * POST /api/fraud/analyze
 * @param {Object} payload - Property form data
 * @returns {Promise<Object>} - { score, riskLevel, summary, flags, positives, recommendation, immediateAction }
 */
export async function analyzeFraud(payload) {
  return apiRequest('POST', '/api/fraud/analyze', payload);
}

/* ─── Lawyer Marketplace ─── */
/**
 * GET /api/lawyers?city=...&specialization=...
 * @param {string} city
 * @param {string} specialization
 * @returns {Promise<Array>} - Array of lawyer objects
 */
export async function fetchLawyers(city = '', specialization = '') {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (specialization) params.set('specialization', specialization);
  const qs = params.toString();
  return apiRequest('GET', `/api/lawyers${qs ? '?' + qs : ''}`);
}

/* ─── Price Prediction ─── */
/**
 * POST /api/price/predict
 * @param {Object} payload - { locality, currentValue, propertyType, askingPrice }
 * @returns {Promise<Object>} - { historical, predicted, stats, insight, negotiation, infraTags }
 */
export async function predictPrice(payload) {
  return apiRequest('POST', '/api/price/predict', payload);
}

/* ─── Legal AI Chat ─── */
/**
 * POST /api/chat
 * @param {Array} messages - [{ role: 'user'|'assistant', content: string }]
 * @returns {Promise<Object>} - { reply: string }
 */
export async function sendChatMessage(messages) {
  return apiRequest('POST', '/api/chat', { messages });
}

/* ─── Mock / Fallback Data (used when backend is offline) ─── */

export function getMockFraudResult(formData) {
  const transfers = parseInt(formData.ownershipTransfers) || 0;
  const propValue = parseFloat(formData.propertyValue) || 50;
  const income    = parseFloat(formData.sellerIncome)   || 10;
  const encumb    = formData.encumbranceStatus || 'clean';

  let score = 30;
  let flags = [];
  let positives = [];

  // Rapid transfers
  if (transfers >= 5) {
    score += 35;
    flags.push({ severity: 'high', name: 'Rapid Ownership Churn', desc: `${transfers} transfers in 2 years is a strong fraud indicator.` });
  } else if (transfers >= 3) {
    score += 18;
    flags.push({ severity: 'medium', name: 'Multiple Recent Transfers', desc: `${transfers} transfers raises questions about clear title.` });
  } else {
    positives.push({ name: 'Stable Ownership History', desc: 'Low number of transfers indicates genuine ownership.' });
  }

  // Income vs property value
  const ratio = propValue / income;
  if (ratio > 15) {
    score += 20;
    flags.push({ severity: 'high', name: 'Income-Value Mismatch', desc: `Seller's income (₹${income}L) is far too low for ₹${propValue}L property — potential benami.` });
  } else if (ratio > 8) {
    score += 10;
    flags.push({ severity: 'medium', name: 'Moderate Income Disparity', desc: 'Seller income does not match property value comfortably.' });
  } else {
    positives.push({ name: 'Income Aligns With Property Value', desc: 'Property value is proportionate to stated seller income.' });
  }

  // Encumbrance
  if (encumb === 'loan') {
    score += 20;
    flags.push({ severity: 'high', name: 'Active Mortgage Detected', desc: 'Property has pending loans — do NOT proceed without bank NOC.' });
  } else if (encumb === 'disputed') {
    score += 30;
    flags.push({ severity: 'high', name: 'Court Dispute Active', desc: 'Ongoing court case makes this property legally untransferrable.' });
  } else if (encumb === 'unavailable') {
    score += 15;
    flags.push({ severity: 'medium', name: 'EC Not Available', desc: 'Refusal to provide Encumbrance Certificate is a serious red flag.' });
  } else {
    positives.push({ name: 'Clean Encumbrance Certificate', desc: 'No loans or disputes found — property is unencumbered.' });
  }

  // Clamp score
  score = Math.min(98, Math.max(8, score));

  let riskLevel, riskLabel;
  if (score <= 35)      { riskLevel = 'low';  riskLabel = 'LOW RISK'; }
  else if (score <= 65) { riskLevel = 'medium'; riskLabel = 'MEDIUM RISK'; }
  else                  { riskLevel = 'high';   riskLabel = 'HIGH RISK'; }

  const summaryMap = {
    low:    `This property shows a generally clean profile. Limited red flags detected. Proceed with standard due diligence — verify title deed chain and get a lawyer to review before signing.`,
    medium: `This property has several warning signs that require deeper investigation. Multiple factors raise questions about clear ownership. A verified lawyer should conduct a full title search before you commit any funds.`,
    high:   `DANGER: This property exhibits multiple high-severity fraud patterns. The combination of ${flags.filter(f=>f.severity==='high').map(f=>f.name).join(', ')} strongly suggests fraudulent intent. Do NOT pay any advance. Consult a verified lawyer immediately.`,
  };

  const recMap = {
    low:    'Hire a verified PropSafe lawyer for a ₹800 full title search. Verify the seller\'s identity with Aadhaar-linked records. Check construction permits if applicable. Read all sale deed clauses before signing.',
    medium: 'Stop any advance payment until a full title search is complete. Demand a certified copy of all previous sale deeds. Verify encumbrance certificate directly from the Sub-Registrar office. Do not trust any documents handed by the seller alone.',
    high:   'Do NOT proceed with this purchase under any circumstances until every flag is cleared. File an RTI to verify ownership at the Sub-Registrar. Engage a verified lawyer immediately. If you have already paid, contact your bank to freeze the transaction.',
  };

  const actionMap = {
    low:    'Book a ₹800 verified lawyer consultation to review the title deed before signing the sale deed.',
    medium: 'Demand the original Encumbrance Certificate directly from the Sub-Registrar and do not pay any advance.',
    high:   '🚨 STOP ALL PAYMENTS — connect to a verified lawyer RIGHT NOW before proceeding further.',
  };

  return {
    score,
    riskLevel,
    riskLabel,
    summary: summaryMap[riskLevel],
    flags,
    positives,
    recommendation: recMap[riskLevel],
    immediateAction: actionMap[riskLevel],
  };
}

export function getMockLawyers(city = '', specialization = '') {
  const allLawyers = [
    {
      id: 1, name: 'Anitha Krishnamurthy', initial: 'A',
      specialization: 'Property Title Expert',
      rating: 4.9, reviews: 312,
      tags: ['Title Deed', 'RERA', 'Sale Deed'],
      city: 'Chennai', experience: 14,
      price: 800, oldPrice: 5000,
      verified: true,
    },
    {
      id: 2, name: 'Rajesh Mehta', initial: 'R',
      specialization: 'Benami & Fraud Specialist',
      rating: 4.8, reviews: 278,
      tags: ['Benami Cases', 'Civil Disputes', 'Fraud Prevention'],
      city: 'Mumbai', experience: 18,
      price: 900, oldPrice: 5500,
      verified: true,
    },
    {
      id: 3, name: 'Priya Nair', initial: 'P',
      specialization: 'RERA & Builder Disputes',
      rating: 4.7, reviews: 195,
      tags: ['RERA', 'Builder Agreements', 'Flat Purchase'],
      city: 'Bangalore', experience: 11,
      price: 700, oldPrice: 5000,
      verified: true,
    },
    {
      id: 4, name: 'Suresh Iyer', initial: 'S',
      specialization: 'Land Revenue & Survey',
      rating: 4.9, reviews: 440,
      tags: ['Land Survey', 'Patta Transfer', 'Agricultural Land'],
      city: 'Chennai', experience: 22,
      price: 1000, oldPrice: 6000,
      verified: true,
    },
    {
      id: 5, name: 'Kavitha Reddy', initial: 'K',
      specialization: 'Property Registration',
      rating: 4.6, reviews: 167,
      tags: ['Sale Deed', 'Title Deed', 'Registration'],
      city: 'Hyderabad', experience: 9,
      price: 600, oldPrice: 4500,
      verified: true,
    },
    {
      id: 6, name: 'Arjun Sharma', initial: 'A',
      specialization: 'Encumbrance & Mortgage',
      rating: 4.8, reviews: 223,
      tags: ['Encumbrance', 'Bank NOC', 'Mortgage Clearance'],
      city: 'Delhi', experience: 13,
      price: 850, oldPrice: 5200,
      verified: true,
    },
  ];

  return allLawyers.filter(l => {
    const cityMatch = !city || city === 'all' || l.city.toLowerCase() === city.toLowerCase();
    const specMatch = !specialization || specialization === 'all' ||
      l.tags.some(t => t.toLowerCase().includes(specialization.toLowerCase())) ||
      l.specialization.toLowerCase().includes(specialization.toLowerCase());
    return cityMatch && specMatch;
  });
}

export function getMockPriceResult(formData) {
  const currentVal = parseFloat(formData.currentValue) || 50;
  const askingPrice = parseFloat(formData.askingPrice) || currentVal * 1.1;

  // Generate historical data 2015-2024
  const historical = [];
  let v = currentVal * 0.48;
  for (let y = 2015; y <= 2024; y++) {
    v = v * (1 + (0.07 + Math.random() * 0.06));
    historical.push({ year: y, value: Math.round(v * 10) / 10 });
  }
  historical[historical.length - 1].value = currentVal;

  // Generate predictions 2025-2026
  const pred2025 = Math.round(currentVal * 1.09 * 10) / 10;
  const pred2026 = Math.round(currentVal * 1.19 * 10) / 10;
  const predicted = [
    { year: 2025, value: pred2025 },
    { year: 2026, value: pred2026 },
  ];

  const appreciation = Math.round(((pred2026 - currentVal) / currentVal) * 100);
  const overpricedBy = Math.round((askingPrice - currentVal) * 10) / 10;
  const openNego = Math.round((currentVal * 0.94) * 10) / 10;
  const settleMax = Math.round((currentVal * 1.02) * 10) / 10;

  return {
    historical,
    predicted,
    stats: {
      currentValue: currentVal,
      predicted2026: pred2026,
      appreciation,
      overpricedBy: overpricedBy > 0 ? overpricedBy : 0,
    },
    insight: `This property is currently valued at ₹${currentVal} Lakhs. Based on historical appreciation trends in ${formData.locality || 'this locality'} and confirmed metro connectivity arriving in 2026, it is projected to reach ₹${pred2025}–${pred2026} Lakhs — a ${appreciation}% return over two years.`,
    negotiation: overpricedBy > 0
      ? `Seller is asking ₹${askingPrice} Lakhs but fair market value is ₹${currentVal} Lakhs. This property is overpriced by ₹${overpricedBy} Lakhs. Open negotiation at ₹${openNego} Lakhs and settle no higher than ₹${settleMax} Lakhs.`
      : `The asking price of ₹${askingPrice} Lakhs is in line with or below market value. This is a fair deal. You may still open at ₹${openNego} Lakhs to leave room for negotiation.`,
    infraTags: ['Metro Extension 2026', 'Ring Road Connectivity', 'New IT Corridor', 'Government Hospital 2025', 'University Campus'],
  };
}
