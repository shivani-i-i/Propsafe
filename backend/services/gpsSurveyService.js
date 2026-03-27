import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE_PATH = join(__dirname, '..', 'data', 'gps-surveys.json');

export function calculateArea(coords) {
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i].lat * coords[j].lng;
    area -= coords[j].lat * coords[i].lng;
  }
  return Math.abs(area / 2) * 111319.9 * 111319.9;
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
