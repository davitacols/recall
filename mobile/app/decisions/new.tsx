import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashboardIllustration } from '../../components/TechnicalIllustrations';
import { Brand } from '../../constants/brand';
import { decisionService } from '../../services/api';

export default function NewDecisionScreen() {
  const c = Brand.colors;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rationale, setRationale] = useState('');
  const [impactLevel, setImpactLevel] = useState('medium');

  const submit = async () => {
    if (title.trim().length < 5) {
      Alert.alert('Validation', 'Title must be at least 5 characters.');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Validation', 'Description must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await decisionService.create({
        title: title.trim(),
        description: description.trim(),
        rationale: rationale.trim(),
        impact_level: impactLevel,
      });
      router.replace('/(tabs)/decisions');
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Unable to create decision';
      Alert.alert('Create failed', String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: c.text }]}>New Decision</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>Document the choice and why it was made.</Text>
      <View style={[styles.illustration, { borderColor: c.border, backgroundColor: c.surface }]}>
        <DashboardIllustration />
      </View>

      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
        placeholder="Decision title"
        placeholderTextColor={c.textMuted}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
        placeholder="Decision description"
        placeholderTextColor={c.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={[styles.input, styles.textAreaSmall, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
        placeholder="Rationale"
        placeholderTextColor={c.textMuted}
        value={rationale}
        onChangeText={setRationale}
        multiline
      />
      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
        placeholder="impact_level (low/medium/high)"
        placeholderTextColor={c.textMuted}
        value={impactLevel}
        onChangeText={setImpactLevel}
        autoCapitalize="none"
      />

      <TouchableOpacity style={[styles.submit, { backgroundColor: c.accent }]} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#111827" /> : <Text style={styles.submitText}>Create Decision</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 10 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { marginBottom: 8 },
  illustration: { borderWidth: 1, padding: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textArea: { minHeight: 130, textAlignVertical: 'top' },
  textAreaSmall: { minHeight: 90, textAlignVertical: 'top' },
  submit: {
    marginTop: 8,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  submitText: { color: '#111827', fontWeight: '700' },
});
