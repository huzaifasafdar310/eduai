import React from 'react';
import { 
  StyleSheet, 
  View, 
  Modal, 
  TouchableOpacity, 
  Dimensions,
  Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/hooks/use-app-theme';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ApiGuardModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ApiGuardModal = ({ visible, onClose }: ApiGuardModalProps) => {
  const router = useRouter();
  const { theme: themeName, isDark } = useTheme();
  const theme = COLORS[themeName];

  const handleConnect = () => {
    onClose();
    router.push('/connect-api');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.centeredView}>
            <Pressable pointerEvents="auto" style={[styles.modalView, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
              <View style={styles.header}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.iconContainer}
                >
                  <MaterialCommunityIcons name="api" size={32} color="#FFF" />
                </LinearGradient>
              </View>

              <ThemedText style={styles.title}>AI Setup Required</ThemedText>
              <ThemedText style={[styles.message, { color: theme.gray }]}>
                EduAI's decentralized architecture requires a personal Groq API key to process your request. 
              </ThemedText>

              <View style={styles.bulletPoints}>
                <View style={styles.bullet}>
                  <Ionicons name="shield-checkmark" size={16} color={theme.primary} />
                  <ThemedText style={styles.bulletText}>Secure AES-256 Encryption</ThemedText>
                </View>
                <View style={styles.bullet}>
                  <Ionicons name="flash-outline" size={16} color={theme.primary} />
                  <ThemedText style={styles.bulletText}>Unlimited Free Usage (BYOK)</ThemedText>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.connectBtn, { backgroundColor: theme.primary }]} 
                onPress={handleConnect}
              >
                <ThemedText style={styles.connectBtnText}>Connect Now</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <ThemedText style={[styles.cancelBtnText, { color: theme.gray }]}>Maybe Later</ThemedText>
              </TouchableOpacity>
            </Pressable>
          </View>
        </BlurView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  centeredView: { width: width * 0.85 },
  modalView: {
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  header: { marginBottom: 20 },
  iconContainer: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  bulletPoints: { alignSelf: 'stretch', marginBottom: 25, gap: 10 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 10, borderRadius: 12 },
  bulletText: { fontSize: 12, fontWeight: '700', opacity: 0.8 },
  connectBtn: { 
    width: '100%', 
    height: 55, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  connectBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  cancelBtn: { padding: 10 },
  cancelBtnText: { fontSize: 14, fontWeight: '700' }
});
