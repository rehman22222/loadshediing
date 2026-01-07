// screens/OutagesScreen.js
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import OutageCard from "../components/OutageCard.js";
import { getTodayOutages } from "../services/outages.js";

export default function OutagesScreen() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const res = await getTodayOutages();

      if (!res?.data) {
        throw new Error("No data received from server");
      }

      setList(res.data);
    } catch (err) {
      console.log("Outages ERR:", err?.response?.data || err.message);
      setError(err?.response?.data?.message || err.message || "Failed to load outages");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={{ color: "red", fontSize: 16 }}>{error}</Text>
      </View>
    );

  if (list.length === 0)
    return (
      <View style={styles.center}>
        <Text>No outages found for today.</Text>
      </View>
    );

  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => <OutageCard item={item} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load(true);
          }}
        />
      }
      contentContainerStyle={{ padding: 16 }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});