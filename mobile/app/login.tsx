import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { EyeIcon, EyeSlashIcon } from '../components/Icons';
import MotionScreen from '../components/MotionScreen';
import { AuthIllustration } from '../components/TechnicalIllustrations';
import { Brand } from '../constants/brand';
import { useAuthStore } from '../stores/authStore';

export default function LoginScreen() {
  const c = Brand.colors;
  const router = useRouter();
  const { login, loading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length > 0 && !loading;
  }, [email, password, loading]);

  const onLogin = async () => {
    try {
      await login(email.trim(), password, orgSlug.trim() || undefined);
      router.replace('/(tabs)');
    } catch {
      // error rendered from store
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={c.bg} />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <MotionScreen>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={[styles.heroBadge, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Text style={[styles.heroBadgeText, { color: c.accentSoft }]}>KNOLEDGR MOBILE</Text>
            </View>
            <Text style={[styles.brand, { color: c.text }]}>Move Faster With Context</Text>
            <Text style={[styles.tagline, { color: c.textMuted }]}>Team memory, decisions, and execution in one operating layer.</Text>
            <View style={[styles.illustrationWrap, { borderColor: c.border, backgroundColor: c.surface }]}>
              <AuthIllustration />
            </View>
          </View>

          <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
            <View style={styles.cardTop}>
              <Image
                source={require('../assets/images/knoledgr-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View>
                <Text style={[styles.title, { color: c.text }]}>Sign In</Text>
                <Text style={[styles.sub, { color: c.textMuted }]}>Continue to your workspace</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.fieldWrap, { borderColor: c.border, backgroundColor: c.bgSoft }, focused === 'email' && { borderColor: c.accent }]}>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: c.text }]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@company.com"
                placeholderTextColor={c.textMuted}
              />
            </View>

            <View style={[styles.fieldWrap, { borderColor: c.border, backgroundColor: c.bgSoft }, focused === 'org' && { borderColor: c.accent }]}>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Workspace Slug (Optional)</Text>
              <TextInput
                style={[styles.input, { color: c.text }]}
                value={orgSlug}
                onChangeText={setOrgSlug}
                onFocus={() => setFocused('org')}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="acme-inc"
                placeholderTextColor={c.textMuted}
              />
            </View>

            <View style={[styles.fieldWrap, { borderColor: c.border, backgroundColor: c.bgSoft }, focused === 'password' && { borderColor: c.accent }]}>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { color: c.text }]}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Enter your password"
                  placeholderTextColor={c.textMuted}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  {showPassword ? <EyeSlashIcon color={c.textMuted} /> : <EyeIcon color={c.textMuted} />}
                </Pressable>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submit, { backgroundColor: c.accent }, !canSubmit && styles.submitDisabled]}
              disabled={!canSubmit}
              onPress={onLogin}
            >
              {loading ? (
                <View style={styles.submitLoading}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.submitText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        </MotionScreen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 12,
  },
  hero: { gap: 6 },
  heroBadge: {
    borderWidth: 1,
    borderRadius: 0,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  heroBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  brand: { fontSize: 30, fontWeight: '900', lineHeight: 36 },
  tagline: { marginTop: 2, fontSize: 13, lineHeight: 20 },
  illustrationWrap: { borderWidth: 1, padding: 8, marginTop: 6 },
  card: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 14,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  logo: { width: 44, height: 44, borderRadius: 0 },
  title: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 12 },
  errorWrap: {
    borderWidth: 1,
    borderColor: '#f5b0b0',
    backgroundColor: '#fff1f1',
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: { color: '#991b1b', fontSize: 13 },
  fieldWrap: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  input: { fontSize: 14, paddingVertical: 8 },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1 },
  eyeBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  submit: {
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 4,
  },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  submitLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
