import { PropertyScan } from '../models/PropertyScan.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { isDBConnected } from '../config/db.js';
import { predictFraudRisk } from '../services/fraudRiskModel.js';

export async function analyzeFraud(req, res) {
  try {
    const {
      propertyType,
      city,
      sellerName,
      previousOwners,
      transfersLastTwoYears,
      propertyValue,
      sellerIncome,
      encumbranceStatus,
      additionalDetails
    } = req.body;

    const parsed = predictFraudRisk({
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

    let persisted = false;
    if (isDBConnected()) {
      await PropertyScan.create({
        riskScore: Number(parsed.riskScore) || 0,
        flags: parsed.redFlags || [],
        documentText: `Property Type: ${propertyType}\nCity: ${city}\nSeller Name: ${sellerName}\nAdditional Details: ${additionalDetails || ''}`,
        timestamp: new Date()
      });
      persisted = true;
    }

    return successResponse(res, {
      ...parsed,
      persisted
    });
  } catch (error) {
    const detail = error?.response?.data || error.message;
    return errorResponse(res, 'Failed to analyze fraud risk', 500, detail);
  }
}
