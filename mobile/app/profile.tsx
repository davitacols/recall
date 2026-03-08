import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Brand } from '../constants/brand';
import { useAuthStore } from '../stores/authStore';

export default function ProfileScreen() {
  const c = Brand.colors;
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.text }]}>Profile</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.name, { color: c.text }]}>{user?.full_name || user?.email || 'User'}</Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>{user?.email || '-'}</Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>{user?.organization_name || '-'}</Text>
      </View>

      <TouchableOpacity style={[styles.btn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]} onPress={() => router.push('/notifications')}>
        <Text style={[styles.btnText, { color: c.text }]}>Open Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]} onPress={() => router.push('/workspace-switch')}>
        <Text style={[styles.btnText, { color: c.text }]}>Switch Organization</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.danger, { borderColor: '#f2b8b8' }]} onPress={onLogout}>
        <Text style={[styles.btnText, styles.dangerText]}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 18, gap: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  card: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 14,
    gap: 4,
  },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13 },
  btn: {
    borderRadius: 0,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { fontWeight: '700' },
  danger: { backgroundColor: '#fff1f1' },
  dangerText: { color: '#991b1b' },
});
