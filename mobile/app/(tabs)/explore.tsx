import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { KnowledgeIcon } from '../../components/Icons';

export default function KnowledgeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <KnowledgeIcon color="#f6c287" />
        <Text style={styles.title}>Knowledge</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mobile knowledge search</Text>
        <Text style={styles.cardBody}>
          This is wired into the unified Knoledgr mobile shell. Next step is adding full-text query,
          filters, and detail drill-down for knowledge assets.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Planned in next pass</Text>
        <Text style={styles.listItem}>1. Search input + debounce query</Text>
        <Text style={styles.listItem}>2. Result types (conversation, decision, document)</Text>
        <Text style={styles.listItem}>3. Save and reuse filters</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f141d' },
  content: { padding: 18, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '700' },
  card: {
    backgroundColor: '#121a27',
    borderColor: '#263246',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  cardBody: { color: '#c6d2e3', fontSize: 13, lineHeight: 20 },
  listItem: { color: '#9db0c8', fontSize: 13 },
});
