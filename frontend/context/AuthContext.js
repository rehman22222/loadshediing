// File: context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/auth';
import api, { setLogoutHandler } from '../services/apiClient';


export const AuthContext = createContext();


export const AuthProvider = ({ children }) => {
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);


const loadUser = async () => {
try {
const token = await AsyncStorage.getItem('token');
if (!token) {
setUser(null);
return;
}
const res = await authService.me();
setUser(res.data);
} catch (err) {
console.log('loadUser error', err.message);
setUser(null);
} finally {
setLoading(false);
}
};


useEffect(() => {
// register global 401 handler
setLogoutHandler(async () => {
await logout();
});
loadUser();
}, []);


const login = async (email, password) => {
const res = await authService.login({ email, password });
if (res.data?.token) {
await AsyncStorage.setItem('token', res.data.token);
setUser(res.data.user);
}
}
};