import crypto from 'crypto';
import { predictFraudRisk } from '../services/fraudRiskModel.js';
import { successResponse, errorResponse } from '../utils/responses.js';

const agentSessions = new Map();

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

export async function runPropertyAgent(req, res) {
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
    } = req.body;

    if (!propertyType || !city || !sellerName || propertyValue === undefined || sellerIncome === undefined) {
      return errorResponse(
        res,
        'propertyType, city, sellerName, propertyValue and sellerIncome are required',
        400
      );
    }

    const activeSessionId = sessionId || crypto.randomUUID();
    const previousRun = agentSessions.get(activeSessionId);

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

    agentSessions.set(activeSessionId, {
      memory,
      previousVerdict: previousRun?.memory?.lastVerdict || null
    });

    return successResponse(res, {
      sessionId: activeSessionId,
      previousVerdict: previousRun?.memory?.lastVerdict || null,
      plan,
      trace,
      outputs: {
        fraud,
        municipal,
        loan
      },
      finalDecision,
      memory
    });
  } catch (error) {
    return errorResponse(res, 'Agent evaluation failed', 500, error.message);
  }
}