import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LawyerBooking } from '../models/LawyerBooking.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { isDBConnected } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fallbackBookings = [];

export async function getLawyers(req, res) {
  try {
    const { city } = req.query;

    const lawyersPath = join(__dirname, '../data/lawyers.json');
    const data = await readFile(lawyersPath, 'utf-8');
    let lawyers = JSON.parse(data);

    if (city) {
      lawyers = lawyers.filter(l => l.city.toLowerCase() === city.toLowerCase());
    }

    return successResponse(res, lawyers);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch lawyers', 500, error.message);
  }
}

export async function bookLawyer(req, res) {
  try {
    const { lawyerId, userDetails } = req.body;

    if (!lawyerId || !userDetails?.name || !userDetails?.phone) {
      return errorResponse(res, 'lawyerId and userDetails (name, phone) are required', 400);
    }

    const bookingPayload = {
      lawyerId: Number(lawyerId),
      userDetails: {
        name: String(userDetails.name),
        phone: String(userDetails.phone),
        email: userDetails.email ? String(userDetails.email) : ''
      },
      bookingTime: new Date()
    };

    let booking;
    let persisted = false;

    if (isDBConnected()) {
      booking = await LawyerBooking.create(bookingPayload);
      persisted = true;
    } else {
      booking = {
        _id: `local-${Date.now()}`,
        ...bookingPayload
      };
      fallbackBookings.push(booking);
    }

    return successResponse(
      res,
      {
        message: 'Lawyer booking created successfully',
        persisted,
        booking
      },
      201
    );
  } catch (error) {
    return errorResponse(res, 'Failed to create lawyer booking', 500, error.message);
  }
}
