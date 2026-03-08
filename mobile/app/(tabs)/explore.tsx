import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { KnowledgeIcon } from '../../components/Icons';
import MotionScreen from '../../components/MotionScreen';
import { DashboardIllustration } from '../../components/TechnicalIllustrations';
import { Brand } from '../../constants/brand';

export default function KnowledgeScreen() {
  const c = Brand.colors;
  return (
    <MotionScreen delay={60}>
    <ScrollView style={[styles.screen, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { borderColor: c.border, backgroundColor: c.surface }]}>
        <View style={styles.header}>
          <KnowledgeIcon color={c.accentSoft} />
          <Text style={[styles.title, { color: c.text }]}>Knowledge</Text>
        </View>
        <Text style={[styles.sub, { color: c.textMuted }]}>Find facts, standards, and reusable context fast.</Text>
        <View style={[styles.illustration, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
          <DashboardIllustration />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.topRule, { backgroundColor: c.accent }]} />
        <Text style={[styles.cardTitle, { color: c.text }]}>Knowledge Search</Text>
        <Text style={[styles.cardBody, { color: c.textMuted }]}>
          This module is wired into the mobile shell and ready for full-text query, filters, and drill-down pages.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Roadmap</Text>
        <Text style={[styles.listItem, { color: c.textMuted }]}>1. Search input with debounce</Text>
        <Text style={[styles.listItem, { color: c.textMuted }]}>2. Unified result cards</Text>
        <Text style={[styles.listItem, { color: c.textMuted }]}>3. Saved filters and recent queries</Text>
      </View>
    </ScrollView>
    </MotionScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 110 },
  hero: { borderWidth: 1, padding: 12, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  sub: { fontSize: 13 },
  illustration: { borderWidth: 1, padding: 8 },
  card: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  topRule: { height: 2, marginBottom: 2 },
  cardTitle: { fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  cardBody: { fontSize: 13, lineHeight: 20 },
  listItem: { fontSize: 13 },
});
