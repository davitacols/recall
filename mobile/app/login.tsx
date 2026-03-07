import React, { useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

  const onLogin = async () => {
    try {
      await login(email.trim(), password, orgSlug.trim() || undefined);
      router.replace('/(tabs)');
    } catch {
      // handled in store
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1119" />
      <View style={styles.hero}>
        <View style={styles.brandDot} />
        <Text style={styles.brand}>Knoledgr</Text>
        <Text style={styles.tag}>Decisions. Context. Execution.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.sub}>Use your workspace credentials.</Text>

        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#8ba0b8"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          value={orgSlug}
          onChangeText={setOrgSlug}
          placeholder="Organization slug (optional)"
          placeholderTextColor="#8ba0b8"
          autoCapitalize="none"
        />

        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.password}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#8ba0b8"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
            {showPassword ? <EyeSlashIcon color="#9cb1ca" /> : <EyeIcon color="#9cb1ca" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={onLogin} disabled={loading}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#111827" size="small" />
              <Text style={styles.loginText}>Signing in...</Text>
            </View>
          ) : (
            <Text style={styles.loginText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b1119',
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: 24,
  },
  brandDot: {
    width: 40,
    height: 6,
    borderRadius: 8,
    backgroundColor: '#f0b36d',
    marginBottom: 14,
  },
  brand: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tag: {
    color: '#9db0c8',
    fontSize: 14,
    marginTop: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: '#1f2a3a',
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#121a27',
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  sub: {
    color: '#9db0c8',
    marginTop: 4,
    marginBottom: 16,
  },
  errorWrap: {
    backgroundColor: '#4c1d1d',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#273449',
    backgroundColor: '#0e1622',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    color: '#f8fafc',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#273449',
    backgroundColor: '#0e1622',
    borderRadius: 11,
    marginBottom: 14,
  },
  password: {
    flex: 1,
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeBtn: {
    paddingHorizontal: 12,
  },
  loginBtn: {
    borderRadius: 12,
    backgroundColor: '#f0b36d',
    paddingVertical: 13,
    alignItems: 'center',
  },
  loginText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
