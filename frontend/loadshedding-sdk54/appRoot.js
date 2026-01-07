// appRoot.js – real app wiring
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import GestureHandlerRootView from 'react-native-gesture-handler/src/components/GestureHandlerRootView';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';

function AppRoot() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default AppRoot;