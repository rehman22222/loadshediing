// File: screens/PremiumScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { getStatus, verifyPurchase } from '../services/iap';


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
// placeholder: in production wire in-app purchase SDK and send receipt here
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
<View style={{ flex:1, padding:16, backgroundColor:'#f7f9fc' }}>
<Text style={{ fontSize:20, fontWeight:'800', marginBottom:12 }}>Premium</Text>
{loading ? <ActivityIndicator /> : (
<>
<Text>Premium: {status ? String(status.premium) : '—'}</Text>
{status?.expiresAt ? <Text>Expires: {new Date(status.expiresAt).toLocaleString()}</Text> : null}


<TouchableOpacity onPress={handleFakePurchase} style={{ marginTop:20, backgroundColor:'#059669', padding:12, borderRadius:8, alignItems:'center' }}>
<Text style={{ color:'#fff', fontWeight:'700' }}>Simulate Purchase / Verify receipt</Text>
</TouchableOpacity>


<TouchableOpacity onPress={fetchStatus} style={{ marginTop:12, padding:10 }}>
<Text style={{ color:'#2563eb' }}>Refresh status</Text>
</TouchableOpacity>
</>
)}
</View>
);
}