import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { BellIcon, ChatIcon, DecisionIcon, KnowledgeIcon, SprintIcon, UserIcon } from '../../components/Icons';
import MotionScreen from '../../components/MotionScreen';
import { DashboardIllustration } from '../../components/TechnicalIllustrations';
import { Brand } from '../../constants/brand';
import { conversationService, decisionService, normalizeList, notificationService, sprintService } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

type Stat = { label: string; value: number; delta: string };
type Action = {
  key: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  route: string;
};

const actions: Action[] = [
  { key: 'conversations', label: 'Conversations', sub: 'Meetings, blockers, team signals', icon: ChatIcon, route: '/(tabs)/conversations' },
  { key: 'decisions', label: 'Decisions', sub: 'Rationale, confidence, ownership', icon: DecisionIcon, route: '/(tabs)/decisions' },
  { key: 'sprints', label: 'Sprints', sub: 'Throughput and delivery pacing', icon: SprintIcon, route: '/(tabs)/sprints' },
  { key: 'knowledge', label: 'Knowledge', sub: 'Standards and memory layer', icon: KnowledgeIcon, route: '/(tabs)/explore' },
];

export default function DashboardScreen() {
  const c = Brand.colors;
  const router = useRouter();
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Conversations', value: 0, delta: '+0' },
    { label: 'Decisions', value: 0, delta: '+0' },
    { label: 'Sprints', value: 0, delta: '+0' },
  ]);

  const refreshUnread = useCallback(async () => {
    try {
      const notifRes = await notificationService.list();
      setUnreadCount(notifRes.data?.unread_count || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [conv, dec, spr] = await Promise.all([
        conversationService.list(),
        decisionService.list(),
        sprintService.list(),
      ]);
      const convCount = normalizeList(conv.data).length;
      const decCount = normalizeList(dec.data).length;
      const sprintCount = normalizeList(spr.data).length;
      setStats([
        { label: 'Conversations', value: convCount, delta: `+${Math.min(convCount, 7)}` },
        { label: 'Decisions', value: decCount, delta: `+${Math.min(decCount, 5)}` },
        { label: 'Sprints', value: sprintCount, delta: `+${Math.min(sprintCount, 3)}` },
      ]);
      await refreshUnread();
    } catch (error) {
      console.error('Dashboard fetch failed:', error);
    }
  }, [refreshUnread]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      refreshUnread();
    }, [refreshUnread])
  );

  return (
    <MotionScreen>
      <ScrollView style={[styles.screen, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
        <View style={styles.darkHero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroKicker}>KNOLEDGR</Text>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.iconBtnDark} onPress={() => router.push('/notifications')}>
                <BellIcon color="#ffffff" />
                {unreadCount > 0 ? (
                  <View style={styles.unreadDot}>
                    <Text style={styles.unreadText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtnDark} onPress={() => router.push('/profile')}>
                <UserIcon color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.heroTitle}>Execution Console</Text>
          <Text style={styles.heroSub}>{user?.organization_name || 'Workspace'} | Live control panel</Text>

          <View style={styles.heroIdentity}>
            <Text style={styles.heroIdentityLabel}>ACTIVE USER</Text>
            <Text style={styles.heroIdentityValue}>{user?.full_name || 'Teammate'}</Text>
          </View>

          <TouchableOpacity style={styles.primaryCta} onPress={() => router.push('/(tabs)/sprints')}>
            <Text style={styles.primaryCtaText}>Resume Delivery</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.illustrationWrap, { borderColor: c.border, backgroundColor: c.surface }]}>
          <DashboardIllustration />
        </View>

        <View style={styles.metricsRow}>
          {stats.map((card) => (
            <View key={card.label} style={[styles.metricCard, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Text style={[styles.metricValue, { color: c.text }]}>{card.value}</Text>
              <Text style={[styles.metricLabel, { color: c.textMuted }]}>{card.label}</Text>
              <Text style={[styles.metricDelta, { color: c.text }]}>{card.delta} this week</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>Workstreams</Text>
        <View style={styles.streamGrid}>
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.streamCard, { borderColor: c.border, backgroundColor: c.surface }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.92}
              >
                <View style={styles.streamTop}>
                  <View style={[styles.streamIcon, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Icon color={c.text} />
                  </View>
                  <View style={[styles.streamFlag, { backgroundColor: c.accent }]} />
                </View>
                <Text style={[styles.streamTitle, { color: c.text }]}>{item.label}</Text>
                <Text style={[styles.streamSub, { color: c.textMuted }]}>{item.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </MotionScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 108, gap: 12 },
  darkHero: {
    backgroundColor: '#101010',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroKicker: { color: '#d1d5db', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  heroActions: { flexDirection: 'row', gap: 8 },
  iconBtnDark: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: '#2f2f2f',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  unreadText: { fontSize: 9, fontWeight: '800', color: '#111111' },
  heroTitle: { color: '#ffffff', fontSize: 32, fontWeight: '900', lineHeight: 36, letterSpacing: -0.5 },
  heroSub: { color: '#9ca3af', fontSize: 13, marginBottom: 4 },
  heroIdentity: {
    borderWidth: 1,
    borderColor: '#2f2f2f',
    backgroundColor: '#171717',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroIdentityLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  heroIdentityValue: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  primaryCta: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryCtaText: { color: '#111111', fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  illustrationWrap: { borderWidth: 1, padding: 8, borderRadius: 12 },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minHeight: 96,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  metricValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.3 },
  metricLabel: { fontSize: 11 },
  metricDelta: { fontSize: 10, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginTop: 6, letterSpacing: -0.2 },
  streamGrid: { gap: 8 },
  streamCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 106,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  streamTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streamIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamFlag: { width: 12, height: 12, borderRadius: 3 },
  streamTitle: { fontSize: 17, fontWeight: '900', marginTop: 12, letterSpacing: -0.3 },
  streamSub: { fontSize: 12, marginTop: 2 },
});

