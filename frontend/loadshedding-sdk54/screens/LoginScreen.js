// screens/LoginScreen.js
import React, { useContext, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext.js';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handle = async () => {
    if (!email || !password) return Alert.alert('Fields Required');
    try {
      await login({ email, password });
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message || err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>

      <TextInput 
        placeholder="Email" 
        style={styles.input} 
        value={email} 
        onChangeText={setEmail} 
      />

      <TextInput 
        placeholder="Password" 
        secureTextEntry 
        style={styles.input} 
        value={password} 
        onChangeText={setPassword} 
      />

      <TouchableOpacity style={styles.btn} onPress={handle}>
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Create an account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', padding:20 },
  title:{ fontSize:26, fontWeight:'bold', marginBottom:30, textAlign:'center' },
  input:{ borderWidth:1, borderColor:'#ccc', padding:12, borderRadius:8, marginBottom:12 },
  btn:{ backgroundColor:'#2563eb', padding:14, borderRadius:8 },
  btnText:{ color:'#fff', textAlign:'center', fontWeight:'bold' },
  link:{ color:'#2563eb', textAlign:'center', marginTop:16 }
});
