import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


export default function App() {
return (
<GestureHandlerRootView style={{ flex: 1 }}>
<AuthProvider>
<AppNavigator />
</AuthProvider>
</GestureHandlerRootView>
);
}