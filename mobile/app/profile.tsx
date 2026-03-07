import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuthStore } from '../stores/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.full_name || user?.email || 'User'}</Text>
        <Text style={styles.meta}>{user?.email || '-'}</Text>
        <Text style={styles.meta}>{user?.organization_name || '-'}</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => router.push('/notifications')}>
        <Text style={styles.btnText}>Open Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.danger]} onPress={onLogout}>
        <Text style={[styles.btnText, styles.dangerText]}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f141d', padding: 18, gap: 12 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  card: {
    backgroundColor: '#121a27',
    borderColor: '#263246',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  name: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  meta: { color: '#9db0c8', fontSize: 13 },
  btn: {
    backgroundColor: '#243146',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#dbe5f3', fontWeight: '600' },
  danger: { backgroundColor: '#411a1a' },
  dangerText: { color: '#fecaca' },
});
