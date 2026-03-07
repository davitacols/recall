import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { normalizeList, sprintService } from '../../services/api';

interface Issue {
  id: number;
  key?: string;
  title: string;
  status?: string;
  priority?: string;
  story_points?: number;
}

interface Sprint {
  id: number;
  name: string;
  goal?: string;
  status?: string;
  start_date: string;
  end_date: string;
}

export default function SprintDetailScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const sprintRes = await sprintService.get(Number(id));
        setSprint(sprintRes.data);

        try {
          const issuesRes = await sprintService.issues(Number(id));
          setIssues(normalizeList<Issue>(issuesRes.data));
        } catch {
          setIssues([]);
        }
      } catch (error) {
        console.error('Failed to load sprint:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f0b36d" />
      </View>
    );
  }

  if (!sprint) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sprint not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.status}>{(sprint.status || 'unknown').toUpperCase()}</Text>
        <Text style={styles.title}>{sprint.name}</Text>
        <Text style={styles.meta}>
          {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
        </Text>
        <Text style={styles.goal}>{sprint.goal || 'No sprint goal provided.'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Issues ({issues.length})</Text>
      <FlatList
        data={issues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.issueCard}>
            <View style={styles.row}>
              <Text style={styles.issueKey}>{item.key || `ISSUE-${item.id}`}</Text>
              <Text style={styles.issueMeta}>{(item.status || 'unknown').toUpperCase()}</Text>
            </View>
            <Text style={styles.issueTitle}>{item.title}</Text>
            <Text style={styles.issueMeta}>
              {(item.priority || 'medium').toUpperCase()} • {item.story_points || 0} pts
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f141d' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f141d' },
  header: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#1e293b', gap: 6 },
  status: { color: '#f6c287', fontSize: 11, fontWeight: '700' },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  meta: { color: '#90a0b5', fontSize: 12 },
  goal: { color: '#c6d2e3', fontSize: 14, marginTop: 4 },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', paddingHorizontal: 18, paddingTop: 14 },
  list: { padding: 18, gap: 10 },
  issueCard: {
    backgroundColor: '#121a27',
    borderColor: '#263246',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 5,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  issueKey: { color: '#f6c287', fontSize: 12, fontWeight: '700' },
  issueTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  issueMeta: { color: '#90a0b5', fontSize: 11 },
});
