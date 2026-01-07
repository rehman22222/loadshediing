// File: screens/ProfileScreen.js
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext.js';
import { getPreferences, updatePreferences } from '../services/auth.js';

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);
  const [prefs, setPrefs] = useState({
    watchAreas: [],
    notifyBy: 'push',
    notifyBeforeMinutes: 30,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    setLoading(true);
    try {
      const res = await getPreferences();
      if (res?.data) setPrefs(res.data);
    } catch (err) {
      console.log('getPreferences error', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updatePreferences(prefs);
      setPrefs(res.data || prefs);
      Alert.alert('Saved', 'Preferences updated.');
    } catch (err) {
      console.log('save prefs error', err?.response?.data || err.message);
      Alert.alert('Save failed', err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={user?.email} editable={false} />

          <Text style={styles.label}>Watch Areas (comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={prefs.watchAreas.join(', ')}
            onChangeText={(v) =>
              setPrefs({
                ...prefs,
                watchAreas: v.split(',').map((s) => s.trim().replace(/,$/, '')),
              })
            }
            placeholder="e.g. Area 1, Area 2"
          />

          <Text style={styles.label}>Notify Minutes Before</Text>
          <TextInput
            style={styles.input}
            value={String(prefs.notifyBeforeMinutes || '')}
            onChangeText={(v) => {
              const n = Number(v);
              setPrefs({
                ...prefs,
                notifyBeforeMinutes: Number.isNaN(n) ? 0 : n,
              });
            }}
            keyboardType="numeric"
            placeholder="30"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {saving ? 'Saving...' : 'Save preferences'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              await logout();
            }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Logout</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7fafc' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  label: { marginTop: 8, fontWeight: '700' },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtn: {
    marginTop: 12,
    backgroundColor: '#dc2626',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
});
