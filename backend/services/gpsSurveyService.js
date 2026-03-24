export function normalizeCoordinates(rawCoordinates = []) {
  if (!Array.isArray(rawCoordinates)) return [];

  return rawCoordinates
    .map((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) return null;
      const lat = Number(pair[0]);
      const lng = Number(pair[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng];
    })
    .filter(Boolean);
}

function toMetersPoints(coords) {
  if (!Array.isArray(coords) || coords.length < 3) return [];

  const lat0 = coords.reduce((sum, [lat]) => sum + lat, 0) / coords.length;
  const lng0 = coords.reduce((sum, [, lng]) => sum + lng, 0) / coords.length;

  const latScale = 111320;
  const lngScale = 111320 * Math.cos((lat0 * Math.PI) / 180);

  return coords.map(([lat, lng]) => [
    (lng - lng0) * lngScale,
    (lat - lat0) * latScale
  ]);
}

export function calculateAreaByShoelace(coords = []) {
  const points = toMetersPoints(coords);
  if (points.length < 3) return 0;

  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    doubledArea += x1 * y2 - x2 * y1;
  }

  return Math.abs(doubledArea / 2);
}

export function computeDiscrepancyPercent(baseArea, comparedArea) {
  const base = Number(baseArea);
  const compared = Number(comparedArea);

  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(compared)) return 100;
  return Math.abs(((compared - base) / base) * 100);
}

export function verifyAreaMatch(calculatedArea, registeredArea, thresholdPercent = 5) {
  const discrepancyPercent = computeDiscrepancyPercent(registeredArea, calculatedArea);
  return {
    discrepancyPercent,
    verified: discrepancyPercent <= thresholdPercent
  };
}
