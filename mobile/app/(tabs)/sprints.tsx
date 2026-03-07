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
  const router = useRouter();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSprints = async () => {
    try {
      const response = await sprintService.list();
      setSprints(normalizeList<Sprint>(response.data));
    } catch (error) {
      console.error('Failed to load sprints:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSprints();
  }, []);

  const statusColor = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return '#0ea56b';
      case 'planning':
        return '#f59e0b';
      case 'completed':
        return '#3b82f6';
      default:
        return '#64748b';
    }
  };

  const renderItem = ({ item }: { item: Sprint }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/sprint/${item.id}`)}>
      <View style={styles.row}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={[styles.status, { color: statusColor(item.status) }]}>
          {(item.status || 'unknown').toUpperCase()}
        </Text>
      </View>
      <Text style={styles.goal} numberOfLines={2}>{item.goal || 'No sprint goal provided.'}</Text>
      <Text style={styles.date}>
        {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#f0b36d" />
        <Text style={styles.loaderText}>Loading sprints...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SprintIcon color="#f6c287" />
          <Text style={styles.headerTitle}>Sprints</Text>
        </View>
      </View>
      <FlatList
        data={sprints}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSprints();
            }}
            tintColor="#f0b36d"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f141d' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#121a27',
    borderColor: '#263246',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#f8fafc', fontSize: 16, fontWeight: '700', flex: 1, paddingRight: 8 },
  status: { fontSize: 11, fontWeight: '700' },
  goal: { color: '#c6d2e3', fontSize: 13, lineHeight: 18 },
  date: { color: '#90a0b5', fontSize: 12 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f141d' },
  loaderText: { color: '#dbe5f3', marginTop: 10 },
});
