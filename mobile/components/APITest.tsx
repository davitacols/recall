import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import axios from 'axios';

const API_URL = 'https://recall-backend-4hok.onrender.com/api';

export default function APITest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState('');

  const testConnection = async () => {
    setTesting(true);
    setResult('Testing...');

    try {
      const response = await axios.get(`${API_URL}/health/`, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      setResult(`API Connected: ${response.data?.status || 'ok'}`);
      Alert.alert('Success', 'API connection working.');
    } catch (error: any) {
      const message = error?.message || 'Connection failed';
      setResult(`Connection Failed: ${message}`);
      Alert.alert('Error', message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Connection Test</Text>
      <Text style={styles.url}>{API_URL}</Text>
      <TouchableOpacity style={[styles.button, testing && styles.buttonDisabled]} onPress={testConnection} disabled={testing}>
        <Text style={styles.buttonText}>{testing ? 'Testing...' : 'Test API Connection'}</Text>
      </TouchableOpacity>
      {result ? <Text style={styles.resultText}>{result}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  url: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 0,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
