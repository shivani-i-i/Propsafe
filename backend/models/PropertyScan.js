import mongoose from 'mongoose';

const propertyScanSchema = new mongoose.Schema(
  {
    riskScore: { type: Number, required: true },
    flags: { type: Array, default: [] },
    documentText: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export const PropertyScan = mongoose.model('PropertyScan', propertyScanSchema);
