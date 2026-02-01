import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { decisionService } from '../../services/api';
import { DecisionIcon, PlusIcon } from '../../components/Icons';

interface Decision {
  id: number;
  title: string;
  description: string;
  status: string;
  impact_level: string;
  decision_maker_name: string;
  created_at: string;
  confidence_level: number;
}

export default function DecisionsScreen() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDecisions = async () => {
    try {
      const response = await decisionService.list();
      setDecisions(response.data.results || []);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchDecisions();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '#059669';
      case 'implemented': return '#0891b2';
      case 'rejected': return '#dc2626';
      case 'under_review': return '#ca8a04';
      default: return '#6b7280';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'high': return '#dc2626';
      case 'medium': return '#ea580c';
      case 'low': return '#059669';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderDecision = ({ item }: { item: Decision }) => (
    <TouchableOpacity style={styles.decisionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
          <View>
            <Text style={styles.decisionMaker}>{item.decision_maker_name}</Text>
            <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        <View style={[styles.impactBadge, { backgroundColor: getImpactColor(item.impact_level) }]}>
          <Text style={styles.impactText}>{item.impact_level?.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status?.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        {item.confidence_level && (
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceText}>
              {Math.round(item.confidence_level)}% confidence
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading decisions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <DecisionIcon size={24} color="#ffffff" />
          <Text style={styles.headerTitle}>Decisions</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <PlusIcon size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={decisions}
        renderItem={renderDecision}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#ffffff']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginLeft: 12,
  },
  addButton: {
    width: 36,
    height: 36,
    backgroundColor: '#374151',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
  },
  decisionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  decisionMaker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  impactText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceContainer: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
});