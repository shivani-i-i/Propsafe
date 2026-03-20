import { successResponse, errorResponse } from '../utils/responses.js';

export function predictPrice(req, res) {
  try {
    const { locality, currentPrice, propertyType, askingPrice } = req.body;

    if (!locality || currentPrice === undefined || !propertyType || askingPrice === undefined) {
      return errorResponse(res, 'locality, currentPrice, propertyType and askingPrice are required', 400);
    }

    const current = Number(currentPrice);
    const asking = Number(askingPrice);

    if (Number.isNaN(current) || Number.isNaN(asking) || current <= 0 || asking <= 0) {
      return errorResponse(res, 'currentPrice and askingPrice must be valid positive numbers', 400);
    }

    const historicalData = [];
    for (let year = 2024; year >= 2015; year -= 1) {
      let price;

      if (year === 2024) {
        price = current;
      } else {
        const yearsBack = 2024 - year;
        price = current / Math.pow(1.07, yearsBack);

        if (year === 2020) {
          price *= 0.95;
        }
      }

      historicalData.push({ year, price: Math.round(price) });
    }

    historicalData.sort((a, b) => a.year - b.year);

    const prediction2025 = Math.round(current * 1.08);
    const prediction2026 = Math.round(current * 1.17);
    const predictions = [
      { year: 2025, price: prediction2025 },
      { year: 2026, price: prediction2026 }
    ];

    const appreciationPercent = Number((((prediction2026 - current) / current) * 100).toFixed(2));
    const overpricedBy = Number((asking - current).toFixed(2));
    const negotiationOpen = Number((current * 0.95).toFixed(2));
    const negotiationMax = Number((current * 1.02).toFixed(2));

    return successResponse(res, {
      historicalData,
      predictions,
      appreciationPercent,
      overpricedBy,
      negotiationOpen,
      negotiationMax
    });
  } catch (error) {
    return errorResponse(res, 'Failed to predict price', 500, error.message);
  }
}
