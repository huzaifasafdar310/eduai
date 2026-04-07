import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import { imageToHTML } from '../converters/imageToPDF';
import { docxToHTML } from '../converters/docxToPDF';
import { textToHTML } from '../converters/textToPDF';
import { urlOrHtmlToHTML } from '../converters/htmlToPDF';

export type ConversionSource = 
  | { type: 'document', uri: string, name: string, mimeType?: string }
  | { type: 'image', uri: string }
  | { type: 'url', value: string };

export const usePDFConverter = () => {
  const [isConverting, setIsConverting] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convertToPDF = async (source: ConversionSource) => {
    setIsConverting(true);
    setError(null);
    setPdfUri(null);

    try {
      let html = '';

      if (source.type === 'document') {
        const { uri, mimeType } = source;
        if (uri.endsWith('.docx') || mimeType?.includes('officedocument.wordprocessingml.document')) {
          html = await docxToHTML(uri);
        } else if (uri.endsWith('.txt') || mimeType === 'text/plain') {
          html = await textToHTML(uri);
        } else if (mimeType?.includes('image/')) {
          html = await imageToHTML(uri);
        } else {
          throw new Error('Unsupported document format');
        }
      } else if (source.type === 'image') {
        html = await imageToHTML(source.uri);
      } else if (source.type === 'url') {
        html = await urlOrHtmlToHTML(source.value);
      }

      const { uri } = await Print.printToFileAsync({ html });
      setPdfUri(uri);
    } catch (err: any) {
      setError(err.message || 'Conversion failed');
      console.error('Conversion process error:', err);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadPDF = async (uri: string, originalFileName?: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Storage permissions required');
      }

      // Download can mean sharing or saving locally
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
      }

      const newFileName = originalFileName 
        ? originalFileName.replace(/\.[^/.]+$/, "") + ".pdf" 
        : `EduAI_Export_${Date.now()}.pdf`;
      const localUri = FileSystem.cacheDirectory + newFileName;
      
      await FileSystem.copyAsync({
        from: uri,
        to: localUri
      });

      await Sharing.shareAsync(localUri);
      
      const asset = await MediaLibrary.createAssetAsync(localUri);
      await MediaLibrary.createAlbumAsync('EduAI PDFs', asset, false);
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Download failed');
      return false;
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/*'
        ],
      });

      if (!result.canceled) {
        const file = result.assets[0];
        return { 
          type: 'document' as const, 
          uri: file.uri, 
          name: file.name, 
          mimeType: file.mimeType 
        };
      }
    } catch (err) {
      console.error('Document Picker Error:', err);
    }
    return null;
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        return { 
          type: 'image' as const, 
          uri: result.assets[0].uri 
        };
      }
    } catch (err) {
      console.error('Image Picker Error:', err);
    }
    return null;
  };

  return {
    pickDocument,
    pickImage,
    convertToPDF,
    downloadPDF,
    isConverting,
    pdfUri,
    error,
  };
};
