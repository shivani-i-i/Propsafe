import { successResponse, errorResponse } from '../utils/responses.js';
import { isDBConnected } from '../config/db.js';
import { PropertyScan } from '../models/PropertyScan.js';
import { LawyerBooking } from '../models/LawyerBooking.js';

export async function getDashboardStats(_req, res) {
  try {
    if (isDBConnected()) {
      const totalScans = await PropertyScan.countDocuments();
      const fraudCasesDetected = await PropertyScan.countDocuments({ riskScore: { $gte: 70 } });
      const lawyersConnected = await LawyerBooking.countDocuments();

      return successResponse(res, {
        totalScans,
        fraudCasesDetected,
        lawyersConnected,
        source: 'database'
      });
    }

    return successResponse(res, {
      totalScans: 3247,
      fraudCasesDetected: 418,
      lawyersConnected: 962,
      source: 'fallback'
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch dashboard stats', 500, error.message);
  }
}
