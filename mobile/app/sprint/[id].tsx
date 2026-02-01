import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { sprintService } from '../../services/api';

interface Issue {
  id: number;
  key: string;
  title: string;
  status: string;
  priority: string;
  story_points: number;
}

interface Sprint {
  id: number;
  name: string;
  goal: string;
  status: string;
  start_date: string;
  end_date: string;
}

export default function SprintDetailScreen() {
  const { id } = useLocalSearchParams();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSprintData();
  }, [id]);

  const loadSprintData = async () => {
    try {
      const sprintRes = await sprintService.get(Number(id));
      setSprint(sprintRes.data);
      
      const issuesRes = await sprintService.issues(Number(id));
      setIssues(issuesRes.data.results || issuesRes.data);
    } catch (error) {
      console.error('Failed to load sprint:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderIssue = ({ item }: { item: Issue }) => (
    <View style={styles.issueCard}>
      <View style={styles.issueHeader}>
        <Text style={styles.issueKey}>{item.key}</Text>
        <Text style={[styles.status, styles[`status_${item.status}`]]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.issueTitle}>{item.title}</Text>
      <View style={styles.issueFooter}>
        <Text style={[styles.priority, styles[`priority_${item.priority}`]]}>
          {item.priority}
        </Text>
        <Text style={styles.points}>{item.story_points} pts</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!sprint) {
    return (
      <View style={styles.center}>
        <Text>Sprint not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{sprint.name}</Text>
        <Text style={[styles.status, styles[`status_${sprint.status}`]]}>
          {sprint.status}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.goal}>{sprint.goal}</Text>
        <Text style={styles.dates}>
          {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issues ({issues.length})</Text>
        <FlatList
          data={issues}
          renderItem={renderIssue}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    alignSelf: 'flex-start',
  },
  status_active: {
    backgroundColor: '#34C759',
  },
  status_planning: {
    backgroundColor: '#FF9500',
  },
  status_completed: {
    backgroundColor: '#5AC8FA',
  },
  info: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  goal: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  dates: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  issueCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priority: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
  },
  priority_high: {
    backgroundColor: '#FF3B30',
  },
  priority_medium: {
    backgroundColor: '#FF9500',
  },
  priority_low: {
    backgroundColor: '#34C759',
  },
  points: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});
