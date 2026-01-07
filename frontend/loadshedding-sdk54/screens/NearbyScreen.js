// screens/NearbyScreen.js
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, View } from 'react-native';
import OutageCard from '../components/OutageCard.js';
import { getNearbyOutages } from '../services/outages.js';

export default function NearbyScreen() {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);

  const loadNearby = async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission Required');

      const loc = await Location.getCurrentPositionAsync({});
      const res = await getNearbyOutages(loc.coords.latitude, loc.coords.longitude);

      setList(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Button title="Find Nearby Outages" onPress={loadNearby} />

      {loading ? <ActivityIndicator size="large" style={{ marginTop:20 }} /> : (
        <FlatList
          data={list}
          keyExtractor={(i) => i._id}
          renderItem={({ item }) => <OutageCard item={item} />}
        />
      )}
    </View>
  );
}
