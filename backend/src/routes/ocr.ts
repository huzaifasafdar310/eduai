import { Router, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const OCR_API_URL = 'https://api.ocr.space/parse/image';

/**
 * Proxy for OCR.space
 * Body: { base64Data, mimeType }
 */
router.post('/extract', async (req: Request, res: Response) => {
  const { base64Data, mimeType } = req.body;
  const ocrKey = process.env.OCR_API_KEY;

  if (!base64Data) {
    return res.status(400).json({ error: 'Missing required parameter: base64Data' });
  }

  if (!ocrKey) {
    console.error('[OCR Route] ERROR: OCR_API_KEY is not set in environment variables.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // format based on OCR.space requirements
  const prefixedBase64 = `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;

  const formData = new URLSearchParams();
  formData.append('base64Image', prefixedBase64);
  formData.append('apikey', ocrKey);
  formData.append('language', 'eng');
  formData.append('OCREngine', '2'); // Fast Engine

  try {
    const response = await axios.post(OCR_API_URL, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    
    const data = response.data;
    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage ? data.ErrorMessage.join(', ') : 'Unknown OCR Engine error');
    }

    const parts = data.ParsedResults?.map((r: any) => r.ParsedText) || [];
    const text = parts.join('\n').trim();

    if (!text) {
      return res.json({ text: 'No text recovered from OCR engine.' });
    }

    res.json({ text });
  } catch (error: any) {
    console.error('[OCR Route] Final failure:', error.response?.data || error.message);
    res.status(500).json({
      error: error.message || 'OCR Processing failed via proxy',
    });
  }
});

export default router;
