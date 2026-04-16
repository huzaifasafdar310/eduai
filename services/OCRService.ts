import { apiClient } from './apiClient';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * 🔍 OCRService: High-Performance Optical Character Recognition
 * Communicates with the authoritative backend and optimizes payloads.
 */
class OCRService {
  /**
   * 🛠️ Compresses and resizes an image before extraction.
   * Targets a max dimension of 1200px and 70% quality for optimal balance.
   */
  public async processAndExtract(uri: string): Promise<{ text: string; remainingCredits: number }> {
    try {
      console.log('[OCR Service] Pre-processing image (Resizing to 1200px max, 70% quality)...');
      
      const processed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!processed.base64) {
        throw new Error('Image manipulation failed to generate base64 data.');
      }

      console.log(`[OCR Service] Processed payload size (Approx): ${(processed.base64.length / 1024).toFixed(2)} KB`);
      
      return this.extractTextFromImage(processed.base64);
    } catch (error: any) {
      console.error('[OCR Service] Image preparation failed:', error.message);
      throw error;
    }
  }

  /**
   * Primary extraction logic via authoritative backend gateway.
   * @returns { text, remainingCredits }
   */
  public async extractTextFromImage(base64Data: string, mimeType: string = 'image/jpeg'): Promise<{ text: string; remainingCredits: number }> {
    try {
      const response = await apiClient.post('/api/ocr/extract', {
        base64Data,
        mimeType,
      });
      
      const text = response.data?.text || 'No text recovered from OCR engine.';
      const remainingCredits = response.data?.remainingCredits;
      
      return { text, remainingCredits };
    } catch (error: any) {
      // Propagation of 402/429/500 errors from backend
      throw error;
    }
  }
}

export const ocrService = new OCRService();
