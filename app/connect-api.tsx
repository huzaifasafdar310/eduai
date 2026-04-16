import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator, 
  TextInput,
  StatusBar,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { COLORS } from '@/hooks/use-app-theme';
import { apiClient } from '@/services/apiClient';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ConnectAPIScreen() {
  const router = useRouter();
  const { theme: themeName, isDark } = useTheme();
  const theme = COLORS[themeName];
  const { refreshApiStatus } = useApp();
  const { logout } = useAuth();

  const [apiKey, setApiKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  React.useEffect(() => {
    const checkConnectivity = async () => {
      try {
        await apiClient.get('/health');
        setServerStatus('online');
      } catch (e) {
        console.error('[Connectivity Check Fail]:', e);
        setServerStatus('offline');
      }
    };
    checkConnectivity();
  }, []);

  const handleConnectGroq = () => {
    Linking.openURL('https://console.groq.com/keys');
  };

  const handleVerify = async () => {
    if (apiKey.length < 10) {
      Alert.alert("Invalid Key", "Please enter a valid Groq API key.");
      return;
    }

    setIsVerifying(true);
    try {
      // 📡 Calling the standardized Senior-Level endpoint
      const response = await apiClient.post('/api/keys/connect-api', { apiKey: apiKey.trim() });
      
      if (response.data.success) {
        await refreshApiStatus(); // Update global context
        Alert.alert(
          "Authority Established",
          "Your personal API key has been securely encrypted and connected. Welcome to EduAI.",
          [{ text: "Launch App", onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        throw new Error(response.data.message || 'Verification failed');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      Alert.alert("Connection Failed", errorMsg || "Could not verify API key. Please check your network and key validity.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LinearGradient
            colors={[theme.primary, theme.primary + '80']}
            style={styles.iconContainer}
          >
            <MaterialCommunityIcons name="security" size={40} color="#FFF" />
          </LinearGradient>
          <ThemedText style={styles.title}>Establish API Authority</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.gray }]}>
            EduAI is a decentralized BYOK platform. To ensure total privacy and isolation, you must connect your own Groq API key.
          </ThemedText>

          {/* 📡 Connection Status Indicator */}
          <View style={[styles.statusBadge, { 
            backgroundColor: serverStatus === 'online' ? '#10B98120' : serverStatus === 'offline' ? '#EF444420' : theme.gray + '20' 
          }]}>
            <View style={[styles.statusDot, { 
              backgroundColor: serverStatus === 'online' ? '#10B981' : serverStatus === 'offline' ? '#EF4444' : theme.gray 
            }]} />
            <ThemedText style={[styles.statusText, { 
              color: serverStatus === 'online' ? '#059669' : serverStatus === 'offline' ? '#B91C1C' : theme.gray 
            }]}>
              Backend: {serverStatus.toUpperCase()}
            </ThemedText>
            {serverStatus === 'offline' && (
              <ThemedText style={styles.ipHint}>Check .env IP</ThemedText>
            )}
          </View>
        </View>

        <View style={styles.stepsContainer}>
          {/* Step 1 */}
          <View style={styles.stepCard}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary + '20' }]}>
              <ThemedText style={{ color: theme.primary, fontWeight: '800' }}>1</ThemedText>
            </View>
            <View style={styles.stepTextContent}>
              <ThemedText style={styles.stepTitle}>Obtain Your Key</ThemedText>
              <ThemedText style={[styles.stepDesc, { color: theme.gray }]}>
                Visit the official Groq Console to generate a new API key.
              </ThemedText>
              <TouchableOpacity 
                style={[styles.linkBtn, { backgroundColor: theme.primary + '10' }]} 
                onPress={handleConnectGroq}
              >
                <ThemedText style={{ color: theme.primary, fontWeight: '700' }}>Go to Groq Console</ThemedText>
                <Ionicons name="open-outline" size={16} color={theme.primary} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.stepCard}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary + '20' }]}>
              <ThemedText style={{ color: theme.primary, fontWeight: '800' }}>2</ThemedText>
            </View>
            <View style={styles.stepTextContent}>
              <ThemedText style={styles.stepTitle}>Paste & Encrypt</ThemedText>
              <ThemedText style={[styles.stepDesc, { color: theme.gray }]}>
                Enter your key below. It will be encrypted using AES-256-GCM before storage.
              </ThemedText>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', 
                  color: theme.text, 
                  borderColor: theme.border 
                }]}
                placeholder="gsk_..."
                placeholderTextColor={theme.gray}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={apiKey}
                onChangeText={setApiKey}
              />
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
          <ThemedText style={[styles.infoText, { color: theme.gray }]}>
            Your key is never exposed to the frontend. It is strictly used by the backend to process your personal AI requests.
          </ThemedText>
        </View>

        <TouchableOpacity 
          style={[styles.verifyBtn, { backgroundColor: apiKey.length > 10 ? theme.primary : theme.gray + '50' }]}
          onPress={handleVerify}
          disabled={apiKey.length < 10 || isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <ThemedText style={styles.verifyBtnText}>Verify & Finalize Authority</ThemedText>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 10 }} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <ThemedText style={{ color: '#EF4444', fontWeight: '600' }}>Switch Account</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 30, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  stepsContainer: { gap: 20, marginBottom: 30 },
  stepCard: { flexDirection: 'row', gap: 15 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepTextContent: { flex: 1 },
  stepTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  stepDesc: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  linkBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  input: { height: 55, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 15, fontSize: 16, fontWeight: '600' },
  infoBox: { flexDirection: 'row', gap: 12, padding: 15, borderRadius: 16, backgroundColor: 'rgba(59, 130, 246, 0.05)', marginBottom: 40 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  verifyBtn: { height: 60, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowOpacity: 0.2, shadowRadius: 8, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 } },
  verifyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  logoutBtn: { marginTop: 25, alignSelf: 'center', padding: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 15, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800' },
  ipHint: { fontSize: 10, opacity: 0.6, fontWeight: '700', marginLeft: 4 }
});
