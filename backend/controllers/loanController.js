import { successResponse, errorResponse } from '../utils/responses.js';

function calculateEmi(principal, annualRate, months) {
  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export async function matchLoanOffers(req, res) {
  try {
    const { propertyValue, buyerIncome, city } = req.body;

    if (propertyValue === undefined || buyerIncome === undefined || !city) {
      return errorResponse(res, 'propertyValue, buyerIncome and city are required', 400);
    }

    const value = Number(propertyValue);
    const income = Number(buyerIncome);

    if (Number.isNaN(value) || Number.isNaN(income) || value <= 0 || income <= 0) {
      return errorResponse(res, 'propertyValue and buyerIncome must be valid positive numbers', 400);
    }

    const cityMultiplier = ['mumbai', 'delhi', 'bangalore'].includes(String(city).toLowerCase()) ? 1 : 0.95;
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

    return successResponse(res, {
      city,
      propertyValue: value,
      buyerIncome: income,
      offers
    });
  } catch (error) {
    return errorResponse(res, 'Loan matching failed', 500, error.message);
  }
}
