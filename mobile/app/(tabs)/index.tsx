import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BellIcon, ChatIcon, DecisionIcon, KnowledgeIcon, SprintIcon, UserIcon } from '../../components/Icons';
import { conversationService, decisionService, normalizeList, sprintService } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

type Stat = { label: string; value: number };

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Conversations', value: 0 },
    { label: 'Decisions', value: 0 },
    { label: 'Sprints', value: 0 },
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const [conv, dec, spr] = await Promise.all([
          conversationService.list(),
          decisionService.list(),
          sprintService.list(),
        ]);
        setStats([
          { label: 'Conversations', value: normalizeList(conv.data).length },
          { label: 'Decisions', value: normalizeList(dec.data).length },
          { label: 'Sprints', value: normalizeList(spr.data).length },
        ]);
      } catch (error) {
        console.error('Dashboard fetch failed:', error);
      }
    };
    load();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Workspace</Text>
      <View style={styles.topActions}>
        <TouchableOpacity style={styles.topBtn} onPress={() => router.push('/notifications')}>
          <BellIcon color="#dbe5f3" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBtn} onPress={() => router.push('/profile')}>
          <UserIcon color="#dbe5f3" />
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>Welcome, {user?.full_name || 'Teammate'}</Text>
      <Text style={styles.sub}>{user?.organization_name || 'Your organization'}</Text>

      <View style={styles.grid}>
        {stats.map((card) => (
          <View key={card.label} style={styles.statCard}>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/conversations')}>
          <ChatIcon color="#f6c287" />
          <Text style={styles.actionTitle}>Conversations</Text>
          <Text style={styles.actionSub}>Capture and review team context.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/decisions')}>
          <DecisionIcon color="#f6c287" />
          <Text style={styles.actionTitle}>Decisions</Text>
          <Text style={styles.actionSub}>Track rationale and outcomes.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/explore')}>
          <KnowledgeIcon color="#f6c287" />
          <Text style={styles.actionTitle}>Knowledge</Text>
          <Text style={styles.actionSub}>Find docs, notes, and references.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/sprints')}>
          <SprintIcon color="#f6c287" />
          <Text style={styles.actionTitle}>Sprints</Text>
          <Text style={styles.actionSub}>Plan and execute delivery cycles.</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f141d' },
  content: { padding: 18, paddingBottom: 28 },
  eyebrow: { color: '#f6c287', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  topActions: { flexDirection: 'row', gap: 8, position: 'absolute', right: 18, top: 18 },
  topBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#243146',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '800', marginTop: 4 },
  sub: { color: '#9db0c8', marginTop: 4, marginBottom: 18 },
  grid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#121a27',
    borderColor: '#263246',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statValue: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#90a0b5', fontSize: 12 },
  sectionTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  actions: { gap: 10 },
  actionCard: {
    backgroundColor: '#121a27',
    borderColor: '#263246',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  actionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  actionSub: { color: '#9db0c8', fontSize: 13 },
});
