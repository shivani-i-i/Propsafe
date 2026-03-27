import { successResponse, errorResponse } from '../utils/responses.js';
import { calculateArea, saveToFile } from '../services/gpsSurveyService.js';

function normalizeCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) return [];

  return coordinates
    .map((point) => {
      const lat = Number(point?.lat);
      const lng = Number(point?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    })
    .filter(Boolean);
}

export async function submitGpsSurvey(req, res) {
  try {
    let { coordinates, calculatedArea, propertyId, registeredArea } = req.body || {};

    const normalizedCoordinates = normalizeCoordinates(coordinates);
    if (!normalizedCoordinates || normalizedCoordinates.length < 3) {
      return errorResponse(res, 'Invalid coordinates. At least 3 points are required.', 400);
    }

    const numericRegisteredArea = Number(registeredArea);
    if (!Number.isFinite(numericRegisteredArea) || numericRegisteredArea <= 0) {
      return errorResponse(res, 'registeredArea must be a positive number.', 400);
    }

    const normalizedPropertyId = String(propertyId || '').trim();
    if (!normalizedPropertyId) {
      return errorResponse(res, 'propertyId is required.', 400);
    }

    const serverCalculatedArea = Number(calculateArea(normalizedCoordinates));
    if (!Number.isFinite(serverCalculatedArea) || serverCalculatedArea <= 0) {
      return errorResponse(res, 'Calculated area is invalid.', 400);
    }

    calculatedArea = serverCalculatedArea;

    const discrepancyPercent = Math.abs((calculatedArea - numericRegisteredArea) / numericRegisteredArea * 100);
    const verified = discrepancyPercent <= 5;

    const certificateId = `GPS-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    await saveToFile({
      certificateId,
      propertyId: normalizedPropertyId,
      coordinates: normalizedCoordinates,
      calculatedArea: Number(calculatedArea.toFixed(2)),
      registeredArea: Number(numericRegisteredArea.toFixed(2)),
      discrepancyPercent: Number(discrepancyPercent.toFixed(2)),
      verified,
      submittedAt: new Date().toISOString()
    });

    return successResponse(res, {
      verified,
      calculatedArea: Number(calculatedArea.toFixed(2)),
      registeredArea: Number(numericRegisteredArea.toFixed(2)),
      discrepancyPercent: Number(discrepancyPercent.toFixed(2)),
      certificateId
    });
  } catch (error) {
    return errorResponse(res, 'GPS survey submission failed', 500, error.message);
  }
}
