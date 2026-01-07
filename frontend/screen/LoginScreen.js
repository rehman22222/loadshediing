// File: screens/LoginScreen.js
const [loading, setLoading] = useState(false);


const handleLogin = async () => {
if (!email || !password) return Alert.alert('Validation', 'Email and password are required');
setLoading(true);
try {
await login(email, password);
} catch (err) {
Alert.alert('Login failed', err.response?.data?.message || err.message);
} finally { setLoading(false); }
};


return (
<View style={styles.container}>
<Text style={styles.title}>Welcome back</Text>
<TextInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
<TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={styles.input} />


<TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
<Text style={styles.btnText}>{loading ? 'Logging in...' : 'Login'}</Text>
</TouchableOpacity>


<View style={{ flexDirection:'row', marginTop:16, justifyContent:'center' }}>
<Text>Don't have an account? </Text>
<TouchableOpacity onPress={() => navigation.navigate('Register')}>
<Text style={{ color:'#2563eb' }}>Register</Text>
</TouchableOpacity>
</View>
</View>
);


const styles = StyleSheet.create({
container: { flex:1, justifyContent:'center', padding:20, backgroundColor:'#f7f8fb' },
title: { fontSize:28, fontWeight:'800', marginBottom:20, textAlign:'center' },
input: { backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:10, borderWidth:1, borderColor:'#eee' },
btn: { backgroundColor:'#2563eb', padding:14, borderRadius:10, alignItems:'center' },
btnText: { color:'#fff', fontWeight:'700' }
});