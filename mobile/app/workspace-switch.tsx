import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { authService } from '../services/api';
import { Brand } from '../constants/brand';
import { useAuthStore } from '../stores/authStore';

type Workspace = {
  org_id: number;
  org_name: string;
  org_slug: string;
  role: string;
  user_id: number;
};

export default function WorkspaceSwitchScreen() {
  const c = Brand.colors;
  const router = useRouter();
  const { applyAuthPayload } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentOrgSlug, setCurrentOrgSlug] = useState<string>('');
  const [selectedOrgSlug, setSelectedOrgSlug] = useState<string>('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await authService.workspaces();
      setWorkspaces(res.data?.workspaces || []);
      setCurrentOrgSlug(res.data?.current_org_slug || '');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Unable to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requestCode = async () => {
    if (!selectedOrgSlug) {
      Alert.alert('Select workspace', 'Choose a target workspace first.');
      return;
    }
    try {
      const res = await authService.requestWorkspaceSwitchCode(selectedOrgSlug);
      Alert.alert('Verification code sent', `Check your email. Expires in ${res.data?.expires_in_seconds || 0}s.`);
    } catch (error: any) {
      Alert.alert('Failed', error?.response?.data?.error || 'Unable to send verification code');
    }
  };

  const switchNow = async () => {
    if (!selectedOrgSlug) {
      Alert.alert('Select workspace', 'Choose a target workspace first.');
      return;
    }
    if (!otpCode.trim() && !password.trim()) {
      Alert.alert('Verification required', 'Provide OTP code or password.');
      return;
    }

    setSwitching(true);
    try {
      const res = await authService.switchWorkspace({
        org_slug: selectedOrgSlug,
        otp_code: otpCode.trim() || undefined,
        password: password.trim() || undefined,
      });
      await applyAuthPayload(res.data);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Switch failed', error?.response?.data?.error || 'Unable to switch workspace');
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={styles.topBar}>
        <Text style={[styles.title, { color: c.text }]}>Switch Workspace</Text>
        <TouchableOpacity style={[styles.refreshBtn, { borderColor: c.border, backgroundColor: c.surfaceAlt }]} onPress={load}>
          <Text style={[styles.refreshText, { color: c.text }]}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sub, { color: c.textMuted }]}>Current: {currentOrgSlug || '-'}</Text>

      <FlatList
        data={workspaces}
        keyExtractor={(item) => String(item.org_id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = selectedOrgSlug === item.org_slug;
          const isCurrent = item.org_slug === currentOrgSlug;
          return (
            <TouchableOpacity
              style={[
                styles.row,
                { borderColor: c.border, backgroundColor: c.surface },
                selected && { borderColor: c.accent },
                isCurrent && { backgroundColor: c.surfaceAlt },
              ]}
              onPress={() => setSelectedOrgSlug(item.org_slug)}
              activeOpacity={0.9}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]}>{item.org_name}</Text>
                <Text style={[styles.rowMeta, { color: c.textMuted }]}>{item.org_slug} | {item.role}</Text>
              </View>
              {isCurrent ? <Text style={[styles.currentTag, { color: c.accentSoft }]}>CURRENT</Text> : null}
            </TouchableOpacity>
          );
        }}
      />

      <View style={[styles.panel, { borderColor: c.border, backgroundColor: c.surface }]}>
        <Text style={[styles.panelTitle, { color: c.text }]}>Verification</Text>
        <TextInput
          style={[styles.input, { borderColor: c.border, backgroundColor: c.bgSoft, color: c.text }]}
          value={otpCode}
          onChangeText={setOtpCode}
          placeholder="OTP code from email"
          placeholderTextColor={c.textMuted}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, { borderColor: c.border, backgroundColor: c.bgSoft, color: c.text }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Or account password"
          placeholderTextColor={c.textMuted}
          secureTextEntry
        />

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]} onPress={requestCode} disabled={switching}>
            <Text style={[styles.secondaryText, { color: c.text }]}>Request Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: c.accent, borderColor: c.accent }]} onPress={switchNow} disabled={switching}>
            {switching ? <ActivityIndicator color="#111827" /> : <Text style={styles.btnText}>Switch</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshBtn: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 0 },
  refreshText: { fontSize: 12, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '900' },
  sub: { marginTop: 4, marginBottom: 10 },
  list: { gap: 8, paddingBottom: 10 },
  row: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '800' },
  rowMeta: { marginTop: 2, fontSize: 12 },
  currentTag: { fontSize: 11, fontWeight: '800' },
  panel: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 0,
    gap: 8,
  },
  panelTitle: { fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 0,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#111827', fontWeight: '700' },
  secondaryText: { fontWeight: '700' },
});
