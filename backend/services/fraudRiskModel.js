function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function severityFromPoints(points) {
  if (points >= 25) return 'HIGH';
  if (points >= 12) return 'MEDIUM';
  return 'LOW';
}

function riskLevelFromScore(score) {
  if (score >= 75) return 'HIGH';
  if (score >= 45) return 'MEDIUM';
  return 'LOW';
}

function tokenizeText(text = '') {
  return String(text).toLowerCase();
}

export function predictFraudRisk(input = {}) {
  const previousOwners = clamp(toNumber(input.previousOwners, 1), 1, 20);
  const transfersLastTwoYears = clamp(toNumber(input.transfersLastTwoYears, 0), 0, 20);
  const propertyValue = Math.max(toNumber(input.propertyValue, 0), 0);
  const sellerIncome = Math.max(toNumber(input.sellerIncome, 0), 0);
  const encumbranceStatus = String(input.encumbranceStatus || 'clean').toLowerCase();
  const propertyType = String(input.propertyType || '').toLowerCase();
  const city = String(input.city || '').toLowerCase();
  const details = tokenizeText(input.additionalDetails || '');

  const cityRiskMap = {
    mumbai: 6,
    pune: 4,
    delhi: 7,
    bengaluru: 3,
    hyderabad: 3,
    chennai: 2
  };

  const propertyTypeRiskMap = {
    land: 7,
    plot: 6,
    villa: 3,
    apartment: 2,
    commercial: 5
  };

  const ownerRiskPoints = clamp((previousOwners - 1) * 6, 0, 18);
  const transferRiskPoints = clamp(transfersLastTwoYears * 10, 0, 24);

  const incomeToValueRatio = propertyValue > 0 ? sellerIncome / propertyValue : 1;
  let incomeMismatchPoints = 0;
  if (incomeToValueRatio < 0.08) incomeMismatchPoints = 18;
  else if (incomeToValueRatio < 0.15) incomeMismatchPoints = 10;

  let encumbrancePoints = 0;
  if (encumbranceStatus.includes('litigation') || encumbranceStatus.includes('dispute')) encumbrancePoints = 28;
  else if (encumbranceStatus.includes('mortgage') || encumbranceStatus.includes('pending')) encumbrancePoints = 14;
  else if (encumbranceStatus.includes('unknown')) encumbrancePoints = 10;

  const cityRiskPoints = cityRiskMap[city] || 2;
  const propertyTypePoints = propertyTypeRiskMap[propertyType] || 2;

  const riskyPatterns = [
    { pattern: /power of attorney|poa/, points: 10, issue: 'POA-based transaction', detail: 'Power-of-attorney sale requires deep title-chain verification.' },
    { pattern: /cash deal|cash only/, points: 10, issue: 'Cash-heavy transaction terms', detail: 'Cash-only terms are a common fraud marker in distressed transfers.' },
    { pattern: /urgent sale|immediate transfer/, points: 8, issue: 'Unusual urgency in sale', detail: 'High-pressure timelines often reduce due-diligence and increase risk.' },
    { pattern: /missing document|no document|documents? pending/, points: 14, issue: 'Incomplete document readiness', detail: 'Critical paperwork appears unavailable or delayed.' },
    { pattern: /court|legal notice|dispute/, points: 15, issue: 'Legal dispute indicators', detail: 'Text indicates possible active legal conflict over property.' }
  ];

  let detailSignalPoints = 0;
  const detailFlags = [];
  for (const signal of riskyPatterns) {
    if (signal.pattern.test(details)) {
      detailSignalPoints += signal.points;
      detailFlags.push({
        severity: severityFromPoints(signal.points),
        issue: signal.issue,
        detail: signal.detail,
        points: signal.points
      });
    }
  }
  detailSignalPoints = clamp(detailSignalPoints, 0, 18);

  const baseScore = 10;
  const rawScore =
    baseScore +
    ownerRiskPoints +
    transferRiskPoints +
    incomeMismatchPoints +
    encumbrancePoints +
    cityRiskPoints +
    propertyTypePoints +
    detailSignalPoints;

  let scaledScore = rawScore * 0.7 + 8;
  if (scaledScore > 88) {
    scaledScore = 88 + (scaledScore - 88) * 0.2;
  }
  const riskScore = clamp(Math.round(scaledScore), 0, 100);

  const riskLevel = riskLevelFromScore(riskScore);

  const redFlags = [];
  if (transferRiskPoints >= 12) {
    redFlags.push({
      severity: severityFromPoints(transferRiskPoints),
      issue: 'Frequent ownership transfers',
      detail: `${transfersLastTwoYears} transfer(s) in the last two years.`
    });
  }

  if (ownerRiskPoints >= 8) {
    redFlags.push({
      severity: severityFromPoints(ownerRiskPoints),
      issue: 'Long owner chain complexity',
      detail: `${previousOwners} historical owner entries may indicate title complexity.`
    });
  }

  if (incomeMismatchPoints > 0) {
    redFlags.push({
      severity: severityFromPoints(incomeMismatchPoints),
      issue: 'Seller income mismatch',
      detail: 'Seller income appears low compared with declared property value.'
    });
  }

  if (encumbrancePoints > 0) {
    redFlags.push({
      severity: severityFromPoints(encumbrancePoints),
      issue: 'Encumbrance concerns',
      detail: `Encumbrance status is marked as "${encumbranceStatus || 'unknown'}".`
    });
  }

  redFlags.push(...detailFlags.map(({ severity, issue, detail }) => ({ severity, issue, detail })));

  const positives = [];
  if (transfersLastTwoYears <= 1) positives.push('No unusual transfer velocity detected in recent years.');
  if (previousOwners <= 2) positives.push('Ownership history appears relatively simple.');
  if (incomeMismatchPoints === 0) positives.push('Seller income-to-value ratio is within acceptable band.');
  if (encumbrancePoints === 0) positives.push('No major encumbrance warning present in submitted status.');
  if (!detailFlags.length) positives.push('No legal-risk keywords found in additional details.');

  const recommendation =
    riskLevel === 'HIGH'
      ? 'High fraud risk detected. Pause transaction and perform legal title audit before payment.'
      : riskLevel === 'MEDIUM'
      ? 'Proceed with caution. Validate encumbrance certificate, chain deed and seller KYC.'
      : 'Low immediate fraud signal. Continue with standard legal verification workflow.';

  const immediateAction =
    riskLevel === 'HIGH'
      ? 'Engage a verified property lawyer and request certified title + court search report now.'
      : riskLevel === 'MEDIUM'
      ? 'Obtain updated EC, municipal records and bank NOC before token advance.'
      : 'Document all checks and proceed to registration planning with your legal advisor.';

  return {
    model: {
      name: 'PropSafe Local Risk Model',
      version: '1.0.0',
      type: 'weighted-logistic-heuristic'
    },
    riskLevel,
    riskScore,
    summary: `Computed fraud risk as ${riskLevel} (${riskScore}/100) from ownership, transfer velocity, encumbrance and text signals.`,
    redFlags,
    positives,
    recommendation,
    immediateAction
  };
}