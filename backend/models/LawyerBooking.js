import mongoose from 'mongoose';

const lawyerBookingSchema = new mongoose.Schema(
  {
    lawyerId: { type: Number, required: true },
    userDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, default: '' }
    },
    paymentDetails: {
      method: { type: String, default: 'UPI' },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      status: { type: String, default: 'INITIATED' },
      transactionRef: { type: String, default: '' }
    },
    bookingTime: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export const LawyerBooking = mongoose.model('LawyerBooking', lawyerBookingSchema);
