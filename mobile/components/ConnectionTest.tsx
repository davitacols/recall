import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ConnectionTest() {
  const [result, setResult] = useState('');
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setResult('Testing...');
    
    try {
      const response = await fetch('https://recall-backend-4hok.onrender.com/api/health/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(`✅ Connected!\nStatus: ${data.status}`);
      } else {
        setResult(`❌ HTTP ${response.status}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connection Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={testConnection}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>
      
      {result ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 4,
    minWidth: 120,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  resultText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
});