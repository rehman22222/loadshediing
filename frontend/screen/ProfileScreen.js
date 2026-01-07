// File: screens/ProfileScreen.js
const [loading, setLoading] = useState(false);


useEffect(() => {
fetchPrefs();
}, []);


const fetchPrefs = async () => {
try {
const res = await getPreferences();
setPrefs(res.data);
} catch (err) {
// ignore
}
};


const handleSave = async () => {
setLoading(true);
try {
const res = await updatePreferences(prefs);
setPrefs(res.data);
Alert.alert('Saved', 'Preferences updated');
} catch (err) {
Alert.alert('Error', err.response?.data?.message || err.message);
} finally { setLoading(false); }
};


return (
<View style={styles.container}>
<Text style={styles.title}>Profile</Text>
{user && (
<View style={{ marginBottom:20 }}>
<Text style={{ fontWeight:'700' }}>{user.name}</Text>
<Text style={{ color:'#555' }}>{user.email}</Text>
</View>
)}


<Text style={{ fontWeight:'700', marginBottom:6 }}>Watch areas (comma separated)</Text>
<TextInput value={(prefs.watchAreas || []).join(',')} onChangeText={(t) => setPrefs({ ...prefs, watchAreas: t.split(',').map(s => s.trim()).filter(Boolean) })} style={styles.input} />


<Text style={{ fontWeight:'700', marginTop:10 }}>Notify by</Text>
<TextInput value={prefs.notifyBy} onChangeText={(v) => setPrefs({ ...prefs, notifyBy: v })} style={styles.input} />


<Text style={{ fontWeight:'700', marginTop:10 }}>Notify before (minutes)</Text>
<TextInput value={String(prefs.notifyBeforeMinutes)} onChangeText={(v) => setPrefs({ ...prefs, notifyBeforeMinutes: Number(v) || 0 })} keyboardType="numeric" style={styles.input} />


<TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
<Text style={{ color:'#fff', fontWeight:'700' }}>{loading ? 'Saving...' : 'Save preferences'}</Text>
</TouchableOpacity>


<TouchableOpacity style={styles.logoutBtn} onPress={async () => { await logout(); }}>
<Text style={{ color:'#fff', fontWeight:'700' }}>Logout</Text>
</TouchableOpacity>
</View>
);


const styles = StyleSheet.create({
container: { flex:1, padding:16, backgroundColor:'#f7fafc' },
title: { fontSize:22, fontWeight:'800', marginBottom:14 },
input: { backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:10, borderWidth:1, borderColor:'#eee' },
saveBtn: { marginTop:10, backgroundColor:'#2563eb', padding:12, borderRadius:10, alignItems:'center' },
logoutBtn: { marginTop:12, backgroundColor:'#ef4444', padding:12, borderRadius:10, alignItems:'center' }
});