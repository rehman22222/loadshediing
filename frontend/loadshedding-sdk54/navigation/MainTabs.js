//MainTabs.js
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import NearbyScreen from '../screens/NearbyScreen.js';
import OutagesScreen from '../screens/OutagesScreen.js';
import PremiumScreen from '../screens/PremiumScreen.js';
import ProfileScreen from '../screens/ProfileScreen.js';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Outages" component={OutagesScreen} />
      <Tab.Screen name="Nearby" component={NearbyScreen} />
      <Tab.Screen name="Premium" component={PremiumScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
