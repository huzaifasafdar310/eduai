import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePDFConverter, ConversionSource } from './hooks/usePDFConverter';
import { DocumentPickerZone } from './components/DocumentPickerZone';
import { ConversionProgress } from './components/ConversionProgress';
import { PDFPreviewer } from './components/PDFPreviewer';
import { scale, moderateScale, verticalScale } from '../../utils/responsive';
import { useToast } from '../../context/ToastContext';

export default function ConvertToPDFScreen() {
  const { 
    pickDocument, 
    pickImage, 
    convertToPDF, 
    downloadPDF, 
    isConverting, 
    pdfUri, 
    error 
  } = usePDFConverter();
  
  const { showToast } = useToast();
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handlePickDocument = async () => {
    const source = await pickDocument();
    if (source) convertToPDF(source);
  };

  const handlePickImage = async () => {
    const source = await pickImage();
    if (source) convertToPDF(source);
  };

  const handleUrlConvert = () => {
    if (!urlInput.trim()) {
      showToast('Please enter a valid URL', 'error');
      return;
    }
    convertToPDF({ type: 'url', value: urlInput.trim() });
    setShowUrlInput(false);
    setUrlInput('');
  };

  return (
    <LinearGradient colors={['#0a0a0f', '#1a1a2e']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>EduAI Converter</Text>
            <Text style={styles.subtitle}>Transform any document into a professional PDF</Text>
          </View>

          {/* Main Area */}
          <View style={styles.main}>
            {!isConverting && !pdfUri && (
              <DocumentPickerZone 
                onPickDocument={handlePickDocument}
                onPickImage={handlePickImage}
                onEnterURL={() => setShowUrlInput(true)}
              />
            )}

            {isConverting && <ConversionProgress />}

            {pdfUri && (
              <PDFPreviewer 
                uri={pdfUri} 
                onDownload={() => downloadPDF(pdfUri)}
                onShare={() => downloadPDF(pdfUri)} // downloadPDF handles sharing too
              />
            )}

            {error && (
              <View style={styles.errorCard}>
                <Ionicons name="warning" size={32} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={() => { /* State reset logic if needed */ }}
                >
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* URL Input Modal/Section */}
            {showUrlInput && (
              <View style={styles.urlCard}>
                <Text style={styles.urlCardTitle}>Convert from URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={urlInput}
                  onChangeText={setUrlInput}
                  autoCapitalize="none"
                  keyboardType="url"
                  autoFocus
                />
                <View style={styles.urlActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => setShowUrlInput(false)}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.convertButton} 
                    onPress={handleUrlConvert}
                  >
                    <Text style={styles.convertText}>Convert</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: verticalScale(40),
  },
  header: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(20),
  },
  title: {
    fontSize: moderateScale(32),
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: verticalScale(8),
    fontWeight: '500',
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    width: '90%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    marginTop: verticalScale(20),
  },
  errorText: {
    color: '#EF4444',
    fontSize: moderateScale(14),
    textAlign: 'center',
    marginVertical: verticalScale(12),
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
  },
  retryText: {
    color: '#FFF',
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  urlCard: {
    width: '90%',
    backgroundColor: '#1E293B',
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.5)',
    marginTop: verticalScale(20),
  },
  urlCardTitle: {
    color: '#FFF',
    fontSize: moderateScale(18),
    fontWeight: '800',
    marginBottom: verticalScale(16),
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    color: '#FFF',
    fontSize: moderateScale(16),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  urlActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    marginRight: scale(8),
  },
  cancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  convertButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
  },
  convertText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: moderateScale(14),
  },
});
