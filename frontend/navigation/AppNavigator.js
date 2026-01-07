// File: navigation/AppNavigator.js
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';


import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OutagesScreen from '../screens/OutagesScreen';
import NearbyScreen from '../screens/NearbyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PremiumScreen from '../screens/PremiumScreen';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();


function MainTabs() {
return (
<Tab.Navigator screenOptions={{ headerShown: true }}>
<Tab.Screen name="Outages" component={OutagesScreen} />
<Tab.Screen name="Nearby" component={NearbyScreen} />
<Tab.Screen name="Premium" component={PremiumScreen} />
<Tab.Screen name="Profile" component={ProfileScreen} />
</Tab.Navigator>
);
}


export default function AppNavigator() {
const { user, loading } = useContext(AuthContext);


if (loading) {
return (
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
<ActivityIndicator size="large" />
</View>
);
}


return (
<NavigationContainer>
<Stack.Navigator screenOptions={{ headerShown: false }}>
{user ? (
<Stack.Screen name="Main" component={MainTabs} />
) : (
<>
<Stack.Screen name="Login" component={LoginScreen} />
<Stack.Screen name="Register" component={RegisterScreen} />
</>
)}
</Stack.Navigator>
</NavigationContainer>
);
}