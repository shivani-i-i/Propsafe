import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { successResponse, errorResponse } from '../utils/responses.js';
import { normalizeCoordinates, calculateAreaByShoelace, verifyAreaMatch } from '../services/gpsSurveyService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const surveysFilePath = join(__dirname, '..', 'data', 'gps-surveys.json');

async function readSurveyStore() {
  try {
    const text = await fs.readFile(surveysFilePath, 'utf-8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeSurveyStore(surveys) {
  await fs.mkdir(join(__dirname, '..', 'data'), { recursive: true });
  await fs.writeFile(surveysFilePath, JSON.stringify(surveys, null, 2), 'utf-8');
}

export async function submitGpsSurvey(req, res) {
  try {
    const {
      coordinates,
      calculatedArea,
      propertyId,
      registeredArea
    } = req.body || {};

    const normalizedCoordinates = normalizeCoordinates(coordinates);
    const numericRegisteredArea = Number(registeredArea);
    const numericClientArea = Number(calculatedArea);
    const normalizedPropertyId = String(propertyId || '').trim();

    if (normalizedCoordinates.length < 3) {
      return errorResponse(res, 'At least 3 coordinates are required', 400);
    }

    if (!Number.isFinite(numericRegisteredArea) || numericRegisteredArea <= 0) {
      return errorResponse(res, 'registeredArea must be a positive number', 400);
    }

    if (!normalizedPropertyId) {
      return errorResponse(res, 'propertyId is required', 400);
    }

    const serverCalculatedArea = calculateAreaByShoelace(normalizedCoordinates);
    const { verified, discrepancyPercent } = verifyAreaMatch(serverCalculatedArea, numericRegisteredArea, 5);

    const now = new Date();
    const certificateId = `GPS-${now.getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const surveyRecord = {
      certificateId,
      propertyId: normalizedPropertyId,
      coordinates: normalizedCoordinates,
      calculatedArea: Number(serverCalculatedArea.toFixed(2)),
      serverCalculatedArea: Number(serverCalculatedArea.toFixed(2)),
      clientCalculatedArea: Number.isFinite(numericClientArea) ? Number(numericClientArea.toFixed(2)) : null,
      registeredArea: Number(numericRegisteredArea.toFixed(2)),
      discrepancyPercent: Number(discrepancyPercent.toFixed(2)),
      verified,
      submittedAt: now.toISOString()
    };

    const existing = await readSurveyStore();
    existing.push(surveyRecord);
    await writeSurveyStore(existing);

    return successResponse(res, {
      verified: surveyRecord.verified,
      calculatedArea: surveyRecord.calculatedArea,
      registeredArea: surveyRecord.registeredArea,
      discrepancyPercent: surveyRecord.discrepancyPercent,
      certificateId: surveyRecord.certificateId
    });
  } catch (error) {
    return errorResponse(res, 'GPS survey submission failed', 500, error.message);
  }
}
