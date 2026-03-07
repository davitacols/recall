import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { conversationService } from '../../services/api';

export default function NewConversationScreen() {
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Conversation</Text>
      <Text style={styles.sub}>Capture context, rationale, and next steps.</Text>

      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor="#8ba0b8"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="What’s the discussion about?"
        placeholderTextColor="#8ba0b8"
        value={content}
        onChangeText={setContent}
        multiline
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.half]}
          placeholder="post_type (discussion/question/proposal)"
          placeholderTextColor="#8ba0b8"
          value={postType}
          onChangeText={setPostType}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, styles.half]}
          placeholder="priority (low/medium/high)"
          placeholderTextColor="#8ba0b8"
          value={priority}
          onChangeText={setPriority}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity style={styles.submit} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#111827" /> : <Text style={styles.submitText}>Create Conversation</Text>}
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
  textArea: { minHeight: 150, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, fontSize: 12 },
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
