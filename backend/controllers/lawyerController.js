import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LawyerBooking } from '../models/LawyerBooking.js';
import { Lawyer } from '../models/Lawyer.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { isDBConnected } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fallbackBookings = [];

async function readLawyerFileData() {
  const lawyersPath = join(__dirname, '../data/lawyers.json');
  const data = await readFile(lawyersPath, 'utf-8');
  return JSON.parse(data);
}

function applyLawyerFilters(lawyers = [], query = {}) {
  const city = String(query.city || '').trim().toLowerCase();
  const specialization = String(query.specialization || '').trim().toLowerCase();
  const minRating = Number(query.minRating || 0);
  const verifiedOnly = String(query.verifiedOnly || '').toLowerCase() === 'true';

  const specializationNeedles = specialization
    ? (() => {
        const needles = [specialization];
        if (specialization.includes('title deed')) needles.push('title verification', 'title');
        if (specialization.includes('title verification')) needles.push('title deed', 'title');
        if (specialization.includes('benami')) needles.push('fraud', 'due diligence');
        if (specialization.includes('rera')) needles.push('builder');
        if (specialization.includes('land survey')) needles.push('land', 'patta');
        if (specialization.includes('civil')) needles.push('litigation', 'dispute');
        return needles;
      })()
    : [];

  return lawyers.filter((lawyer) => {
    const cityMatch = !city || String(lawyer.city || '').toLowerCase() === city;

    const specializationText = `${lawyer.specialization || ''} ${(lawyer.tags || []).join(' ')}`.toLowerCase();
    const specializationMatch =
      !specialization || specializationNeedles.some((needle) => specializationText.includes(needle));

    const rating = Number(lawyer.rating || 0);
    const ratingMatch = !Number.isFinite(minRating) || minRating <= 0 || rating >= minRating;

    const verifiedMatch = !verifiedOnly || Boolean(lawyer.verified);

    return cityMatch && specializationMatch && ratingMatch && verifiedMatch;
  });
}

function normalizeLawyerRecord(lawyer = {}) {
  const normalizedId = lawyer.id ?? lawyer._id;
  return {
    id: normalizedId,
    name: lawyer.name,
    city: lawyer.city,
    specialization: lawyer.specialization,
    experience: Number(lawyer.experience || 0),
    rating: Number(lawyer.rating || 0),
    fee: Number(lawyer.fee || 0),
    phone: lawyer.phone || '',
    barCouncilId: lawyer.barCouncilId || '',
    verified: Boolean(lawyer.verified),
    source: lawyer.source || 'directory',
    profileUrl: lawyer.profileUrl || ''
  };
}

export async function getLawyers(req, res) {
  try {
    let lawyers = [];

    if (isDBConnected()) {
      lawyers = await Lawyer.find({ isActive: true }).lean();
    }

    if (!lawyers.length) {
      lawyers = await readLawyerFileData();
    }

    const filteredLawyers = applyLawyerFilters(lawyers, req.query).map(normalizeLawyerRecord);

    return successResponse(res, filteredLawyers);
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
