import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import CompanyScreen from '../screens/CompanyScreen';
import BookingScreen from '../screens/BookingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import BookingsScreen2 from '../screens/BookingScreen2';
import ProfileScreen from '../screens/ProfileScreen';
import AddCompanyScreen from '../screens/AddCompanyScreen';
import AdminScreen from '../screens/AdminScreen';
import AdminVillesScreen from '../screens/AdminVillesScreen';
import AdminCategorie from '../screens/AdminCategorie';
import AdminUserScreen from '../screens/AdminUserScreen';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack pour l'application principale (quand connecté)
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Company" component={CompanyScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="AddCompany" component={AddCompanyScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return(
    <Stack.Navigator screenOptions={{ headerShown: false}}>
      <Stack.Screen name="AdminDashbord" component={AdminScreen} />
      <Stack.Screen name="AdminVilles" component={AdminVillesScreen} />
      <Stack.Screen name="AdminCategorie" component={AdminCategorie} />
      <Stack.Screen name="AdminUser" component={AdminUserScreen} />

    </Stack.Navigator>
  );
}

// Tabs pour l'application principale
function MainTabs() {
   const { user } = useAuth();
  return (
     <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Accueil') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Réservations') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Favoris') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007BFF',
        tabBarInactiveTintColor: '#95a5a6',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
          height: 50,
          paddingBottom: 0,
          paddingTop: 8,
           position: 'absolute', // ← Permet de coller en bas
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Accueil" component={HomeStack} />
      <Tab.Screen name="Réservations" component={BookingsScreen2} />
      <Tab.Screen name="Favoris" component={FavoritesScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
      <Tab.Screen name="Admin" component={AdminStack} />

    </Tab.Navigator>
    </SafeAreaView>
  );
}

// Stack pour l'authentification (quand déconnecté)
function AuthStack() {   // ← CE COMPOSANT DOIT ÊTRE DÉFINI ICI
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Navigation principale
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Écran de chargement
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}