// File: components/OutageCard.js
import React from 'react';
import { View, Text } from 'react-native';


export default function OutageCard({ item }) {
return (
<View style={{ padding:12, borderRadius:10, backgroundColor:'#fff', marginBottom:10, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:6 }}>
<Text style={{ fontSize:16, fontWeight:'700' }}>{item.area}</Text>
<Text style={{ marginTop:4 }}>{item.date} · {item.startTime} — {item.endTime}</Text>
{item.zone ? <Text style={{ marginTop:6, color:'#444' }}>Zone: {item.zone}</Text> : null}
{item.rmu ? <Text style={{ color:'#444' }}>RMU: {item.rmu}</Text> : null}
{item.distance !== undefined ? <Text style={{ marginTop:6 }}>Distance: {item.distance.toFixed(2)} km</Text> : null}
</View>
);
}