import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { decisionService } from '../../services/api';

interface Decision {
  id: number;
  title: string;
  description: string;
  status: string;
  impact_level: string;
  confidence_level: number;
}

export default function DecisionsScreen() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDecisions();
  }, []);

  const loadDecisions = async () => {
    try {
      const response = await decisionService.list();
      setDecisions(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load decisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDecision = ({ item }: { item: Decision }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.status, styles[`status_${item.status}`]]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.impact}>Impact: {item.impact_level}</Text>
        <Text style={styles.confidence}>Confidence: {item.confidence_level}%</Text>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={decisions}
        renderItem={renderDecision}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#000',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 8,
  },
  status_proposed: {
    backgroundColor: '#FF9500',
  },
  status_approved: {
    backgroundColor: '#34C759',
  },
  status_implemented: {
    backgroundColor: '#5AC8FA',
  },
  status_rejected: {
    backgroundColor: '#FF3B30',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impact: {
    fontSize: 12,
    color: '#999',
  },
  confidence: {
    fontSize: 12,
    color: '#999',
  },
});
