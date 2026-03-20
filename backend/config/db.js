import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);

export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn('[DB] MONGODB_URI not set. MongoDB features will be disabled.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('[DB] Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('[DB] MongoDB connection failed:', error.message);
    return false;
  }
}
