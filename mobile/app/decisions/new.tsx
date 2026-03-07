import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { decisionService } from '../../services/api';

export default function NewDecisionScreen() {
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Decision</Text>
      <Text style={styles.sub}>Document the choice and why it was made.</Text>

      <TextInput
        style={styles.input}
        placeholder="Decision title"
        placeholderTextColor="#8ba0b8"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Decision description"
        placeholderTextColor="#8ba0b8"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={[styles.input, styles.textAreaSmall]}
        placeholder="Rationale"
        placeholderTextColor="#8ba0b8"
        value={rationale}
        onChangeText={setRationale}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="impact_level (low/medium/high)"
        placeholderTextColor="#8ba0b8"
        value={impactLevel}
        onChangeText={setImpactLevel}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.submit} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#111827" /> : <Text style={styles.submitText}>Create Decision</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f141d' },
  content: { padding: 18, gap: 10 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  sub: { color: '#9db0c8', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#273449',
    backgroundColor: '#121a27',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
  },
  textArea: { minHeight: 130, textAlignVertical: 'top' },
  textAreaSmall: { minHeight: 90, textAlignVertical: 'top' },
  submit: {
    marginTop: 8,
    backgroundColor: '#f0b36d',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  submitText: { color: '#111827', fontWeight: '700' },
});
