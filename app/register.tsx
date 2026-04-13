import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/hooks/use-app-theme';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/context/ToastContext';

// ----- Helpers -----
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const getPasswordStrength = (password: string): { label: string; color: string; width: string } => {
  if (password.length === 0) return { label: '', color: 'transparent', width: '0%' };
  if (password.length < 6) return { label: 'Too short', color: '#EF4444', width: '25%' };
  if (password.length < 8) return { label: 'Weak', color: '#F59E0B', width: '50%' };
  if (/[A-Z]/.test(password) && /[0-9]/.test(password) && password.length >= 8)
    return { label: 'Strong', color: '#10B981', width: '100%' };
  return { label: 'Fair', color: '#3B82F6', width: '75%' };
};

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: themeName, isDark } = useTheme();
  const theme = COLORS[themeName];
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const strength = getPasswordStrength(password);

  // ----- Validation -----
  function validateInputs(): boolean {
    if (!fullName.trim() || fullName.trim().length < 2) {
      showToast('Please enter your full name (at least 2 characters)', 'error');
      return false;
    }
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return false;
    }
    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      return false;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return false;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return false;
    }
    return true;
  }

  // ----- Register -----
  async function handleRegister() {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          showToast('An account with this email already exists. Please sign in.', 'error');
        } else {
          showToast(error.message, 'error');
        }
      } else if (data.user && !data.session) {
        // Email confirmation required
        showToast('Account created! Please check your email to verify your account.', 'success');
        router.replace('/login');
      } else {
        // Auto-confirmed (dev/test mode)
        showToast('Account created! Welcome to EduAI 🎓', 'success');
        router.replace('/onboarding');
      }
    } catch (e) {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.branding}>
            <View style={[styles.logoIconBg, { backgroundColor: theme.primary }]}>
              <FontAwesome5 name="graduation-cap" size={40} color="#fff" />
            </View>
            <ThemedText type="title" style={[styles.title, { color: theme.text }]}>
              Create Account
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.gray }]}>
              Join EduAI and start your learning journey.
            </ThemedText>
          </View>

          <View style={styles.form}>
            {/* Full Name */}
            <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="person-outline" size={20} color={theme.gray} style={styles.inputPrefix} />
              <TextInput
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="name"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                placeholderTextColor={theme.gray}
                style={[styles.input, { color: theme.text }]}
              />
            </View>

            {/* Email */}
            <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="mail-outline" size={20} color={theme.gray} style={styles.inputPrefix} />
              <TextInput
                ref={emailRef}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholderTextColor={theme.gray}
                style={[styles.input, { color: theme.text }]}
              />
            </View>

            {/* Password */}
            <View>
              <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.gray} style={styles.inputPrefix} />
                <TextInput
                  ref={passwordRef}
                  placeholder="Password (min. 6 characters)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  placeholderTextColor={theme.gray}
                  style={[styles.input, { color: theme.text }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.gray}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength Bar */}
              {password.length > 0 && (
                <View style={styles.strengthWrapper}>
                  <View style={[styles.strengthBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
                    <View style={[styles.strengthFill, { width: strength.width as any, backgroundColor: strength.color }]} />
                  </View>
                  <ThemedText style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.gray} style={styles.inputPrefix} />
              <TextInput
                ref={confirmRef}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                placeholderTextColor={theme.gray}
                style={[styles.input, { color: theme.text }]}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} style={styles.eyeBtn}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.gray}
                />
              </TouchableOpacity>
              {/* Match indicator */}
              {confirmPassword.length > 0 && (
                <Ionicons
                  name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={password === confirmPassword ? '#10B981' : '#EF4444'}
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerBtn, { backgroundColor: theme.primary, opacity: loading ? 0.8 : 1 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.registerBtnText}>Create Account</ThemedText>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginMore}>
              <ThemedText style={{ color: theme.gray }}>Already have an account? </ThemedText>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <ThemedText style={{ color: theme.primary, fontWeight: '800' }}>Sign In</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 30, flexGrow: 1, justifyContent: 'center' },
  branding: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  logoIconBg: { width: 80, height: 80, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontSize: 13, textAlign: 'center', opacity: 0.8 },
  form: { gap: 15 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 18, borderWidth: 1, paddingHorizontal: 15 },
  inputPrefix: { marginRight: 10 },
  input: { flex: 1, fontSize: 13, fontWeight: '500' },
  eyeBtn: { padding: 4 },
  strengthWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 4, gap: 10 },
  strengthBar: { flex: 1, height: 4, borderRadius: 4, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 4 },
  strengthLabel: { fontSize: 11, fontWeight: '700', width: 60, textAlign: 'right' },
  registerBtn: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  registerBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  loginMore: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 30 },
});
