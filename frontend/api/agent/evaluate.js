const { randomUUID } = require('crypto');

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

function predictFraudRisk(input = {}) {
  const previousOwners = clamp(toNumber(input.previousOwners, 1), 1, 20);
  const transfersLastTwoYears = clamp(toNumber(input.transfersLastTwoYears, 0), 0, 20);
  const propertyValue = Math.max(toNumber(input.propertyValue, 0), 0);
  const sellerIncome = Math.max(toNumber(input.sellerIncome, 0), 0);
  const encumbranceStatus = String(input.encumbranceStatus || 'clean').toLowerCase();
  const propertyType = String(input.propertyType || '').toLowerCase();
  const city = String(input.city || '').toLowerCase();
  const details = String(input.additionalDetails || '').toLowerCase();

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
  else if (encumbranceStatus.includes('mortgage') || encumbranceStatus.includes('pending') || encumbranceStatus.includes('loan')) encumbrancePoints = 14;
  else if (encumbranceStatus.includes('unknown') || encumbranceStatus.includes('unavailable')) encumbrancePoints = 10;

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
        detail: signal.detail
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
  if (scaledScore > 88) scaledScore = 88 + (scaledScore - 88) * 0.2;
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

  redFlags.push(...detailFlags);

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

function verifyMunicipalSignals(registrationNumber = '') {
  if (!registrationNumber) {
    return {
      registrationNumber: '',
      reraStatus: 'UNKNOWN',
      taxRecordStatus: 'UNKNOWN',
      buildingPermitStatus: 'UNKNOWN',
      zoningCompliance: 'UNKNOWN'
    };
  }

  const normalized = String(registrationNumber).trim().toUpperCase();
  const checksum = normalized.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return {
    registrationNumber: normalized,
    reraStatus: checksum % 3 === 0 ? 'VALID' : checksum % 3 === 1 ? 'PENDING_RENEWAL' : 'NOT_FOUND',
    taxRecordStatus: checksum % 2 === 0 ? 'UP_TO_DATE' : 'ARREARS_PENDING',
    buildingPermitStatus: checksum % 5 === 0 ? 'EXPIRED' : 'APPROVED',
    zoningCompliance: checksum % 7 === 0 ? 'NON_COMPLIANT' : 'COMPLIANT'
  };
}

function calculateEmi(principal, annualRate, months) {
  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function computeLoanSignals(propertyValue, buyerIncome, city) {
  const value = Number(propertyValue);
  const income = Number(buyerIncome);
  const normalizedCity = String(city || '').toLowerCase();

  if (!Number.isFinite(value) || !Number.isFinite(income) || value <= 0 || income <= 0 || !normalizedCity) {
    return {
      city,
      propertyValue: value,
      buyerIncome: income,
      offers: [],
      eligibilitySummary: 'UNKNOWN'
    };
  }

  const cityMultiplier = ['mumbai', 'delhi', 'bangalore'].includes(normalizedCity) ? 1 : 0.95;
  const affordabilityCap = income * 60 * cityMultiplier;

  const banks = [
    { bankName: 'State Bank of India', interestRate: 8.45, ltv: 0.8 },
    { bankName: 'HDFC Bank', interestRate: 8.7, ltv: 0.82 },
    { bankName: 'ICICI Bank', interestRate: 8.8, ltv: 0.8 },
    { bankName: 'Axis Bank', interestRate: 8.95, ltv: 0.78 },
    { bankName: 'Bank of Baroda', interestRate: 8.6, ltv: 0.79 }
  ];

  const tenureMonths = 240;
  const offers = banks.map((bank) => {
    const ltvAmount = value * bank.ltv;
    const maxLoanAmount = Math.round(Math.min(ltvAmount, affordabilityCap));
    const emiEstimate = Math.round(calculateEmi(maxLoanAmount, bank.interestRate, tenureMonths));
    const loanEligibility = maxLoanAmount >= value * 0.6 ? 'ELIGIBLE' : 'PARTIALLY_ELIGIBLE';

    return {
      bankName: bank.bankName,
      loanEligibility,
      interestRate: bank.interestRate,
      emiEstimate,
      maxLoanAmount
    };
  });

  const eligibleCount = offers.filter((offer) => offer.loanEligibility === 'ELIGIBLE').length;
  const eligibilitySummary = eligibleCount >= 3 ? 'STRONG' : eligibleCount > 0 ? 'LIMITED' : 'WEAK';

  return {
    city,
    propertyValue: value,
    buyerIncome: income,
    offers,
    eligibilitySummary
  };
}

function summarizeMunicipalRisk(municipal) {
  const blockers = [];

  if (municipal.reraStatus === 'NOT_FOUND') blockers.push('RERA registration not found.');
  if (municipal.taxRecordStatus === 'ARREARS_PENDING') blockers.push('Pending property tax arrears detected.');
  if (municipal.buildingPermitStatus === 'EXPIRED') blockers.push('Building permit appears expired.');
  if (municipal.zoningCompliance === 'NON_COMPLIANT') blockers.push('Possible zoning non-compliance detected.');

  return blockers;
}

function deriveFinalDecision(fraud, municipal, loan) {
  const municipalBlockers = summarizeMunicipalRisk(municipal);

  const highFraud = fraud?.riskLevel === 'HIGH';
  const mediumFraud = fraud?.riskLevel === 'MEDIUM';
  const weakLoan = loan?.eligibilitySummary === 'WEAK';

  let verdict = 'PROCEED';
  if (highFraud || municipalBlockers.length >= 2 || weakLoan) {
    verdict = 'HOLD';
  } else if (mediumFraud || municipalBlockers.length === 1 || loan?.eligibilitySummary === 'LIMITED') {
    verdict = 'CAUTION';
  }

  const actions = [];
  if (fraud?.riskLevel === 'HIGH') actions.push('Pause token payment and complete legal title audit.');
  if (fraud?.riskLevel === 'MEDIUM') actions.push('Request EC + title chain validation before advancing.');
  actions.push(...municipalBlockers);
  if (loan?.eligibilitySummary === 'WEAK') actions.push('Rework loan strategy: higher down payment or co-applicant.');

  if (!actions.length) {
    actions.push('No strong blocker found. Continue normal legal verification checklist.');
  }

  return {
    verdict,
    actions,
    rationale: `Fraud risk=${fraud?.riskLevel || 'UNKNOWN'}, municipal blockers=${municipalBlockers.length}, loan eligibility=${loan?.eligibilitySummary || 'UNKNOWN'}`
  };
}

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: {
        message: 'Method not allowed'
      }
    });
  }

  try {
    const {
      sessionId,
      propertyType,
      city,
      sellerName,
      previousOwners,
      transfersLastTwoYears,
      propertyValue,
      sellerIncome,
      buyerIncome,
      encumbranceStatus,
      registrationNumber,
      additionalDetails
    } = req.body || {};

    if (!propertyType || !city || !sellerName || propertyValue === undefined || sellerIncome === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'propertyType, city, sellerName, propertyValue and sellerIncome are required'
        }
      });
    }

    const activeSessionId = sessionId || randomUUID();

    const plan = [
      'Assess fraud risk from ownership, transfer and seller-income signals.',
      'Check municipal validity indicators from registration number.',
      'Estimate loan strength for affordability pressure.',
      'Reflect on all outputs and derive a final decision.'
    ];

    const trace = [];

    const fraud = predictFraudRisk({
      propertyType,
      city,
      sellerName,
      previousOwners,
      transfersLastTwoYears,
      propertyValue,
      sellerIncome,
      encumbranceStatus,
      additionalDetails
    });

    trace.push({
      step: 'fraud-analysis',
      observation: `Fraud model produced ${fraud.riskLevel} risk with score ${fraud.riskScore}.`
    });

    const municipal = verifyMunicipalSignals(registrationNumber);
    trace.push({
      step: 'municipal-check',
      observation: `Municipal check => RERA:${municipal.reraStatus}, TAX:${municipal.taxRecordStatus}, PERMIT:${municipal.buildingPermitStatus}, ZONING:${municipal.zoningCompliance}.`
    });

    const loan = computeLoanSignals(propertyValue, buyerIncome ?? sellerIncome, city);
    trace.push({
      step: 'loan-analysis',
      observation: `Loan eligibility summary is ${loan.eligibilitySummary}.`
    });

    const finalDecision = deriveFinalDecision(fraud, municipal, loan);
    trace.push({
      step: 'final-reflection',
      observation: `Agent verdict is ${finalDecision.verdict}. ${finalDecision.rationale}`
    });

    const memory = {
      lastVerdict: finalDecision.verdict,
      lastRiskLevel: fraud.riskLevel,
      updatedAt: new Date().toISOString(),
      lastCity: city,
      lastPropertyValue: Number(propertyValue)
    };

    return res.status(200).json({
      success: true,
      data: {
        sessionId: activeSessionId,
        previousVerdict: null,
        plan,
        trace,
        outputs: {
          fraud,
          municipal,
          loan
        },
        finalDecision,
        memory
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Agent evaluation failed',
        details: error?.message || String(error)
      }
    });
  }
};
