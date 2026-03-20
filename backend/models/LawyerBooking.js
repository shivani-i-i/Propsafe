import mongoose from 'mongoose';

const lawyerBookingSchema = new mongoose.Schema(
  {
    lawyerId: { type: Number, required: true },
    userDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, default: '' }
    },
    bookingTime: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export const LawyerBooking = mongoose.model('LawyerBooking', lawyerBookingSchema);
