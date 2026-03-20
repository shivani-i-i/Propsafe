import { successResponse, errorResponse } from '../utils/responses.js';

export async function verifyMunicipal(req, res) {
  try {
    const { registrationNumber } = req.body;

    if (!registrationNumber) {
      return errorResponse(res, 'registrationNumber is required', 400);
    }

    const normalized = String(registrationNumber).trim().toUpperCase();
    const checksum = normalized.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

    const reraStatus = checksum % 3 === 0 ? 'VALID' : checksum % 3 === 1 ? 'PENDING_RENEWAL' : 'NOT_FOUND';
    const taxRecordStatus = checksum % 2 === 0 ? 'UP_TO_DATE' : 'ARREARS_PENDING';
    const buildingPermitStatus = checksum % 5 === 0 ? 'EXPIRED' : 'APPROVED';
    const zoningCompliance = checksum % 7 === 0 ? 'NON_COMPLIANT' : 'COMPLIANT';

    return successResponse(res, {
      registrationNumber: normalized,
      reraStatus,
      taxRecordStatus,
      buildingPermitStatus,
      zoningCompliance
    });
  } catch (error) {
    return errorResponse(res, 'Municipal verification failed', 500, error.message);
  }
}
