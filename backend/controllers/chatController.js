import axios from 'axios';
import { successResponse, errorResponse } from '../utils/responses.js';

function fallbackReply(message = '') {
  const text = String(message).toLowerCase();

  if (text.includes('rera')) {
    return 'RERA helps you verify if a project is legally registered. Ask the builder for the RERA number, verify it on the state RERA portal, and confirm approvals, completion timeline, and complaint history before paying.';
  }

  if (text.includes('encumbrance') || text.includes('ec')) {
    return 'Get an Encumbrance Certificate for at least 15 years from the Sub-Registrar portal/office. Match owner names, survey number, and check for loans, liens, or court attachments before purchase.';
  }

  if (text.includes('title') || text.includes('ownership')) {
    return 'Verify title chain for 30 years, confirm seller identity, and compare all names/measurements with registered records. A local property lawyer should validate the title deed before token payment.';
  }

  return 'Start with RERA verification, Encumbrance Certificate check, and title chain validation. If you share city and document type, I can give a focused checklist for your case.';
}

export async function sendMessage(req, res) {
  try {
    const { message } = req.body;

    if (!message) {
      return errorResponse(res, 'Message is required', 400);
    }

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
      return successResponse(res, {
        response: fallbackReply(message),
        source: 'fallback'
      });
    }

    const systemPrompt = 'You are an Indian property law expert assistant for PropSafe. Give practical, accurate India-specific legal guidance and keep answers under 150 words.';

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 15000
      }
    );

    const reply = response?.data?.content?.[0]?.text || '';
    return successResponse(res, { response: reply });
  } catch (_error) {
    return successResponse(res, {
      response: fallbackReply(req?.body?.message),
      source: 'fallback'
    });
  }
}
