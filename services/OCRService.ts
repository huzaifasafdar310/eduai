import { apiClient } from './apiClient';

/**
 * Service for OCR related tasks.
 * Abstracts the OCR.Space logic completely from the ui.
 */
class OCRService {
  /**
   * Primary extraction logic via proxy.
   * @param base64Data Raw image Base64 data block without the prefix descriptor.
   * @param mimeType Image filetype.
   */
  public async extractTextFromImage(base64Data: string, mimeType: string = 'image/jpeg'): Promise<string> {
    try {
      const response = await apiClient.post('/api/ocr/extract', {
        base64Data,
        mimeType,
      });
      
      const text = response.data?.text;
      
      if (!text) {
         return 'No text recovered from OCR engine.';
      }
      return text;
    } catch (error: any) {
      throw new Error(`OCR Processing failed via proxy: ${error.message}`);
    }
  }
}

export const ocrService = new OCRService();
