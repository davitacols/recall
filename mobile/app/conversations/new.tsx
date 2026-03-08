import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashboardIllustration } from '../../components/TechnicalIllustrations';
import { Brand } from '../../constants/brand';
import { conversationService } from '../../services/api';

export default function NewConversationScreen() {
  const c = Brand.colors;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('discussion');
  const [priority, setPriority] = useState('medium');

  const submit = async () => {
    if (title.trim().length < 5) {
      Alert.alert('Validation', 'Title must be at least 5 characters.');
      return;
    }
    if (content.trim().length < 10) {
      Alert.alert('Validation', 'Content must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await conversationService.create({
        title: title.trim(),
        content: content.trim(),
        post_type: postType,
        priority,
      });
      router.replace('/(tabs)/conversations');
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Unable to create conversation';
      Alert.alert('Create failed', String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: c.text }]}>New Conversation</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>Capture context, rationale, and next steps.</Text>
      <View style={[styles.illustration, { borderColor: c.border, backgroundColor: c.surface }]}>
        <DashboardIllustration />
      </View>

      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
        placeholder="Title"
        placeholderTextColor={c.textMuted}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
        placeholder="What's the discussion about?"
        placeholderTextColor={c.textMuted}
        value={content}
        onChangeText={setContent}
        multiline
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.half, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
          placeholder="post_type (discussion/question/proposal)"
          placeholderTextColor={c.textMuted}
          value={postType}
          onChangeText={setPostType}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, styles.half, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
          placeholder="priority (low/medium/high)"
          placeholderTextColor={c.textMuted}
          value={priority}
          onChangeText={setPriority}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity style={[styles.submit, { backgroundColor: c.accent }]} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#111827" /> : <Text style={styles.submitText}>Create Conversation</Text>}
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
  textArea: { minHeight: 150, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, fontSize: 12 },
  submit: {
    marginTop: 8,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  submitText: { color: '#111827', fontWeight: '700' },
});
