// File: screens/PremiumScreen.js
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getStatus, verifyPurchase } from '../services/iap.js';

export default function PremiumScreen() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await getStatus();
      setStatus(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleFakePurchase = async () => {
    setLoading(true);
    try {
      const demoReceipt = 'demo_receipt_token';
      const res = await verifyPurchase(demoReceipt);
      setStatus(res.data);
      Alert.alert('Purchase verified', `Premium: ${res.data.premium}`);
    } catch (err) {
      Alert.alert('Verify failed', err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.text}>Premium: {status ? String(status.premium) : '—'}</Text>

          {status?.expiresAt && (
            <Text style={styles.text}>
              Expires: {new Date(status.expiresAt).toLocaleString()}
            </Text>
          )}

          <TouchableOpacity onPress={handleFakePurchase} style={styles.btn}>
            <Text style={styles.btnText}>Fake Purchase (Dev)</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f9fc',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
  btn: {
    marginTop: 20,
    backgroundColor: '#059669',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
});