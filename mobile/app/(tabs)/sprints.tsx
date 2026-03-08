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

import { SprintIcon } from '../../components/Icons';
import MotionScreen from '../../components/MotionScreen';
import { DashboardIllustration } from '../../components/TechnicalIllustrations';
import { Brand } from '../../constants/brand';
import { normalizeList, sprintService } from '../../services/api';

interface Sprint {
  id: number;
  name: string;
  status?: string;
  start_date: string;
  end_date: string;
  goal?: string;
}

export default function SprintsScreen() {
  const c = Brand.colors;
  const router = useRouter();
  const [items, setItems] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await sprintService.list();
      setItems(normalizeList<Sprint>(res.data));
    } catch (error) {
      console.error('Failed to load sprints:', error);
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
      case 'active':
        return c.success;
      case 'planning':
      case 'planned':
        return c.warning;
      case 'completed':
        return c.accent;
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
    <MotionScreen delay={50}>
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={[styles.hero, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
        <View style={styles.headerLeft}>
          <SprintIcon color={c.accentSoft} />
          <Text style={[styles.title, { color: c.text }]}>Sprints</Text>
        </View>
        <Text style={[styles.sub, { color: c.textMuted }]}>Plan windows, monitor throughput, and ship cleanly.</Text>
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
          <TouchableOpacity
            style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}
            onPress={() => router.push(`/sprint/${item.id}`)}
            activeOpacity={0.9}
          >
            <View style={[styles.topRule, { backgroundColor: statusColor(item.status) }]} />
            <View style={styles.row}>
              <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.badge, { color: statusColor(item.status) }]}>{(item.status || 'unknown').toUpperCase()}</Text>
            </View>
            <Text style={[styles.cardBody, { color: c.textMuted }]} numberOfLines={2}>{item.goal || 'No sprint goal set.'}</Text>
            <Text style={[styles.meta, { color: c.textMuted }]}>
              {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
            </Text>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  sub: { fontSize: 13 },
  artWrap: { borderWidth: 1, padding: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 110 },
  card: {
    borderWidth: 1,
    padding: 12,
    minHeight: 114,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  topRule: { height: 2, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '900', flex: 1, letterSpacing: -0.2 },
  badge: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  cardBody: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  meta: { fontSize: 11, marginTop: 9 },
});
