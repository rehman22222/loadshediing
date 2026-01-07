// context/AuthContext.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useEffect, useState } from "react";
import * as auth from "../services/auth.js"; // <-- THIS IS CORRECT

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await auth.me();     // <-- MUST USE `auth` (not authService)
      setUser(res.data);

    } catch (err) {
      console.log("loadUser error", err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const login = async (payload) => {
    const res = await auth.login(payload);
    if (res.data?.token) {
      await AsyncStorage.setItem("token", res.data.token);
      setUser(res.data.user);
    }
    return res;
  };
  

  const register = async (payload) => {
    const res = await auth.register(payload);
    if (res.data?.token) {
      await AsyncStorage.setItem("token", res.data.token);
      setUser(res.data.user);
    }
    return res;
  };
  

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};