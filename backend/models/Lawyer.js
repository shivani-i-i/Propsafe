import mongoose from 'mongoose';

const LawyerSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    specialization: { type: String, required: true, trim: true },
    experience: { type: Number, min: 0, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 4.5 },
    fee: { type: Number, min: 0, default: 800 },
    phone: { type: String, trim: true, default: '' },
    barCouncilId: { type: String, required: true, trim: true, unique: true },
    verified: { type: Boolean, default: true },
    source: { type: String, trim: true, default: 'seed' },
    profileUrl: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true
  }
);

export const Lawyer = mongoose.models.Lawyer || mongoose.model('Lawyer', LawyerSchema);
