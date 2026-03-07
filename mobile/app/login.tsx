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
import { useAuthStore } from '../stores/authStore';

export default function LoginScreen() {
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
      // Error rendered from store
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#08101c" />
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>KNOLEDGR MOBILE</Text>
            </View>
            <Text style={styles.brand}>Context That Moves Work Forward</Text>
            <Text style={styles.tagline}>
              Capture decisions, preserve rationale, and keep teams aligned in one operational memory layer.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Image
                source={require('../assets/images/knoledgr-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.title}>Sign In</Text>
                <Text style={styles.sub}>Continue to your workspace</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.fieldWrap, focused === 'email' && styles.fieldWrapFocused]}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@company.com"
                placeholderTextColor="#7f93ad"
              />
            </View>

            <View style={[styles.fieldWrap, focused === 'org' && styles.fieldWrapFocused]}>
              <Text style={styles.fieldLabel}>Workspace Slug (Optional)</Text>
              <TextInput
                style={styles.input}
                value={orgSlug}
                onChangeText={setOrgSlug}
                onFocus={() => setFocused('org')}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="acme-inc"
                placeholderTextColor="#7f93ad"
              />
            </View>

            <View style={[styles.fieldWrap, focused === 'password' && styles.fieldWrapFocused]}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Enter your password"
                  placeholderTextColor="#7f93ad"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  {showPassword ? <EyeSlashIcon color="#9fb2cb" /> : <EyeIcon color="#9fb2cb" />}
                </Pressable>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submit, !canSubmit && styles.submitDisabled]}
              disabled={!canSubmit}
              onPress={onLogin}
            >
              {loading ? (
                <View style={styles.submitLoading}>
                  <ActivityIndicator size="small" color="#0f172a" />
                  <Text style={styles.submitText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footer}>
              Protected by workspace security controls. Use your official organization account.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#08101c',
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
  },
  bgOrbA: {
    position: 'absolute',
    top: 30,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#1f2937',
    opacity: 0.35,
  },
  bgOrbB: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: '#7c4f26',
    opacity: 0.2,
  },
  hero: {
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  heroBadge: {
    backgroundColor: '#182335',
    borderWidth: 1,
    borderColor: '#2a3a53',
    borderRadius: 0,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: '#adc0da',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 0,
  },
  brand: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.1,
    lineHeight: 36,
  },
  tagline: {
    marginTop: 6,
    color: '#94a6bf',
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: '#2b3a50',
    borderRadius: 0,
    padding: 16,
    backgroundColor: '#111a29ee',
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  sub: {
    color: '#9eb1ca',
    marginBottom: 0,
  },
  errorWrap: {
    borderWidth: 1,
    borderColor: '#8b1f1f',
    backgroundColor: '#4a1a1a',
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
  },
  fieldWrap: {
    borderWidth: 1,
    borderColor: '#2a3a53',
    borderRadius: 0,
    backgroundColor: '#0b1523',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  fieldWrapFocused: {
    borderColor: '#f4c48c',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9eb1ca',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    color: '#f8fafc',
    fontSize: 14,
    paddingVertical: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  submit: {
    backgroundColor: '#f4c48c',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 4,
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  submitLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    color: '#7f93ad',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
});
