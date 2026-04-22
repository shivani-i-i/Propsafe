import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { connectDB } from '../config/db.js';
import { Lawyer } from '../models/Lawyer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '..', '.env'), override: false });

async function run() {
  const connected = await connectDB();
  if (!connected) {
    throw new Error('MongoDB is required for lawyer seeding. Set MONGODB_URI and try again.');
  }

  const lawyersPath = join(__dirname, '../data/lawyers.json');
  const raw = await readFile(lawyersPath, 'utf-8');
  const lawyers = JSON.parse(raw);

  let upserts = 0;
  for (const item of lawyers) {
    if (!item?.barCouncilId) continue;

    await Lawyer.findOneAndUpdate(
      { barCouncilId: item.barCouncilId },
      {
        $set: {
          id: Number(item.id || 0) || undefined,
          name: String(item.name || '').trim(),
          city: String(item.city || '').trim(),
          specialization: String(item.specialization || '').trim(),
          experience: Number(item.experience || 0),
          rating: Number(item.rating || 0),
          fee: Number(item.fee || 0),
          phone: String(item.phone || '').trim(),
          verified: Boolean(item.verified),
          source: 'seed-file',
          isActive: true
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserts += 1;
  }

  console.log(`[seed:lawyers] Upserted ${upserts} lawyers from backend/data/lawyers.json`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[seed:lawyers] Failed:', error.message);
    process.exit(1);
  });
