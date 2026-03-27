import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE_PATH = join(__dirname, '..', 'data', 'gps-surveys.json');

export function calculateArea(coords) {
  // Shoelace formula: converts lat/lng to approximate square meters
  // 1 degree latitude ≈ 111 km; 1 degree longitude ≈ 111 km * cos(lat)
  if (coords.length < 3) return 0;
  
  let area = 0;
  const n = coords.length;
  const avgLat = coords.reduce((sum, p) => sum + p.lat, 0) / n;
  const latToMeters = 111000; // ~111 km per degree latitude
  const lngToMeters = 111000 * Math.cos((avgLat * Math.PI) / 180); // adjust for latitude
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = coords[i].lng * lngToMeters;
    const y1 = coords[i].lat * latToMeters;
    const x2 = coords[j].lng * lngToMeters;
    const y2 = coords[j].lat * latToMeters;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

export async function saveToFile(record) {
  await fs.mkdir(join(__dirname, '..', 'data'), { recursive: true });

  let records = [];
  try {
    const existing = await fs.readFile(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(existing);
    records = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  records.push(record);
  await fs.writeFile(STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

export async function getAllSurveys() {
  try {
    const existing = await fs.readFile(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(existing);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function getSurveyByCertificateId(certId) {
  try {
    const surveys = await getAllSurveys();
    return surveys.find(s => s.certificateId === certId) || null;
  } catch (error) {
    throw error;
  }
}
