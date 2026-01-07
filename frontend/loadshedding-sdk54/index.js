// index.js — Must import gesture handler first, then forward to expo-router entry
import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';
import App from './App';

registerRootComponent(App);