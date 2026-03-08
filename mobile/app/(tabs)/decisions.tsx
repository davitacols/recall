import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { DecisionIcon, PlusIcon } from '../../components/Icons';
import MotionScreen from '../../components/MotionScreen';
import { DashboardIllustration } from '../../components/TechnicalIllustrations';
import { Brand } from '../../constants/brand';
import { decisionService, normalizeList } from '../../services/api';

interface Decision {
  id: number;
  title: string;
  description?: string;
  status?: string;
  impact_level?: string;
  decision_maker_name?: string;
  created_at: string;
  confidence?: number;
  confidence_level?: number;
}

export default function DecisionsScreen() {
  const c = Brand.colors;
  const router = useRouter();
  const [items, setItems] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await decisionService.list();
      setItems(normalizeList<Decision>(res.data));
    } catch (error) {
      console.error('Failed to load decisions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusColor = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
      case 'accepted':
        return c.success;
      case 'proposed':
      case 'under_review':
        return c.warning;
      case 'rejected':
        return c.danger;
      default:
        return c.textMuted;
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
    <MotionScreen delay={40}>
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={[styles.hero, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
        <View style={styles.heroTop}>
          <View style={styles.headerLeft}>
            <DecisionIcon color={c.accentSoft} />
            <Text style={[styles.title, { color: c.text }]}>Decisions</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.accent }]} onPress={() => router.push('/decisions/new')}>
            <PlusIcon color="#ffffff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.sub, { color: c.textMuted }]}>Reasoned decisions with confidence and ownership.</Text>
        <View style={[styles.artWrap, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
          <DashboardIllustration />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.accent} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]} activeOpacity={0.9}>
            <View style={[styles.topRule, { backgroundColor: statusColor(item.status) }]} />
            <View style={styles.row}>
              <Text style={[styles.badge, { color: statusColor(item.status) }]}>{(item.status || 'unknown').toUpperCase()}</Text>
              <Text style={[styles.meta, { color: c.textMuted }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.cardBody, { color: c.textMuted }]} numberOfLines={2}>{item.description || 'No summary provided.'}</Text>
            <View style={styles.row}>
              <Text style={[styles.meta, { color: c.textMuted }]}>{item.decision_maker_name || 'Unknown owner'}</Text>
              <Text style={[styles.confidence, { color: c.text }]}>{Math.round(item.confidence_level || item.confidence || 0)}%</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
    </MotionScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  sub: { fontSize: 13 },
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  artWrap: { borderWidth: 1, padding: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 110 },
  card: {
    borderWidth: 1,
    padding: 12,
    minHeight: 124,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  topRule: { height: 2, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  cardTitle: { fontSize: 16, fontWeight: '900', marginTop: 8, letterSpacing: -0.2 },
  cardBody: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  meta: { fontSize: 11, marginTop: 10 },
  confidence: { fontSize: 16, fontWeight: '900', marginTop: 6 },
});
