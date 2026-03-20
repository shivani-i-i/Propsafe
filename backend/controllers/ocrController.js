import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { successResponse, errorResponse } from '../utils/responses.js';

function extractFirstMatch(text, patterns) {
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function parseFields(rawText) {
  const normalized = rawText.replace(/\r/g, '');

  const buyerName = extractFirstMatch(normalized, [
    /buyer\s*name\s*[:\-]\s*([^\n]+)/i,
    /purchaser\s*[:\-]\s*([^\n]+)/i
  ]);

  const sellerName = extractFirstMatch(normalized, [
    /seller\s*name\s*[:\-]\s*([^\n]+)/i,
    /vendor\s*[:\-]\s*([^\n]+)/i
  ]);

  const transactionDate = extractFirstMatch(normalized, [
    /transaction\s*date\s*[:\-]\s*([^\n]+)/i,
    /date\s*of\s*sale\s*[:\-]\s*([^\n]+)/i,
    /date\s*[:\-]\s*([0-3]?\d[\/\-.][0-1]?\d[\/\-.]\d{2,4})/i
  ]);

  const propertyValue = extractFirstMatch(normalized, [
    /property\s*value\s*[:\-]?\s*(₹?[\d,]+(?:\.\d+)?)/i,
    /sale\s*consideration\s*[:\-]?\s*(₹?[\d,]+(?:\.\d+)?)/i,
    /value\s*[:\-]?\s*(₹?[\d,]+(?:\.\d+)?)/i
  ]);

  return {
    buyerName,
    sellerName,
    transactionDate,
    propertyValue
  };
}

export async function extractDocumentText(req, res) {
  try {
    if (!req.file) {
      return errorResponse(res, 'Document file is required', 400);
    }

    const { mimetype, buffer, originalname } = req.file;
    if (!mimetype.startsWith('image/') && mimetype !== 'application/pdf') {
      return errorResponse(res, 'Only image or PDF files are supported', 400);
    }

    let extractedText = '';

    if (mimetype === 'application/pdf') {
      const parsedPdf = await pdfParse(buffer);
      extractedText = (parsedPdf?.text || '').trim();

      if (!extractedText) {
        return errorResponse(
          res,
          'No extractable text found in PDF. Please upload a clear image or a searchable PDF.',
          422
        );
      }
    } else {
      const { data } = await Tesseract.recognize(buffer, 'eng');
      extractedText = (data?.text || '').trim();
    }

    const fields = parseFields(extractedText);

    return successResponse(res, {
      fileName: originalname,
      extractedText,
      extractedFields: fields
    });
  } catch (error) {
    return errorResponse(res, 'Failed to process OCR extraction', 500, error.message);
  }
}
