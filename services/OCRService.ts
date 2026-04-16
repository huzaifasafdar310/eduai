import { apiClient } from './apiClient';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * 🔍 OCRService: High-Performance Optical Character Recognition
 * Handles image optimization (resizing/compression) to minimize payload size and improve speed.
 */
class OCRService {
  /**
   * 🛠️ Compresses and resizes an image before extraction.
   * Targets a max dimension of 1200px and 70% quality for optimal balance.
   * @param uri Local file URI from camera/picker.
   */
  public async processAndExtract(uri: string): Promise<string> {
    try {
      console.log('[OCR Service] Pre-processing image (Resizing to 1200px max, 70% quality)...');
      
      const processed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }], // ImageManipulator preserves aspect ratio by default
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
   * Primary extraction logic via proxy.
   * @param base64Data Image Base64 data block (without prefix).
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
