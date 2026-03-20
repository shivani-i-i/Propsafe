import axios from 'axios';
import { PropertyScan } from '../models/PropertyScan.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { isDBConnected } from '../config/db.js';

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

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
      return errorResponse(res, 'ANTHROPIC_API_KEY is not configured', 500);
    }

    const prompt = `You are a property fraud detection AI. Analyze this property transaction for fraud risk:

Property Type: ${propertyType}
City: ${city}
Seller Name: ${sellerName}
Previous Owners: ${previousOwners}
Transfers in Last Two Years: ${transfersLastTwoYears}
Property Value: ₹${propertyValue}
Seller Income: ₹${sellerIncome}
Encumbrance Status: ${encumbranceStatus}
Additional Details: ${additionalDetails}

Return ONLY valid JSON with this exact schema:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "riskScore": 0,
  "summary": "short summary",
  "redFlags": [
    {
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "issue": "short title",
      "detail": "explanation"
    }
  ],
  "positives": ["point 1", "point 2"],
  "recommendation": "clear recommendation",
  "immediateAction": "what to do next"
}`;

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    const aiText = response?.data?.content?.[0]?.text || '{}';
    const cleaned = aiText.replace(/```json|```/gi, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

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
