// File: components/OutageCard.js
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function OutageCard({ item }) {
  return (
    <View style={s.card}>
      <Text style={s.area}>{item.area}</Text>
      <Text style={s.time}>{item.startTime} — {item.endTime}</Text>

      {item.zone && <Text style={s.meta}>Zone: {item.zone}</Text>}
      {item.rmu && <Text style={s.meta}>RMU: {item.rmu}</Text>}
      {item.notes && <Text style={s.notes}>{item.notes}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card:{ backgroundColor:'#fff', padding:14, borderRadius:10, marginBottom:12 },
  area:{ fontSize:16, fontWeight:'bold' },
  time:{ marginTop:4, color:'#333' },
  meta:{ marginTop:4, color:'#666' },
  notes:{ marginTop:8, color:'#444' },
});
