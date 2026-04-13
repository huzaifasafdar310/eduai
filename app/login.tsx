import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Alert,
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
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

// Required for the OAuth redirect to close the browser automatically
WebBrowser.maybeCompleteAuthSession();

// ----- Helpers -----
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: themeName, isDark } = useTheme();
  const theme = COLORS[themeName];
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  // ----- Navigate after login -----
  async function navigateAfterLogin(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    if (profile?.onboarding_completed) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  }

  // ----- Validation -----
  function validateInputs(): boolean {
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return false;
    }
    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      return false;
    }
    if (!password) {
      showToast('Please enter your password', 'error');
      return false;
    }
    return true;
  }

  // ----- Email/Password Login -----
  async function handleLogin() {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login')) {
          showToast('Incorrect email or password', 'error');
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          showToast('Please verify your email before signing in', 'error');
        } else {
          showToast(error.message, 'error');
        }
      } else if (user) {
        showToast('Welcome back!', 'success');
        await navigateAfterLogin(user.id);
      }
    } catch (e) {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ----- Google OAuth Login -----
  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const redirectTo = makeRedirectUri({ scheme: 'app', path: 'auth/callback' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned from Supabase');

      // Open the Google OAuth page in the system browser
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        // Parse the returned URL to extract access_token and refresh_token
        const url = result.url;
        const hashParams = new URLSearchParams(url.includes('#') ? url.split('#')[1] : url.split('?')[1] || '');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;

          if (sessionData.user) {
            showToast('Signed in with Google!', 'success');
            await navigateAfterLogin(sessionData.user.id);
          }
        } else {
          showToast('Could not complete Google sign in. Please try again.', 'error');
        }
      } else if (result.type === 'cancel') {
        // User closed the browser — no toast needed
      }
    } catch (e: any) {
      showToast(e.message || 'Google sign in failed. Try again.', 'error');
    } finally {
      setGoogleLoading(false);
    }
  }

  // ----- Forgot Password -----
  async function handleForgotPassword() {
    if (!email.trim()) {
      showToast('Enter your email above to reset your password', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address first', 'error');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'app://reset-password' }
      );

      if (error) {
        showToast(error.message, 'error');
      } else {
        Alert.alert(
          'Check Your Email',
          `A password reset link has been sent to ${email.trim()}. Please check your inbox (and spam folder).`,
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      showToast('Could not send reset email. Try again.', 'error');
    } finally {
      setResetLoading(false);
    }
  }

  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0';

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Branding */}
          <View style={styles.branding}>
            <View style={[styles.logoIconBg, { backgroundColor: theme.primary }]}>
              <FontAwesome5 name="graduation-cap" size={40} color="#fff" />
            </View>
            <ThemedText type="title" style={[styles.title, { color: theme.text }]}>
              Welcome Back!
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.gray }]}>
              Sign in to continue your AI learning journey.
            </ThemedText>
          </View>

          <View style={styles.form}>
            {/* Google Button */}
            <TouchableOpacity
              style={[
                styles.googleBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                  borderColor,
                },
              ]}
              onPress={handleGoogleLogin}
              disabled={googleLoading || loading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <>
                  {/* Google G logo using coloured icon segments */}
                  <View style={styles.googleIconWrapper}>
                    <ThemedText style={styles.googleG}>G</ThemedText>
                  </View>
                  <ThemedText style={[styles.googleBtnText, { color: theme.text }]}>
                    Continue with Google
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
              <ThemedText style={[styles.dividerText, { color: theme.gray }]}>or sign in with email</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            </View>

            {/* Email */}
            <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="mail-outline" size={20} color={theme.gray} style={styles.inputPrefix} />
              <TextInput
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
            <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.gray} style={styles.inputPrefix} />
              <TextInput
                ref={passwordRef}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <ThemedText style={{ color: theme.primary, fontWeight: '700' }}>
                  Forgot Password?
                </ThemedText>
              )}
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: theme.primary, opacity: loading ? 0.8 : 1 }]}
              onPress={handleLogin}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.loginBtnText}>Sign In</ThemedText>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerMore}>
              <ThemedText style={{ color: theme.gray }}>Don't have an account? </ThemedText>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <ThemedText style={{ color: theme.primary, fontWeight: '800' }}>
                  Create Account
                </ThemedText>
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
  branding: { alignItems: 'center', marginBottom: 40 },
  logoIconBg: { width: 80, height: 80, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontSize: 13, textAlign: 'center', opacity: 0.8 },
  form: { gap: 15 },
  // Google Button
  googleBtn: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  googleIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  googleG: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4285F4',
    lineHeight: 22,
  },
  googleBtnText: { fontSize: 15, fontWeight: '700' },
  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },
  // Inputs
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 18, borderWidth: 1, paddingHorizontal: 15 },
  inputPrefix: { marginRight: 10 },
  input: { flex: 1, fontSize: 13, fontWeight: '500' },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 5 },
  loginBtn: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  loginBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  registerMore: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});
