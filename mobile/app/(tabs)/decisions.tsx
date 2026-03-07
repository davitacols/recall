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
import { decisionService, normalizeList } from '../../services/api';

interface Decision {
  id: number;
  title: string;
  description?: string;
  status?: string;
  impact_level?: string;
  decision_maker_name?: string;
  created_at: string;
  confidence_level?: number;
}

export default function DecisionsScreen() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDecisions = async () => {
    try {
      const response = await decisionService.list();
      setDecisions(normalizeList<Decision>(response.data));
    } catch (error) {
      console.error('Error fetching decisions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const statusColor = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
      case 'accepted':
        return '#0ea56b';
      case 'rejected':
        return '#dc2626';
      case 'proposed':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const renderItem = ({ item }: { item: Decision }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={[styles.badge, { color: statusColor(item.status) }]}>
          {(item.status || 'unknown').toUpperCase()}
        </Text>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description || 'No summary yet.'}</Text>
      <View style={styles.row}>
        <Text style={styles.meta}>{item.decision_maker_name || 'Unknown owner'}</Text>
        <Text style={styles.meta}>
          {Math.round(item.confidence_level || 0)}% confidence
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#f0b36d" />
        <Text style={styles.loaderText}>Loading decisions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <DecisionIcon color="#f6c287" />
          <Text style={styles.headerTitle}>Decisions</Text>
        </View>
        <TouchableOpacity style={styles.plusBtn} onPress={() => router.push('/decisions/new')}>
          <PlusIcon color="#0f141d" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={decisions}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDecisions();
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0b36d',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  badge: { fontSize: 11, fontWeight: '700' },
  time: { color: '#90a0b5', fontSize: 11 },
  title: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  description: { color: '#c6d2e3', fontSize: 13, lineHeight: 18 },
  meta: { color: '#90a0b5', fontSize: 12 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f141d' },
  loaderText: { color: '#dbe5f3', marginTop: 10 },
});
