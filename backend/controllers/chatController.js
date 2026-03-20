import axios from 'axios';
import { successResponse, errorResponse } from '../utils/responses.js';

export async function sendMessage(req, res) {
  try {
    const { message } = req.body;

    if (!message) {
      return errorResponse(res, 'Message is required', 400);
    }

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
      return errorResponse(res, 'ANTHROPIC_API_KEY is not configured', 500);
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
        }
      }
    );

    const reply = response?.data?.content?.[0]?.text || '';
    return successResponse(res, { response: reply });
  } catch (error) {
    const detail = error?.response?.data || error.message;
    return errorResponse(res, 'Failed to process chat message', 500, detail);
  }
}
